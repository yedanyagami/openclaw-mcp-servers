/**
 * Groq Load Balancer — Cloudflare Worker
 *
 * Distributes requests across multiple Groq API keys to maximize aggregate
 * rate limits. Tracks per-key usage in KV, implements cooldown on 429s, and
 * prefers the least-recently-used key for even distribution.
 *
 * Groq free tier: 30 RPM per key.
 * With 4 keys: effective 120 RPM capacity.
 *
 * State is persisted in a KV namespace (GROQ_STATE).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROQ_BASE_URL = 'https://api.groq.com/openai';
const RPM_PER_KEY = 30;
const COOLDOWN_MS = 60 * 1000;          // 60s cooldown on 429
const USAGE_WINDOW_MS = 60 * 1000;      // 1-minute sliding window
const KV_STATE_KEY = 'key_state';
const KV_RR_KEY = 'round_robin_index';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRY_WAIT_MS = 10_000;       // max wait when all keys exhausted
const MAX_KEYS = 4;

// Proxied API paths
const API_PATHS = [
  '/v1/chat/completions',
  '/v1/embeddings',
  '/v1/models',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function now() {
  return Date.now();
}

/**
 * Resolve available key bindings from env.
 * Returns array of { index, envKey } for keys that are actually set.
 */
function resolveKeys(env) {
  const keys = [];
  for (let i = 1; i <= MAX_KEYS; i++) {
    const val = env[`GROQ_KEY_${i}`];
    if (val) {
      keys.push({ index: i, secret: val });
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// KV State Management
// ---------------------------------------------------------------------------

/**
 * Key state shape (per key index):
 * {
 *   usageTimestamps: number[],   // timestamps of recent requests (within window)
 *   cooldownUntil: number|null,  // epoch ms when cooldown expires
 *   totalRequests: number,       // lifetime counter
 *   lastUsed: number|null,       // epoch ms
 *   lastError: string|null,
 *   lastErrorTime: number|null,
 *   rateLimitHits: number,       // lifetime 429 counter
 * }
 */

function defaultKeyState() {
  return {
    usageTimestamps: [],
    cooldownUntil: null,
    totalRequests: 0,
    lastUsed: null,
    lastError: null,
    lastErrorTime: null,
    rateLimitHits: 0,
  };
}

async function loadState(kv) {
  try {
    const raw = await kv.get(KV_STATE_KEY, 'json');
    if (raw && typeof raw === 'object') return raw;
  } catch (_) {
    // corrupted — start fresh
  }
  return {};
}

async function saveState(kv, state) {
  await kv.put(KV_STATE_KEY, JSON.stringify(state), {
    expirationTtl: 600, // auto-expire after 10 min as safety net
  });
}

async function loadRRIndex(kv) {
  const val = await kv.get(KV_RR_KEY);
  return val !== null ? parseInt(val, 10) : 0;
}

async function saveRRIndex(kv, idx) {
  await kv.put(KV_RR_KEY, String(idx));
}

/**
 * Prune usage timestamps outside the sliding window.
 */
function pruneUsage(keyState) {
  const cutoff = now() - USAGE_WINDOW_MS;
  keyState.usageTimestamps = (keyState.usageTimestamps || []).filter(
    (ts) => ts > cutoff,
  );
}

/**
 * Get current RPM usage for a key (requests in the last 60s).
 */
function currentRPM(keyState) {
  pruneUsage(keyState);
  return keyState.usageTimestamps.length;
}

/**
 * Check if a key is in cooldown.
 */
function isInCooldown(keyState) {
  return keyState.cooldownUntil && now() < keyState.cooldownUntil;
}

/**
 * Check if a key is available (not in cooldown and under RPM limit).
 */
function isAvailable(keyState) {
  if (isInCooldown(keyState)) return false;
  return currentRPM(keyState) < RPM_PER_KEY;
}

// ---------------------------------------------------------------------------
// Key Selection — Smart Least-Used with Round-Robin Tiebreak
// ---------------------------------------------------------------------------

/**
 * Select the best key to use. Prefers:
 * 1. Keys not in cooldown and under RPM limit
 * 2. Among those, the key with lowest recent usage
 * 3. Round-robin index as tiebreaker
 *
 * Returns { index, secret, keyState } or null if all exhausted.
 */
function selectKey(keys, state, rrIndex) {
  const candidates = [];

  for (const key of keys) {
    const ks = state[key.index] || defaultKeyState();
    pruneUsage(ks);
    state[key.index] = ks;

    if (isAvailable(ks)) {
      candidates.push({
        ...key,
        keyState: ks,
        rpm: currentRPM(ks),
        rrDist: (key.index - 1 - rrIndex + keys.length) % keys.length,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Sort: lowest RPM first, then round-robin distance as tiebreaker
  candidates.sort((a, b) => {
    if (a.rpm !== b.rpm) return a.rpm - b.rpm;
    return a.rrDist - b.rrDist;
  });

  return candidates[0];
}

/**
 * Find the earliest cooldown expiry across all keys.
 * Returns ms until the first key becomes available, or null.
 */
function earliestCooldownMs(keys, state) {
  let earliest = Infinity;
  for (const key of keys) {
    const ks = state[key.index] || defaultKeyState();
    if (ks.cooldownUntil && ks.cooldownUntil > now()) {
      earliest = Math.min(earliest, ks.cooldownUntil - now());
    }
  }
  return earliest === Infinity ? null : earliest;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!env.LB_AUTH_TOKEN) return false; // fail closed
  if (token.length !== env.LB_AUTH_TOKEN.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ env.LB_AUTH_TOKEN.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Request Proxying
// ---------------------------------------------------------------------------

/**
 * Forward a request to Groq API with the selected key.
 */
async function proxyToGroq(request, bodyBytes, selectedKey, path, searchParams) {
  const targetUrl = `${GROQ_BASE_URL}${path}${searchParams ? '?' + searchParams : ''}`;

  const headers = new Headers();
  // Forward content-type and accept headers
  const contentType = request.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  const accept = request.headers.get('Accept');
  if (accept) headers.set('Accept', accept);

  // Set the Groq API key
  headers.set('Authorization', `Bearer ${selectedKey.secret}`);
  headers.set('User-Agent', 'GroqLB/1.0');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? bodyBytes : undefined,
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
// Handlers
// ---------------------------------------------------------------------------

/** GET /health */
function handleHealth() {
  return jsonResponse({
    status: 'ok',
    service: 'groq-lb',
    timestamp: new Date().toISOString(),
  });
}

/** GET /lb/status */
async function handleStatus(env) {
  const keys = resolveKeys(env);
  const state = await loadState(env.GROQ_STATE);
  const rrIndex = await loadRRIndex(env.GROQ_STATE);

  const keyStatuses = keys.map((key) => {
    const ks = state[key.index] || defaultKeyState();
    pruneUsage(ks);
    const rpm = currentRPM(ks);
    const inCooldown = isInCooldown(ks);

    return {
      index: key.index,
      envKey: `GROQ_KEY_${key.index}`,
      currentRPM: rpm,
      maxRPM: RPM_PER_KEY,
      available: isAvailable(ks),
      inCooldown,
      cooldownUntil: ks.cooldownUntil
        ? new Date(ks.cooldownUntil).toISOString()
        : null,
      cooldownRemainingMs: inCooldown ? ks.cooldownUntil - now() : 0,
      totalRequests: ks.totalRequests,
      rateLimitHits: ks.rateLimitHits,
      lastUsed: ks.lastUsed ? new Date(ks.lastUsed).toISOString() : null,
      lastError: ks.lastError,
      lastErrorTime: ks.lastErrorTime
        ? new Date(ks.lastErrorTime).toISOString()
        : null,
    };
  });

  const totalAvailableRPM = keyStatuses
    .filter((k) => k.available)
    .reduce((sum, k) => sum + (RPM_PER_KEY - k.currentRPM), 0);

  return jsonResponse({
    service: 'groq-lb',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    roundRobinIndex: rrIndex,
    totalKeys: keys.length,
    availableKeys: keyStatuses.filter((k) => k.available).length,
    totalCapacityRPM: keys.length * RPM_PER_KEY,
    currentAvailableRPM: totalAvailableRPM,
    keys: keyStatuses,
  });
}

/** GET /lb/capacity */
async function handleCapacity(env) {
  const keys = resolveKeys(env);
  const state = await loadState(env.GROQ_STATE);

  let usedRPM = 0;
  let availableKeys = 0;

  for (const key of keys) {
    const ks = state[key.index] || defaultKeyState();
    pruneUsage(ks);
    if (isAvailable(ks)) {
      availableKeys++;
      usedRPM += currentRPM(ks);
    }
  }

  const totalCapacity = keys.length * RPM_PER_KEY;
  const currentUsed = usedRPM;
  const currentAvailable = totalCapacity - currentUsed;

  return jsonResponse({
    service: 'groq-lb',
    timestamp: new Date().toISOString(),
    totalKeys: keys.length,
    availableKeys,
    rpmPerKey: RPM_PER_KEY,
    totalCapacityRPM: totalCapacity,
    currentUsedRPM: currentUsed,
    currentAvailableRPM: Math.max(0, currentAvailable),
    utilizationPercent: totalCapacity > 0
      ? Math.round((currentUsed / totalCapacity) * 100)
      : 0,
  });
}

/** Handle proxied API requests with failover across keys. */
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const searchParams = url.search ? url.search.slice(1) : '';

  const keys = resolveKeys(env);
  if (keys.length === 0) {
    return jsonResponse({ error: 'No Groq API keys configured' }, 503);
  }

  // Read body once
  let bodyBytes = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    bodyBytes = await request.arrayBuffer();
  }

  const state = await loadState(env.GROQ_STATE);
  let rrIndex = await loadRRIndex(env.GROQ_STATE);

  const attempts = [];
  const maxAttempts = keys.length + 1; // try each key once, plus one retry if a cooldown expires

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const selected = selectKey(keys, state, rrIndex);

    if (!selected) {
      // All keys exhausted — check if we should wait for a cooldown
      const waitMs = earliestCooldownMs(keys, state);
      if (waitMs !== null && waitMs <= MAX_RETRY_WAIT_MS && attempt < maxAttempts - 1) {
        // Wait for the cooldown to expire, then retry
        await new Promise((resolve) => setTimeout(resolve, waitMs + 100));
        continue;
      }

      // Truly exhausted
      await saveState(env.GROQ_STATE, state);
      return jsonResponse(
        {
          error: 'All Groq API keys exhausted or rate-limited',
          attempts,
          hint: 'Try again in 60 seconds',
        },
        429,
        { 'Retry-After': '60' },
      );
    }

    try {
      const resp = await proxyToGroq(request, bodyBytes, selected, path, searchParams);

      // Handle 429 from Groq — mark cooldown and try next key
      if (resp.status === 429) {
        selected.keyState.cooldownUntil = now() + COOLDOWN_MS;
        selected.keyState.rateLimitHits = (selected.keyState.rateLimitHits || 0) + 1;
        selected.keyState.lastError = 'Rate limited (429)';
        selected.keyState.lastErrorTime = now();
        state[selected.index] = selected.keyState;

        attempts.push({
          keyIndex: selected.index,
          status: 429,
          msg: 'Rate limited — cooldown applied',
        });
        continue;
      }

      // Success (or at least not a 429) — record usage
      selected.keyState.usageTimestamps.push(now());
      selected.keyState.totalRequests = (selected.keyState.totalRequests || 0) + 1;
      selected.keyState.lastUsed = now();
      state[selected.index] = selected.keyState;

      // Advance round-robin
      rrIndex = selected.index % keys.length;
      await saveRRIndex(env.GROQ_STATE, rrIndex);
      await saveState(env.GROQ_STATE, state);

      // If Groq returned an error (non-429), record it but still forward
      if (resp.status >= 400) {
        selected.keyState.lastError = `HTTP ${resp.status}`;
        selected.keyState.lastErrorTime = now();
        state[selected.index] = selected.keyState;
        await saveState(env.GROQ_STATE, state);
      }

      // Clone response with LB metadata headers
      const respHeaders = new Headers(resp.headers);
      respHeaders.set('X-Groq-Key-Index', String(selected.index));
      respHeaders.set('X-Groq-Attempts', String(attempts.length + 1));

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: respHeaders,
      });
    } catch (err) {
      // Network error
      selected.keyState.lastError = err.message;
      selected.keyState.lastErrorTime = now();
      // Don't cooldown on network errors — the key itself is fine
      state[selected.index] = selected.keyState;

      attempts.push({
        keyIndex: selected.index,
        error: err.message,
      });
    }
  }

  // All attempts failed
  await saveState(env.GROQ_STATE, state);
  return jsonResponse(
    {
      error: 'All attempts to reach Groq API failed',
      attempts,
    },
    502,
  );
}

// ---------------------------------------------------------------------------
// Worker Entry Point
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // --- Health (unauthenticated) ---
    if (path === '/health' && request.method === 'GET') {
      return handleHealth();
    }

    // --- Auth gate ---
    if (!authenticate(request, env)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // --- Monitoring endpoints ---
    if (path === '/lb/status' && request.method === 'GET') {
      return handleStatus(env);
    }

    if (path === '/lb/capacity' && request.method === 'GET') {
      return handleCapacity(env);
    }

    // --- API proxy ---
    if (API_PATHS.some((p) => path.startsWith(p))) {
      return handleApiRequest(request, env);
    }

    // --- Unknown route ---
    return jsonResponse(
      {
        error: 'Not found',
        hint: 'Supported paths: /v1/chat/completions, /v1/embeddings, /v1/models, /lb/status, /lb/capacity, /health',
      },
      404,
    );
  },
};
