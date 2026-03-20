/**
 * zilliz-bridge v1.0 — CF Worker proxy for Zilliz Cloud REST API v2
 *
 * Provides:
 *   POST /v1/search     — Embed query via Workers AI + vector search across 3 clusters
 *   POST /v1/insert     — Embed + upsert entities to correct cluster (domain routing)
 *   POST /v1/keepalive  — Ping all 3 clusters, reload if suspended
 *   GET  /v1/stats      — Load state of all 3 clusters
 *   GET  /health        — Simple health check
 *
 * Cron: every 5 hours — automatic keepalive to prevent 7-day auto-suspend
 *
 * Auth: Bearer AUTH_TOKEN (wrangler secret)
 * Embedding: @cf/baai/bge-base-en-v1.5 (768-dim, matches existing Vectorize + Zilliz schema)
 */

// Domain routing — entity type → cluster (from ingest-domain-sharded.js)
const DOMAIN_ROUTING = {
  agents: ['agent', 'service', 'local_node', 'process'],
  intel: ['intel', 'intel_item', 'debate', 'debate_insight', 'event', 'concept', 'lesson', 'experience', 'document'],
  products: ['product', 'worker', 'platform', 'cron_job', 'kv_namespace', 'database', 'infrastructure', 'api_key', 'file', 'plan_template', 'security_issue', 'security', 'detected_error']
};

const CLUSTER_NAMES = ['agents', 'intel', 'products'];
const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';
const MAX_EMBED_LEN = 500;

function getCluster(name, env) {
  return {
    endpoint: env[`ZILLIZ_${name.toUpperCase()}_ENDPOINT`],
    token: env[`ZILLIZ_${name.toUpperCase()}_TOKEN`],
    collection: env[`ZILLIZ_${name.toUpperCase()}_COLLECTION`]
  };
}

function routeToCluster(entityType) {
  for (const [name, types] of Object.entries(DOMAIN_ROUTING)) {
    if (types.includes(entityType)) return name;
  }
  return 'products'; // default
}

// --- Auth ---

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  return token === env.AUTH_TOKEN;
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function errorResp(message, status = 400) {
  return jsonResp({ ok: false, error: message }, status);
}

// --- Embedding ---

async function embed(text, env) {
  const input = String(text || '').slice(0, MAX_EMBED_LEN);
  if (input.length < 3) return null;
  try {
    const result = await env.AI.run(EMBED_MODEL, { text: [input] });
    return result?.data?.[0] || null;
  } catch (e) {
    console.error('Embed error:', e.message);
    return null;
  }
}

// --- Zilliz API calls ---

