/**
 * Antigravity Load Balancer — Cloudflare Worker
 *
 * Intelligent multi-cloud load balancer for Antigravity proxy instances.
 * Routes Anthropic-compatible API requests across Fly.io, Koyeb, and Railway
 * backends with health-aware routing, quota tracking, failover, and sticky
 * model-to-node affinity.
 *
 * State is persisted in a KV namespace (LB_STATE).
 */

// ---------------------------------------------------------------------------
// Node definitions
// ---------------------------------------------------------------------------

const NODES = [
  // Node 1 is WSL2-local only — excluded from cloud LB routing but kept for
  // reference and /lb/status reporting when health data is available.
  {
    id: 'node1-local',
    url: 'http://127.0.0.1:8090',
    label: 'WSL2 Local (yagami8095)',
    routable: false, // not reachable from Cloudflare edge
  },
  {
    id: 'node2-koyeb',
    url: 'https://yedan-antigravity-n2-antigravity-proxy.koyeb.app',
    label: 'Koyeb (yedanyagamiai)',
    routable: true,
  },
  {
    id: 'node3-render',
    url: 'https://antigravity-node3.onrender.com',
    label: 'Render (yedankikuchi)',
    routable: true,
  },
  {
    id: 'node4-zeabur',
    url: 'https://antigravity-node4.zeabur.app',
    label: 'Zeabur (yedanapi)',
    routable: true,
  },
];

const ROUTABLE_NODES = NODES.filter((n) => n.routable);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KV_HEALTH_KEY = 'health_state';
const KV_RR_KEY = 'round_robin_index';
const HEALTH_TTL_MS = 6 * 60 * 1000; // health data stale after 6 min
const COOLDOWN_MS = 5 * 60 * 1000;   // 429 cooldown period
const HEALTH_TIMEOUT_MS = 8000;       // timeout for health probe
const REQUEST_TIMEOUT_MS = 120000;    // timeout for proxied requests

