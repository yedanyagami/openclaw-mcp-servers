// ============================================================
// Fleet Gateway v1.0 — Central command for all 38 CF Workers
// Lets VM1/VM2/Claude Code dispatch tasks, discuss, save memory
// Uses Workers AI (free), D1, Vectorize — no Ollama needed
// ============================================================

const FLEET_AUTH_TOKEN = 'fleet-gateway-2026'; // Will be overridden by CF secret

// ── Known fleet Workers ──
const FLEET_WORKERS = {
  'orchestrator':       { url: 'https://yedan-orchestrator.yagami8095.workers.dev', cron: '*/2' },
  'health-commander':   { url: 'https://yedan-health-commander.yagami8095.workers.dev', cron: '*/3' },
  'cloud-executor':     { url: 'https://yedan-cloud-executor.yagami8095.workers.dev', cron: '*/5' },
  'revenue-sentinel':   { url: 'https://yedan-revenue-sentinel.yagami8095.workers.dev', cron: '*/10' },
  'intel-ops':          { url: 'https://yedan-intel-ops.yagami8095.workers.dev', cron: '*/15' },
  'content-engine':     { url: 'https://yedan-content-engine.yagami8095.workers.dev', cron: '*/30' },
  'graph-rag':          { url: 'https://yedan-graph-rag.yagami8095.workers.dev', cron: '*/6h' },
  'keepalive':          { url: 'https://yedan-keepalive.yagami8095.workers.dev', cron: '*/14' },
  'product-store':      { url: 'https://product-store.yagami8095.workers.dev' },
  'x402-gateway':       { url: 'https://openclaw-x402-gateway.yagami8095.workers.dev' },
  'json-toolkit':       { url: 'https://json-toolkit-mcp.yagami8095.workers.dev' },
  'regex-engine':       { url: 'https://regex-engine-mcp.yagami8095.workers.dev' },
  'prompt-enhancer':    { url: 'https://prompt-enhancer-mcp.yagami8095.workers.dev' },
  'intel-api':          { url: 'https://openclaw-intel-api.yagami8095.workers.dev' },
  'intel-mcp':          { url: 'https://openclaw-intel-mcp.yagami8095.workers.dev' },
  'fortune-api':        { url: 'https://fortune-api.yagami8095.workers.dev' },
  'notion-warroom':     { url: 'https://notion-warroom.yagami8095.workers.dev' },
  'kpi-dashboard':      { url: 'https://kpi-dashboard.yagami8095.workers.dev' },
  'groq-lb':            { url: 'https://groq-lb.yagami8095.workers.dev' },
  'zilliz-bridge':      { url: 'https://zilliz-bridge.yagami8095.workers.dev' },
  'github-models':      { url: 'https://github-models-proxy.yagami8095.workers.dev' },
  'xai-proxy':          { url: 'https://xai-proxy.yagami8095.workers.dev' },
};

// ── Auth ──
function auth(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const expected = env.FLEET_GATEWAY_TOKEN || FLEET_AUTH_TOKEN;
  if (!token || token !== expected) return false;
  return true;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// ── Workers AI Discussion ──
async function aiDiscuss(env, topic, models = []) {
  const defaultModels = [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/qwen/qwen2.5-coder-32b-instruct',
    '@cf/google/gemma-3-12b-it',
  ];
  const useModels = models.length > 0 ? models : defaultModels;

  const results = await Promise.allSettled(
    useModels.map(async (model) => {
      try {
        const response = await env.AI.run(model, {
          messages: [
            { role: 'system', content: 'You are an AI brain in a multi-brain AGI network. Give your unique perspective concisely (max 150 words).' },
            { role: 'user', content: topic },
          ],
          max_tokens: 512,
        });
        return { model, response: response.response || JSON.stringify(response), ok: true };
      } catch (e) {
        return { model, error: e.message, ok: false };
      }
    })
  );

  return results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message, ok: false });
}