async function zillizPost(endpoint, token, path, body) {
  const resp = await fetch(`${endpoint}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  return resp.json();
}

async function zillizSearch(env, clusterName, vector, limit = 5, filter = '') {
  const c = getCluster(clusterName, env);
  if (!c.endpoint || !c.token) throw new Error(`Cluster ${clusterName} not configured`);

  const body = {
    collectionName: c.collection,
    data: [vector],
    limit,
    outputFields: ['*']
  };
  if (filter) body.filter = filter;

  const json = await zillizPost(c.endpoint, c.token, '/v2/vectordb/entities/search', body);
  if (json.code !== 0) throw new Error(`Zilliz ${clusterName}: code=${json.code} ${json.message || ''}`);

  // Handle both [[...]] and [...] response formats
  const results = json.data || [];
  const flat = results.length > 0 && Array.isArray(results[0]) ? results[0] : results;
  return flat.map(r => ({
    ...r,
    source: `zilliz:${clusterName}`,
    score: r.distance ?? r.score ?? 0
  }));
}

async function zillizUpsert(env, clusterName, data) {
  const c = getCluster(clusterName, env);
  if (!c.endpoint || !c.token) throw new Error(`Cluster ${clusterName} not configured`);

  const json = await zillizPost(c.endpoint, c.token, '/v2/vectordb/entities/upsert', {
    collectionName: c.collection,
    data
  });
  if (json.code !== 0) throw new Error(`Zilliz upsert ${clusterName}: code=${json.code} ${json.message || ''}`);
  return json.data || {};
}

async function zillizGetLoadState(env, clusterName) {
  const c = getCluster(clusterName, env);
  if (!c.endpoint || !c.token) return { cluster: clusterName, loadState: 'not_configured' };

  try {
    const json = await zillizPost(c.endpoint, c.token, '/v2/vectordb/collections/get_load_state', {
      collectionName: c.collection
    });
    return {
      cluster: clusterName,
      collection: c.collection,
      loadState: json.data?.loadState || 'unknown',
      loadProgress: json.data?.loadProgress
    };
  } catch (e) {
    return { cluster: clusterName, loadState: 'error', error: e.message };
  }
}

async function zillizLoad(env, clusterName) {
  const c = getCluster(clusterName, env);
  if (!c.endpoint || !c.token) return;
  await zillizPost(c.endpoint, c.token, '/v2/vectordb/collections/load', {
    collectionName: c.collection
  });
}

// --- Handlers ---

async function handleSearch(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.query) return errorResp('Missing query');

  const cluster = body.cluster;
  const limit = Math.min(body.limit || 5, 50);
  const filter = body.filter || '';

  // Embed query
  const vector = await embed(body.query, env);
  if (!vector) return errorResp('Embedding failed');

  // Search specific cluster or all
  if (cluster) {
    if (!CLUSTER_NAMES.includes(cluster)) return errorResp(`Invalid cluster: ${cluster}. Must be one of: ${CLUSTER_NAMES.join(', ')}`);
    const results = await zillizSearch(env, cluster, vector, limit, filter);
    return jsonResp({ ok: true, cluster, count: results.length, results });
  }

  // Search all clusters in parallel
  const promises = CLUSTER_NAMES.map(name =>
    zillizSearch(env, name, vector, limit, filter).catch(e => {
      console.error(`Search ${name} failed:`, e.message);
      return [];
    })
  );
  const allResults = await Promise.all(promises);

  // Merge + deduplicate (SHA-256 hash for items without an id)
  const seen = new Set();
  const merged = [];
  for (const results of allResults) {
    for (const r of results) {
      let id = r.id || r._id;
      if (!id) {
        const raw = JSON.stringify(r);
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        id = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      }
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(r);
      }
    }
  }
  merged.sort((a, b) => (b.score || 0) - (a.score || 0));

  return jsonResp({ ok: true, cluster: 'all', count: merged.length, results: merged.slice(0, limit * 3) });
}

async function handleInsert(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.data || !Array.isArray(body.data) || body.data.length === 0) {
    return errorResp('Missing data array');
  }

  const results = { total: 0, byCluster: {} };
  const errors = [];

  // Group entities by cluster using domain routing
  const grouped = {};
  for (const entity of body.data) {
    const cluster = body.cluster || routeToCluster(entity.type || '');
    if (!grouped[cluster]) grouped[cluster] = [];
    grouped[cluster].push(entity);
  }

  // Embed + upsert per cluster
  for (const [clusterName, entities] of Object.entries(grouped)) {
    if (!CLUSTER_NAMES.includes(clusterName)) {
      errors.push(`Invalid cluster: ${clusterName}`);
      continue;
    }

    const zillizData = [];
    for (const e of entities) {
      const text = e.summary || e.name || '';
      const vector = await embed(text, env);
      if (!vector) {
        errors.push(`Embedding failed for: ${e.id || e.name}`);
        continue;
      }
      zillizData.push({
        id: e.id || `auto-${crypto.randomUUID()}`,
        vector,
        text: text.slice(0, 500),
        name: (e.name || '').slice(0, 200),
        type: (e.type || 'concept').slice(0, 50),
        summary: (e.summary || text).slice(0, 500)
      });
    }

    if (zillizData.length > 0) {
      try {
        const result = await zillizUpsert(env, clusterName, zillizData);
        const count = result.upsertCount || zillizData.length;
        results.byCluster[clusterName] = count;
        results.total += count;
      } catch (e) {
        errors.push(`Upsert ${clusterName}: ${e.message}`);
      }
    }
  }

  return jsonResp({ ok: errors.length === 0, ...results, errors: errors.length > 0 ? errors : undefined });
}

async function handleKeepalive(env) {
  const states = {};
  const reloaded = [];

  for (const name of CLUSTER_NAMES) {
    const state = await zillizGetLoadState(env, name);
    states[name] = state.loadState;

    // Handle both 'LoadStateNotLoad' and 'LoadStateNotLoaded' (API inconsistency)
    if (state.loadState === 'LoadStateNotLoad' || state.loadState === 'LoadStateNotLoaded') {
      try {
        await zillizLoad(env, name);
        reloaded.push(name);
        states[name] = 'reloaded';
      } catch (e) {
        states[name] = `reload_failed: ${e.message}`;
      }
    }
  }

  return jsonResp({ ok: true, states, reloaded: reloaded.length > 0 ? reloaded : undefined, timestamp: new Date().toISOString() });
}

async function handleStats(env) {
  const stats = await Promise.all(CLUSTER_NAMES.map(name => zillizGetLoadState(env, name)));
  return jsonResp({ ok: true, clusters: stats, timestamp: new Date().toISOString() });
}

// --- Router ---

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Health (no auth required)
    if (path === '/health') {
      return jsonResp({ status: 'ok', version: env.VERSION || '1.0.0' });
    }

    // Stats (no auth for monitoring)
    if (path === '/v1/stats' && method === 'GET') {
      return handleStats(env);
    }

    // Auth required for mutations
    if (!checkAuth(request, env)) {
      return errorResp('Unauthorized', 401);
    }

    if (method !== 'POST') {
      return errorResp('Method not allowed', 405);
    }

    try {
      switch (path) {
        case '/v1/search':
          return await handleSearch(request, env);
        case '/v1/insert':
          return await handleInsert(request, env);
        case '/v1/keepalive':
          return await handleKeepalive(env);
        default:
          return errorResp('Not found', 404);
      }
    } catch (e) {
      console.error('Handler error:', e);
      return errorResp(`Internal error: ${e.message}`, 500);
    }
  },

  async scheduled(event, env, ctx) {
    console.log(`[${new Date().toISOString()}] zilliz-bridge keepalive cron`);

    for (const name of CLUSTER_NAMES) {
      const state = await zillizGetLoadState(env, name);
      console.log(`  ${name}: ${state.loadState}`);

      if (state.loadState === 'LoadStateNotLoad' || state.loadState === 'LoadStateNotLoaded') {
        try {
          await zillizLoad(env, name);
          console.log(`  ${name}: reloaded`);
        } catch (e) {
          console.error(`  ${name}: reload failed: ${e.message}`);
        }
      }
    }
  }
};