// API paths that should be proxied transparently
const API_PATHS = ['/v1/messages', '/v1/complete'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a JSON Response. */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Get current epoch ms. */
function now() {
  return Date.now();
}

/**
 * Load persisted health state from KV.
 * Returns a map of nodeId -> { healthy, lastCheck, quotas, cooldownUntil }.
 */
async function loadHealthState(kv) {
  try {
    const raw = await kv.get(KV_HEALTH_KEY, 'json');
    if (raw && typeof raw === 'object') return raw;
  } catch (_) {
    // corrupted or missing — start fresh
  }
  return {};
}

/** Persist health state to KV. */
async function saveHealthState(kv, state) {
  await kv.put(KV_HEALTH_KEY, JSON.stringify(state), {
    expirationTtl: 600, // auto-expire after 10 min as safety net
  });
}

/** Load round-robin index from KV. */
async function loadRRIndex(kv) {
  const val = await kv.get(KV_RR_KEY);
  return val !== null ? parseInt(val, 10) : 0;
}

/** Save round-robin index to KV. */
async function saveRRIndex(kv, idx) {
  await kv.put(KV_RR_KEY, String(idx));
}

/**
 * Probe a single node's /health endpoint.
 * Returns { healthy, quotas, latencyMs } or { healthy: false }.
 */
async function probeNode(node) {
  const start = now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    const resp = await fetch(`${node.url}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'AntigravityLB/1.0' },
    });

    clearTimeout(timer);
    const latencyMs = now() - start;

    if (!resp.ok) {
      return { healthy: false, latencyMs, statusCode: resp.status };
    }

    let body = {};
    try {
      body = await resp.json();
    } catch (_) {
      // health endpoint returned non-JSON — treat as healthy but no quota info
    }

    // Extract quota information from health response.
    // Expected shape: { quotas: { claude: { remaining: N }, gemini: { remaining: N }, ... } }
    const quotas = body.quotas || body.quota || {};

    return { healthy: true, quotas, latencyMs };
  } catch (err) {
    return { healthy: false, latencyMs: now() - start, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Routing logic
// ---------------------------------------------------------------------------

/**
 * Determine which model family a request targets (for sticky routing).
 * Reads the `model` field from the request body.
 */
function detectModelFamily(body) {
  if (!body || !body.model) return null;
  const model = body.model.toLowerCase();
  if (model.includes('claude')) return 'claude';
  if (model.includes('gemini')) return 'gemini';
  if (model.includes('gpt')) return 'gpt';
  if (model.includes('llama')) return 'llama';
  if (model.includes('mistral')) return 'mistral';
  if (model.includes('deepseek')) return 'deepseek';
  return null;
}

/**
 * Score a node for routing priority.
 * Higher score = more preferred.
 */
function scoreNode(nodeId, healthEntry, modelFamily) {
  let score = 0;

  if (!healthEntry || !healthEntry.healthy) return -Infinity;

  // Penalise nodes in cooldown
  if (healthEntry.cooldownUntil && now() < healthEntry.cooldownUntil) {
    return -Infinity;
  }

  // Penalise stale health data
  if (healthEntry.lastCheck && now() - healthEntry.lastCheck > HEALTH_TTL_MS) {
    score -= 50;
  }

  // Prefer nodes with more remaining quota for the target model family
  const quotas = healthEntry.quotas || {};
  if (modelFamily && quotas[modelFamily]) {
    const remaining = typeof quotas[modelFamily] === 'object'
      ? (quotas[modelFamily].remaining ?? quotas[modelFamily].rem ?? 0)
      : (typeof quotas[modelFamily] === 'number' ? quotas[modelFamily] : 0);
    score += remaining;
  } else {
    // No model-specific quota info — use total remaining if available
    const total = quotas.total?.remaining ?? quotas.remaining ?? 0;
    score += total;
  }

  // Small latency bonus (lower latency = higher bonus, capped)
  if (healthEntry.latencyMs) {
    score += Math.max(0, 100 - healthEntry.latencyMs / 10);
  }

  return score;
}

/**
 * Select an ordered list of nodes to try (best first).
 * Combines quota-aware scoring with round-robin tiebreaking.
 */
function rankNodes(healthState, modelFamily, rrIndex) {
  const scored = ROUTABLE_NODES.map((node, idx) => {
    const entry = healthState[node.id] || {};
    return {
      node,
      score: scoreNode(node.id, entry, modelFamily),
      rrDist: (idx - rrIndex + ROUTABLE_NODES.length) % ROUTABLE_NODES.length,
    };
  });

  // Sort: highest score first, then round-robin distance as tiebreaker
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.rrDist - b.rrDist;
  });

  // Filter out completely dead nodes (score -Infinity) but keep them at the
  // tail as last-resort fallback
  const alive = scored.filter((s) => s.score > -Infinity);
  const dead = scored.filter((s) => s.score <= -Infinity);

  return [...alive, ...dead].map((s) => s.node);
}

// ---------------------------------------------------------------------------
// Request proxying
// ---------------------------------------------------------------------------

/**
 * Forward a request to a backend node.
 * Returns the Response or throws on network error.
 */
async function proxyRequest(node, request, bodyBytes) {
  const url = new URL(request.url);
  const targetUrl = `${node.url}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  // Remove Cloudflare / LB-specific headers to avoid confusion
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  headers.set('X-Forwarded-By', 'AntigravityLB');
  headers.set('X-LB-Node', node.id);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: bodyBytes,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return resp;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!env.LB_AUTH_TOKEN) {
    // If no token configured, deny all — fail closed
    return false;
  }
  // Constant-time-ish comparison (good enough for a Worker)
  if (token.length !== env.LB_AUTH_TOKEN.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ env.LB_AUTH_TOKEN.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** GET /lb/status — monitoring endpoint (auth required). */
async function handleStatus(env) {
  const healthState = await loadHealthState(env.LB_STATE);
  const rrIndex = await loadRRIndex(env.LB_STATE);

  const nodes = NODES.map((node) => {
    const entry = healthState[node.id] || {};
    const inCooldown = entry.cooldownUntil ? now() < entry.cooldownUntil : false;
    const stale = entry.lastCheck ? now() - entry.lastCheck > HEALTH_TTL_MS : true;

    return {
      id: node.id,
      label: node.label,
      url: node.url,
      routable: node.routable,
      healthy: entry.healthy ?? null,
      inCooldown,
      cooldownUntil: entry.cooldownUntil ?? null,
      lastCheck: entry.lastCheck ? new Date(entry.lastCheck).toISOString() : null,
      stale,
      latencyMs: entry.latencyMs ?? null,
      quotas: entry.quotas ?? {},
      lastError: entry.error ?? null,
    };
  });

  return jsonResponse({
    service: 'antigravity-lb',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    roundRobinIndex: rrIndex,
    nodes,
  });
}

/** Handle proxied API requests with failover. */
async function handleApiRequest(request, env) {
  // Read body once (will be forwarded to backend)
  let bodyBytes = null;
  let parsedBody = null;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    bodyBytes = await request.arrayBuffer();
    // Try to parse JSON to extract model for sticky routing
    try {
      parsedBody = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch (_) {
      // Non-JSON body — that's fine, just forward as-is
    }
  }

  const modelFamily = detectModelFamily(parsedBody);
  const healthState = await loadHealthState(env.LB_STATE);
  const rrIndex = await loadRRIndex(env.LB_STATE);
  const rankedNodes = rankNodes(healthState, modelFamily, rrIndex);

  if (rankedNodes.length === 0) {
    return jsonResponse({ error: 'No backend nodes available' }, 503);
  }

  const errors = [];

  for (const node of rankedNodes) {
    try {
      const resp = await proxyRequest(node, request, bodyBytes);

      // Handle 429 — mark cooldown and try next
      if (resp.status === 429) {
        healthState[node.id] = {
          ...(healthState[node.id] || {}),
          cooldownUntil: now() + COOLDOWN_MS,
        };
        await saveHealthState(env.LB_STATE, healthState);
        errors.push({ node: node.id, status: 429, msg: 'Rate limited — cooldown applied' });
        continue;
      }

      // Advance round-robin index past the node we used
      const usedIdx = ROUTABLE_NODES.findIndex((n) => n.id === node.id);
      if (usedIdx !== -1) {
        await saveRRIndex(env.LB_STATE, (usedIdx + 1) % ROUTABLE_NODES.length);
      }

      // Clone response with LB metadata headers
      const respHeaders = new Headers(resp.headers);
      respHeaders.set('X-LB-Node', node.id);
      respHeaders.set('X-LB-Attempts', String(errors.length + 1));

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: respHeaders,
      });
    } catch (err) {
      // Network error — mark unhealthy and try next
      healthState[node.id] = {
        ...(healthState[node.id] || {}),
        healthy: false,
        error: err.message,
        lastCheck: now(),
      };
      errors.push({ node: node.id, error: err.message });
    }
  }

  // All nodes exhausted
  await saveHealthState(env.LB_STATE, healthState);

  return jsonResponse(
    {
      error: 'All backend nodes failed',
      attempts: errors,
    },
    502,
  );
}

/** Cron-triggered health check across all nodes. */
async function handleScheduled(env) {
  const healthState = await loadHealthState(env.LB_STATE);

  // Probe all nodes in parallel (including non-routable for monitoring)
  const probes = NODES.map(async (node) => {
    const result = await probeNode(node);
    const existing = healthState[node.id] || {};

    healthState[node.id] = {
      healthy: result.healthy,
      lastCheck: now(),
      latencyMs: result.latencyMs,
      quotas: result.healthy ? (result.quotas || existing.quotas || {}) : (existing.quotas || {}),
      error: result.error || null,
      // Preserve cooldown unless it has expired
      cooldownUntil:
        existing.cooldownUntil && now() < existing.cooldownUntil
          ? existing.cooldownUntil
          : null,
    };
  });

  await Promise.allSettled(probes);
  await saveHealthState(env.LB_STATE, healthState);
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- CORS preflight ---
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, anthropic-version',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // --- Health probe for the LB itself ---
    if (path === '/health' && request.method === 'GET') {
      return jsonResponse({ status: 'ok', service: 'antigravity-lb' });
    }

    // --- Auth gate (everything below requires auth) ---
    if (!authenticate(request, env)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // --- Monitoring endpoint ---
    if (path === '/lb/status' && request.method === 'GET') {
      return handleStatus(env);
    }

    // --- API proxy ---
    if (API_PATHS.some((p) => path.startsWith(p))) {
      return handleApiRequest(request, env);
    }

    // --- Unknown route ---
    return jsonResponse(
      {
        error: 'Not found',
        hint: 'Supported paths: /v1/messages, /v1/complete, /lb/status, /health',
      },
      404,
    );
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  },
};