// ── Memory Save (KG + Vectorize, no Ollama) ──
async function memorySave(env, items) {
  const results = { d1: 0, vectorize: 0, errors: [] };

  for (const item of items) {
    if (!item.id) item.id = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!item.name) item.name = item.id;
    if (!item.type) item.type = 'concept';

    // D1: upsert entity
    try {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO entities (id, name, entity_type, summary, source, trust_level, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'fleet-gateway', 3, datetime('now'), datetime('now'))`
      ).bind(item.id, item.name, item.type, (item.summary || '').substring(0, 5000)).run();
      results.d1++;
    } catch (e) {
      results.errors.push(`D1 ${item.id}: ${e.message}`);
    }

    // Vectorize: embed + insert
    try {
      const text = `${item.name}: ${(item.summary || '').substring(0, 2000)}`;
      const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
      if (embedding.data && embedding.data[0]) {
        await env.VECTORIZE.upsert([{
          id: item.id,
          values: embedding.data[0],
          metadata: { name: item.name, type: item.type, summary: (item.summary || '').substring(0, 500) },
        }]);
        results.vectorize++;
      }
    } catch (e) {
      results.errors.push(`Vec ${item.id}: ${e.message}`);
    }
  }

  return results;
}

// ── Dispatch to fleet Worker ──
async function dispatch(workerName, payload, env) {
  const worker = FLEET_WORKERS[workerName];
  if (!worker) return { error: `Unknown worker: ${workerName}`, known: Object.keys(FLEET_WORKERS) };

  try {
    const resp = await fetch(worker.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.FLEET_AUTH_TOKEN || ''}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.text();
    try { return JSON.parse(data); }
    catch { return { raw: data.substring(0, 1000) }; }
  } catch (e) {
    return { error: e.message };
  }
}

// ── Fleet Status ──
async function fleetStatus(env) {
  const checks = Object.entries(FLEET_WORKERS).map(async ([name, info]) => {
    try {
      const resp = await fetch(info.url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return { name, url: info.url, status: resp.status, ok: resp.ok, cron: info.cron || null };
    } catch (e) {
      return { name, url: info.url, status: 0, ok: false, error: e.message, cron: info.cron || null };
    }
  });

  return Promise.all(checks);
}

// ── Unified Memory Query (D1 FTS5 + Vectorize + Zilliz x3 + KG, with RRF fusion) ──
const ZILLIZ_BRIDGE_URL = 'https://zilliz-bridge.yagami8095.workers.dev';
const KG_URL = 'https://yedan-graph-rag.yagami8095.workers.dev';

async function memoryQuery(env, query, sources, limit = 10) {
  const startTime = Date.now();
  const allSources = sources || ['d1', 'vectorize', 'zilliz-agents', 'zilliz-intel', 'zilliz-products', 'kg', 'tavily'];
  const results = {};
  const errors = [];

  // 1. Embed query
  let embedding = null;
  try {
    const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query.slice(0, 500)] });
    embedding = emb?.data?.[0] || null;
  } catch (e) {
    errors.push(`Embedding: ${e.message}`);
  }

  // 2. Parallel fetch all sources
  const tasks = [];

  // D1 FTS5
  if (allSources.includes('d1')) {
    tasks.push((async () => {
      try {
        const sanitized = query.replace(/[^\w\s]/g, ' ').trim();
        if (!sanitized) return;
        const { results: rows } = await env.DB.prepare(
          `SELECT e.id, e.name, e.entity_type as type, e.summary, e.trust_level as confidence, e.updated_at
           FROM kg_entities_fts fts
           JOIN entities e ON e.rowid = fts.rowid
           WHERE kg_entities_fts MATCH ?
           ORDER BY bm25(kg_entities_fts, 10.0, 5.0, 1.0)
           LIMIT ?`
        ).bind(sanitized, limit * 2).all();
        results.d1 = (rows || []).map((r, i) => ({ ...r, source: 'd1', rank: i }));
      } catch (e) {
        // FTS5 table may not exist — try basic LIKE search
        try {
          const { results: rows } = await env.DB.prepare(
            `SELECT id, name, entity_type as type, summary, trust_level as confidence, updated_at
             FROM entities WHERE name LIKE ? OR summary LIKE ? LIMIT ?`
          ).bind(`%${query.slice(0, 50)}%`, `%${query.slice(0, 50)}%`, limit * 2).all();
          results.d1 = (rows || []).map((r, i) => ({ ...r, source: 'd1', rank: i }));
        } catch (e2) {
          errors.push(`D1: ${e2.message}`);
        }
      }
    })());
  }

  // Vectorize semantic search
  if (allSources.includes('vectorize') && embedding) {
    tasks.push((async () => {
      try {
        const vecResults = await env.VECTORIZE.query(embedding, { topK: limit * 2, returnMetadata: 'all' });
        results.vectorize = (vecResults.matches || []).map((m, i) => ({
          id: m.id, score: m.score, source: 'vectorize', rank: i,
          ...(m.metadata || {})
        }));
      } catch (e) {
        errors.push(`Vectorize: ${e.message}`);
      }
    })());
  }

  // Zilliz clusters via zilliz-bridge
  for (const cluster of ['agents', 'intel', 'products']) {
    if (allSources.includes(`zilliz-${cluster}`)) {
      tasks.push((async () => {
        try {
          const resp = await fetch(`${ZILLIZ_BRIDGE_URL}/v1/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.FLEET_GATEWAY_TOKEN || FLEET_AUTH_TOKEN}`
            },
            body: JSON.stringify({ cluster, query, limit }),
            signal: AbortSignal.timeout(8000)
          });
          const json = await resp.json();
          if (json.ok) {
            results[`zilliz-${cluster}`] = (json.results || []).map((r, i) => ({ ...r, source: `zilliz:${cluster}`, rank: i }));
          }
        } catch (e) {
          errors.push(`Zilliz-${cluster}: ${e.message}`);
        }
      })());
    }
  }

  // KG graph query
  if (allSources.includes('kg')) {
    tasks.push((async () => {
      try {
        const resp = await fetch(`${KG_URL}/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.KG_TOKEN || ''}`
          },
          body: JSON.stringify({ query, limit }),
          signal: AbortSignal.timeout(8000)
        });
        const json = await resp.json();
        results.kg = (json.results || json.entities || []).map((r, i) => ({ ...r, source: 'kg', rank: i }));
      } catch (e) {
        errors.push(`KG: ${e.message}`);
      }
    })());
  }

  // Tavily web search
  if (allSources.includes('tavily') && env.TAVILY_API_KEY) {
    tasks.push((async () => {
      try {
        const resp = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: env.TAVILY_API_KEY,
            query: query.slice(0, 400),
            search_depth: 'basic',
            max_results: Math.min(limit, 5),
            include_answer: true
          }),
          signal: AbortSignal.timeout(8000)
        });
        const data = await resp.json();
        results.tavily = (data.results || []).map((r, i) => ({
          id: `tavily-${i}`, name: r.title, type: 'web_result',
          summary: r.content?.slice(0, 300), source: 'tavily',
          score: r.score || 0, url: r.url, rank: i
        }));
        if (data.answer) {
          results.tavily.unshift({ id: 'tavily-answer', name: 'Tavily Answer', type: 'answer', summary: data.answer, source: 'tavily', score: 1.0, rank: -1 });
        }
      } catch (e) {
        errors.push(`Tavily: ${e.message}`);
      }
    })());
  }

  await Promise.all(tasks);

  // 3. RRF fusion (k=60)
  const k = 60;
  const scores = {};
  const entityMap = {};
  const sourceCounts = {};

  for (const [sourceName, items] of Object.entries(results)) {
    if (!Array.isArray(items)) continue;
    sourceCounts[sourceName] = items.length;
    items.forEach((r, i) => {
      const id = r.id || `${sourceName}-${i}`;
      scores[id] = (scores[id] || 0) + 1 / (k + i + 1);
      if (!entityMap[id]) entityMap[id] = { ...r, _sources: [] };
      entityMap[id]._sources.push(sourceName);
    });
  }

  // Sort by RRF score, boost cross-source hits
  const merged = Object.entries(scores)
    .map(([id, score]) => {
      const entity = entityMap[id];
      const crossBoost = entity._sources.length > 1 ? 1.2 : 1.0;
      return { ...entity, _rrf_score: score * crossBoost, _sources: entity._sources };
    })
    .sort((a, b) => b._rrf_score - a._rrf_score)
    .slice(0, limit);

  // 4. Cohere rerank (optional, post-RRF quality boost)
  let finalResults = merged;
  if (env.COHERE_API_KEY && merged.length > 3) {
    try {
      const docs = merged.slice(0, 25).map(r => r.summary || r.name || '').filter(Boolean);
      if (docs.length > 1) {
        const resp = await fetch('https://api.cohere.com/v2/rerank', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.COHERE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'rerank-v3.5', query, documents: docs, top_n: limit }),
          signal: AbortSignal.timeout(5000)
        });
        const reranked = await resp.json();
        if (reranked.results && reranked.results.length > 0) {
          finalResults = reranked.results.map(r => ({
            ...merged[r.index],
            _rerank_score: r.relevance_score,
            source: (merged[r.index].source || '') + '+cohere'
          }));
        }
      }
    } catch (e) {
      errors.push(`Cohere rerank: ${e.message}`);
      // Fall back to RRF results
    }
  }

  return {
    ok: true,
    query,
    count: finalResults.length,
    results: finalResults,
    meta: { sources_queried: Object.keys(sourceCounts), source_counts: sourceCounts, latency_ms: Date.now() - startTime, reranked: finalResults !== merged, errors: errors.length > 0 ? errors : undefined }
  };
}

// ── Unified Memory Write (D1 + Vectorize + Zilliz + KG) ──
async function memoryWrite(env, items, targets = 'all') {
  const targetList = targets === 'all' ? ['d1', 'vectorize', 'zilliz', 'kg'] : (Array.isArray(targets) ? targets : [targets]);
  const counts = { d1: 0, vectorize: 0, zilliz: 0, kg: 0 };
  const errors = [];

  for (const item of items) {
    if (!item.id) item.id = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!item.name) item.name = item.id;
    if (!item.type) item.type = 'concept';
    const text = `${item.name}: ${(item.summary || '').substring(0, 2000)}`;

    // Embed once, reuse
    let embedding = null;
    try {
      const emb = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text.slice(0, 500)] });
      embedding = emb?.data?.[0] || null;
    } catch (e) {
      errors.push(`Embed ${item.id}: ${e.message}`);
    }

    // D1
    if (targetList.includes('d1')) {
      try {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO entities (id, name, entity_type, summary, source, trust_level, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'unified-memory', 3, datetime('now'), datetime('now'))`
        ).bind(item.id, item.name, item.type, (item.summary || '').substring(0, 5000)).run();
        counts.d1++;
      } catch (e) { errors.push(`D1 ${item.id}: ${e.message}`); }
    }

    // Vectorize
    if (targetList.includes('vectorize') && embedding) {
      try {
        await env.VECTORIZE.upsert([{
          id: item.id,
          values: embedding,
          metadata: { name: item.name.slice(0, 200), type: item.type.slice(0, 50), summary: (item.summary || '').slice(0, 500) }
        }]);
        counts.vectorize++;
      } catch (e) { errors.push(`Vec ${item.id}: ${e.message}`); }
    }

    // Zilliz via bridge
    if (targetList.includes('zilliz')) {
      try {
        const resp = await fetch(`${ZILLIZ_BRIDGE_URL}/v1/insert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.FLEET_GATEWAY_TOKEN || FLEET_AUTH_TOKEN}`
          },
          body: JSON.stringify({ data: [{ id: item.id, name: item.name, type: item.type, summary: item.summary }] }),
          signal: AbortSignal.timeout(10000)
        });
        const json = await resp.json();
        if (json.ok) counts.zilliz += json.total || 1;
        else errors.push(`Zilliz ${item.id}: ${json.error || 'unknown'}`);
      } catch (e) { errors.push(`Zilliz ${item.id}: ${e.message}`); }
    }

    // KG
    if (targetList.includes('kg')) {
      try {
        const resp = await fetch(`${KG_URL}/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.KG_TOKEN || ''}`
          },
          body: JSON.stringify({
            entities: [{ id: item.id, name: item.name, type: item.type, summary: item.summary, properties: item.properties || {} }],
            source: 'unified-memory'
          }),
          signal: AbortSignal.timeout(8000)
        });
        const json = await resp.json();
        if (json.ok) counts.kg++;
      } catch (e) { errors.push(`KG ${item.id}: ${e.message}`); }
    }
  }

  return { ok: errors.length === 0, written: counts, total: items.length, errors: errors.length > 0 ? errors : undefined };
}

// ── Router ──
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Health (no auth)
    if (path === '/health' || path === '/') {
      return jsonResponse({
        service: 'fleet-gateway',
        version: env.FLEET_VERSION || '1.0.0',
        workers: Object.keys(FLEET_WORKERS).length,
        capabilities: ['dispatch', 'discuss', 'memory-save', 'memory-query', 'memory-write', 'fleet-status'],
        timestamp: new Date().toISOString(),
      });
    }

    // A2A Agent Card (no auth)
    if (path === '/.well-known/agent.json') {
      return jsonResponse({
        name: 'fleet-gateway',
        description: 'Central command gateway for OpenClaw CF Worker fleet. Dispatch tasks, run multi-AI discussions, save to unified memory.',
        version: '1.0.0',
        capabilities: ['dispatch', 'discuss', 'memory-save', 'memory-query', 'memory-write', 'fleet-status'],
        endpoints: {
          dispatch: '/v1/dispatch',
          discuss: '/v1/discuss',
          memory_save: '/v1/memory/save',
          memory_query: '/v1/memory/query',
          memory_write: '/v1/memory/write',
          status: '/v1/fleet/status',
        },
        auth: 'Bearer token',
      });
    }

    // Auth required below
    if (!auth(request, env)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // POST /v1/dispatch — send task to a specific Worker
    if (path === '/v1/dispatch' && request.method === 'POST') {
      const body = await request.json();
      const { worker, payload } = body;
      if (!worker) return jsonResponse({ error: 'Missing worker name' }, 400);
      const result = await dispatch(worker, payload || body, env);
      return jsonResponse({ worker, result });
    }

    // POST /v1/discuss — multi-AI discussion via Workers AI
    if (path === '/v1/discuss' && request.method === 'POST') {
      const body = await request.json();
      const { topic, models } = body;
      if (!topic) return jsonResponse({ error: 'Missing topic' }, 400);
      const startTime = Date.now();
      const responses = await aiDiscuss(env, topic, models || []);
      const duration = Date.now() - startTime;

      // Auto-save discussion to memory
      const saveResult = await memorySave(env, [{
        id: `discuss-${Date.now()}`,
        name: `Discussion: ${topic.substring(0, 60)}`,
        type: 'multi_brain_discussion',
        summary: `Topic: ${topic}\nResponses: ${responses.filter(r => r.ok).length}/${responses.length}\n` +
          responses.filter(r => r.ok).map(r => `[${r.model}]: ${(r.response || '').substring(0, 150)}`).join('\n'),
      }]);

      return jsonResponse({ topic, responses, duration_ms: duration, memory: saveResult });
    }

    // POST /v1/memory/save — unified memory save (KG + Vectorize)
    if (path === '/v1/memory/save' && request.method === 'POST') {
      const body = await request.json();
      const items = body.items || (body.name ? [body] : []);
      if (items.length === 0) return jsonResponse({ error: 'No items to save' }, 400);
      const result = await memorySave(env, items);
      return jsonResponse({ ok: true, ...result, total: items.length });
    }

    // POST /v1/memory/query — unified multi-source query with RRF fusion
    if (path === '/v1/memory/query' && request.method === 'POST') {
      const body = await request.json();
      if (!body.query) return jsonResponse({ error: 'Missing query' }, 400);
      const result = await memoryQuery(env, body.query, body.sources, body.limit || 10);
      return jsonResponse(result);
    }

    // POST /v1/memory/write — unified multi-target write
    if (path === '/v1/memory/write' && request.method === 'POST') {
      const body = await request.json();
      const items = body.items || (body.name ? [body] : []);
      if (items.length === 0) return jsonResponse({ error: 'No items to write' }, 400);
      const result = await memoryWrite(env, items, body.targets || 'all');
      return jsonResponse(result);
    }

    // GET /v1/fleet/status — check all Workers
    if (path === '/v1/fleet/status') {
      const status = await fleetStatus(env);
      const alive = status.filter(s => s.ok).length;
      return jsonResponse({ total: status.length, alive, workers: status });
    }

    return jsonResponse({ error: 'Not found', routes: ['/v1/dispatch', '/v1/discuss', '/v1/memory/save', '/v1/memory/query', '/v1/memory/write', '/v1/fleet/status'] }, 404);
  },

  // ── Cron: Auto-save fleet state every 15 minutes ──
  async scheduled(event, env, ctx) {
    const timestamp = new Date().toISOString();
    console.log(`[FleetGateway] Cron auto-save triggered at ${timestamp}`);

    try {
      // 1. Collect fleet health snapshot
      const healthChecks = Object.entries(FLEET_WORKERS).map(async ([name, info]) => {
        try {
          const resp = await fetch(info.url, { method: 'GET', signal: AbortSignal.timeout(5000) });
          return { name, status: resp.status, ok: resp.ok };
        } catch {
          return { name, status: 0, ok: false };
        }
      });
      const health = await Promise.all(healthChecks);
      const alive = health.filter(h => h.ok).length;
      const down = health.filter(h => !h.ok).map(h => h.name);

      // 2. Save fleet snapshot to D1
      try {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO entities (id, name, entity_type, summary, source, trust_level, updated_at)
           VALUES (?, ?, ?, ?, 'fleet-gateway-cron', 2, datetime('now'))`
        ).bind(
          'fleet-snapshot-latest',
          'Fleet Health Snapshot',
          'fleet_snapshot',
          `${timestamp}: ${alive}/${health.length} alive. Down: ${down.length > 0 ? down.join(', ') : 'none'}`
        ).run();
      } catch (e) {
        console.error('[FleetGateway] D1 snapshot error:', e.message);
      }

      // 3. Save to Vectorize (embeddings for semantic search of fleet history)
      try {
        const text = `Fleet health ${timestamp}: ${alive} of ${health.length} workers alive. Down workers: ${down.join(', ') || 'none'}`;
        const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
        if (embedding.data && embedding.data[0]) {
          await env.VECTORIZE.upsert([{
            id: `fleet-snap-${Date.now()}`,
            values: embedding.data[0],
            metadata: { type: 'fleet_snapshot', alive, total: health.length, down: down.join(','), timestamp },
          }]);
        }
      } catch (e) {
        console.error('[FleetGateway] Vectorize snapshot error:', e.message);
      }

      // 4. Check recent task results from D1 and consolidate
      try {
        const recentTasks = await env.DB.prepare(
          `SELECT * FROM fleet_tasks WHERE status = 'completed' AND updated_at > datetime('now', '-15 minutes') LIMIT 10`
        ).all();

        if (recentTasks.results && recentTasks.results.length > 0) {
          for (const task of recentTasks.results) {
            const text = `Task ${task.id}: ${(task.action || '').substring(0, 200)} - ${(task.result || '').substring(0, 300)}`;
            const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
            if (embedding.data && embedding.data[0]) {
              await env.VECTORIZE.upsert([{
                id: `task-${task.id}`,
                values: embedding.data[0],
                metadata: { type: 'fleet_task', action: (task.action || '').substring(0, 100), timestamp },
              }]);
            }
          }
          console.log(`[FleetGateway] Consolidated ${recentTasks.results.length} recent tasks to Vectorize`);
        }
      } catch (e) {
        // fleet_tasks table may not exist, that's ok
        console.log('[FleetGateway] No recent tasks to consolidate');
      }

      console.log(`[FleetGateway] Cron complete: ${alive}/${health.length} alive, ${down.length} down`);
    } catch (e) {
      console.error('[FleetGateway] Cron error:', e.message);
    }
  },
};
