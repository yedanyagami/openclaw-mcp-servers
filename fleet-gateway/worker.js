// ============================================================
// Fleet Gateway v2.0 — Unified AGI Memory + Search + Dispatch
// Sources: D1 + Vectorize + Zilliz×3 + KG + Neo4j + Mem0 + Brave + Neon + Tavily
// 11-source RRF fusion + Cohere rerank
// ============================================================

// ── AI Gateway External Provider Routing ──
// Route external LLM calls through CF AI Gateway for unified billing + caching + fallback
const AI_GATEWAY_BASE = 'https://gateway.ai.cloudflare.com/v1';

async function aiGatewayCall(env, provider, model, messages, opts = {}) {
  const accountId = env.CF_ACCOUNT_ID || '9c7d2957';
  const gatewayId = 'openclaw-ai-gateway';
  const providerMap = {
    'groq': { path: 'groq', authKey: 'GROQ_API_KEY' },
    'openrouter': { path: 'openrouter', authKey: 'OPENROUTER_API_KEY' },
    'workers-ai': { path: 'workers-ai', authKey: null }, // Uses AI binding instead
  };
  const p = providerMap[provider];
  if (!p) return { error: `Unknown provider: ${provider}` };

  const url = `${AI_GATEWAY_BASE}/${accountId}/${gatewayId}/${p.path}/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (p.authKey && env[p.authKey]) headers['Authorization'] = `Bearer ${env[p.authKey]}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, max_tokens: opts.max_tokens || 512, ...opts }),
      signal: AbortSignal.timeout(opts.timeout || 30000),
    });
    if (!resp.ok) return { error: `${provider} ${resp.status}: ${await resp.text()}` };
    return await resp.json();
  } catch (e) {
    return { error: `${provider}: ${e.message}` };
  }
}

// ── LLM Fallback Chain (Workers AI → Groq → OpenRouter) ──
async function llmWithFallback(env, messages, opts = {}) {
  // Try Workers AI first (free neurons, cached via AI Gateway)
  try {
    const model = opts.model || MODELS.fast;
    const result = await env.AI.run(model, { messages, max_tokens: opts.max_tokens || 512 });
    if (result.response) return { response: result.response, provider: 'workers-ai', model };
  } catch (e) { /* fallback */ }

  // Try Groq (fast, free tier)
  if (env.GROQ_API_KEY) {
    const result = await aiGatewayCall(env, 'groq', 'llama-3.3-70b-versatile', messages, opts);
    if (!result.error && result.choices?.[0]) return { response: result.choices[0].message.content, provider: 'groq', model: 'llama-3.3-70b-versatile' };
  }

  // Try OpenRouter (wide model selection)
  if (env.OPENROUTER_API_KEY) {
    const result = await aiGatewayCall(env, 'openrouter', 'meta-llama/llama-3.3-70b-instruct', messages, opts);
    if (!result.error && result.choices?.[0]) return { response: result.choices[0].message.content, provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' };
  }

  return { error: 'All LLM providers failed' };
}

// ── Rate Limiting ──
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // max requests per window per IP
const rateLimitMap = new Map(); // IP -> { count, resetAt }
let rateLimitCleanupTimer = 0;

function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || 'unknown';
  const now = Date.now();

  // Periodic cleanup of expired entries
  if (now > rateLimitCleanupTimer) {
    rateLimitCleanupTimer = now + RATE_LIMIT_WINDOW_MS;
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// ── Known fleet Workers (with dispatch paths for POST) ──
const FLEET_WORKERS = {
  'orchestrator':       { url: 'https://yedan-orchestrator.yagami8095.workers.dev', cron: '*/2', dispatch: '/run' },
  'health-commander':   { url: 'https://yedan-health-commander.yagami8095.workers.dev', cron: '*/3', dispatch: '/run' },
  'cloud-executor':     { url: 'https://yedan-cloud-executor.yagami8095.workers.dev', cron: '*/5', dispatch: '/run' },
  'revenue-sentinel':   { url: 'https://yedan-revenue-sentinel.yagami8095.workers.dev', cron: '*/10', dispatch: '/run' },
  'intel-ops':          { url: 'https://yedan-intel-ops.yagami8095.workers.dev', cron: '*/15', dispatch: '/run' },
  'content-engine':     { url: 'https://yedan-content-engine.yagami8095.workers.dev', cron: '*/30', dispatch: '/run' },
  'graph-rag':          { url: 'https://yedan-graph-rag.yagami8095.workers.dev', cron: '*/6h', dispatch: '/query' },
  'keepalive':          { url: 'https://yedan-keepalive.yagami8095.workers.dev', cron: '*/14', dispatch: '/run' },
  'product-store':      { url: 'https://product-store.yagami8095.workers.dev', dispatch: '/' },
  'x402-gateway':       { url: 'https://openclaw-x402-gateway.yagami8095.workers.dev', dispatch: '/' },
  'json-toolkit':       { url: 'https://json-toolkit-mcp.yagami8095.workers.dev', dispatch: '/' },
  'regex-engine':       { url: 'https://regex-engine-mcp.yagami8095.workers.dev', dispatch: '/' },
  'prompt-enhancer':    { url: 'https://prompt-enhancer-mcp.yagami8095.workers.dev', dispatch: '/' },
  'intel-api':          { url: 'https://openclaw-intel-api.yagami8095.workers.dev', dispatch: '/' },
  'intel-mcp':          { url: 'https://openclaw-intel-mcp.yagami8095.workers.dev', dispatch: '/' },
  'fortune-api':        { url: 'https://fortune-api.yagami8095.workers.dev', dispatch: '/' },
  'notion-warroom':     { url: 'https://notion-warroom.yagami8095.workers.dev', dispatch: '/' },
  'kpi-dashboard':      { url: 'https://kpi-dashboard.yagami8095.workers.dev', dispatch: '/' },
  'groq-lb':            { url: 'https://groq-lb.yagami8095.workers.dev', dispatch: '/v1/chat/completions' },
  'zilliz-bridge':      { url: 'https://zilliz-bridge.yagami8095.workers.dev', dispatch: '/search' },
  'github-models':      { url: 'https://github-models-proxy.yagami8095.workers.dev', dispatch: '/v1/chat/completions' },
  'xai-proxy':          { url: 'https://xai-proxy.yagami8095.workers.dev', dispatch: '/v1/chat/completions' },
};

// ── Auth ──
function auth(request, env) {
  if (!env.FLEET_GATEWAY_TOKEN) return null; // not configured
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token || token !== env.FLEET_GATEWAY_TOKEN) return false;
  return true;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// ── AI Gateway Config ──
// AI Gateway: https://gateway.ai.cloudflare.com/v1/{account_id}/openclaw-ai-gateway
// Configured via wrangler.toml [ai] gateway — all env.AI.run() calls auto-route through it
// Benefits: caching, rate limiting, fallback, cost tracking, unified analytics

// ── Model Tiers ──
const MODELS = {
  // Tier 1: Complex reasoning (256k context, ideal for >32k token tasks)
  complex: '@cf/moonshotai/kimi-k2.5',
  // Tier 2: Fast general purpose
  fast: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  // Tier 3: Code specialist
  code: '@cf/qwen/qwen2.5-coder-32b-instruct',
  // Tier 4: Lightweight
  light: '@cf/google/gemma-3-12b-it',
};

// ── Workers AI Discussion ──
async function aiDiscuss(env, topic, models = []) {
  const defaultModels = [
    MODELS.fast,
    MODELS.code,
    MODELS.complex,
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

// ── Service Binding Map (Worker name → env binding name) ──
const SERVICE_BINDING_MAP = {
  'graph-rag': 'GRAPH_RAG',
  'orchestrator': 'ORCHESTRATOR',
  'cloud-executor': 'CLOUD_EXECUTOR',
  'intel-ops': 'INTEL_OPS',
  'health-commander': 'HEALTH_COMMANDER',
  'zilliz-bridge': 'ZILLIZ_BRIDGE',
  'groq-lb': 'GROQ_LB',
};

// ── Dispatch to fleet Worker (Service Binding preferred, HTTP fallback) ──
async function dispatch(workerName, payload, env) {
  const worker = FLEET_WORKERS[workerName];
  if (!worker) return { error: `Unknown worker: ${workerName}`, known: Object.keys(FLEET_WORKERS) };

  const dispatchPath = worker.dispatch || '/';

  // Try Service Binding first (zero-overhead Worker-to-Worker call)
  const bindingName = SERVICE_BINDING_MAP[workerName];
  if (bindingName && env[bindingName]) {
    try {
      const resp = await env[bindingName].fetch(new Request(`http://internal${dispatchPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }));
      const data = await resp.text();
      try { return { ...JSON.parse(data), _via: 'service-binding' }; }
      catch { return { raw: data.substring(0, 1000), _via: 'service-binding' }; }
    } catch (e) {
      // Fall through to HTTP
    }
  }

  // HTTP fallback (for Workers without Service Binding)
  try {
    const dispatchUrl = `${worker.url}${dispatchPath}`;
    const resp = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.FLEET_AUTH_TOKEN || ''}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.text();
    try { return { ...JSON.parse(data), _via: 'http' }; }
    catch { return { raw: data.substring(0, 1000), _via: 'http' }; }
  } catch (e) {
    return { error: e.message };
  }
}

// ── Fleet Status ──
// Note: Many workers return 404/405 on GET / (they only handle POST or specific paths).
// Any HTTP response = alive. Only timeout/network error = down.
async function fleetStatus(env) {
  const checks = Object.entries(FLEET_WORKERS).map(async ([name, info]) => {
    // Try Service Binding first for bound Workers (faster, no TLS overhead)
    const bindingName = SERVICE_BINDING_MAP[name];
    if (bindingName && env[bindingName]) {
      try {
        const resp = await env[bindingName].fetch(new Request('http://internal/health', { method: 'GET' }));
        return { name, url: info.url, status: resp.status, alive: true, ok: resp.ok, cron: info.cron || null, via: 'binding' };
      } catch (e) {
        // Fall through to HTTP
      }
    }
    // HTTP fallback
    const healthUrl = info.health || info.url;
    try {
      const resp = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return { name, url: info.url, status: resp.status, alive: true, ok: resp.ok, cron: info.cron || null, via: 'http' };
    } catch (e) {
      return { name, url: info.url, status: 0, alive: false, ok: false, error: e.message, cron: info.cron || null, via: 'http' };
    }
  });

  return Promise.all(checks);
}

// ── Unified Memory Query (11-source: D1+Vectorize+Zilliz×3+KG+Neo4j+Mem0+Brave+Neon+Tavily) ──
// Service Binding URLs (used as fallback when bindings unavailable)
const ZILLIZ_BRIDGE_URL = 'https://zilliz-bridge.yagami8095.workers.dev';
const KG_URL = 'https://yedan-graph-rag.yagami8095.workers.dev';

// Helper: fetch via Service Binding if available, else HTTP
function bindingOrFetch(env, bindingName, httpUrl, path, opts) {
  if (env[bindingName]) {
    return env[bindingName].fetch(new Request(`http://internal${path}`, opts));
  }
  return fetch(`${httpUrl}${path}`, opts);
}
const NEO4J_URL = 'https://b43cdce1.databases.neo4j.io/db/b43cdce1/query/v2';
const MEM0_URL = 'https://api.mem0.ai/v1';

async function memoryQuery(env, query, sources, limit = 10) {
  const startTime = Date.now();
  // Default sources: skip Zilliz and KG (cause 1042 CPU timeout on free plan when combined with 7+ other sources)
  // Users can explicitly request them via sources parameter
  const allSources = sources || ['d1', 'vectorize', 'neo4j', 'mem0', 'brave', 'neon', 'tavily'];
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
        // FTS5 is built on kg_entities (915 rows), not entities table
        const { results: rows } = await env.DB.prepare(
          `SELECT e.id, e.name, e.type, e.summary, e.confidence, e.updated_at
           FROM kg_entities_fts fts
           JOIN kg_entities e ON e.rowid = fts.rowid
           WHERE kg_entities_fts MATCH ?
           ORDER BY bm25(kg_entities_fts, 10.0, 5.0, 1.0)
           LIMIT ?`
        ).bind(sanitized, limit * 2).all();
        results.d1 = (rows || []).map((r, i) => ({ ...r, source: 'd1', rank: i }));
      } catch (e) {
        // FTS5 fallback — try both tables with LIKE
        try {
          const { results: rows } = await env.DB.prepare(
            `SELECT id, name, type, summary, confidence, updated_at
             FROM kg_entities WHERE name LIKE ? OR summary LIKE ?
             UNION ALL
             SELECT id, name, entity_type as type, summary, trust_level as confidence, updated_at
             FROM entities WHERE name LIKE ? OR summary LIKE ?
             LIMIT ?`
          ).bind(`%${query.slice(0, 50)}%`, `%${query.slice(0, 50)}%`, `%${query.slice(0, 50)}%`, `%${query.slice(0, 50)}%`, limit * 2).all();
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

  // Zilliz clusters via zilliz-bridge (Service Binding or HTTP)
  for (const cluster of ['agents', 'intel', 'products']) {
    if (allSources.includes(`zilliz-${cluster}`)) {
      tasks.push((async () => {
        try {
          const resp = await bindingOrFetch(env, 'ZILLIZ_BRIDGE', ZILLIZ_BRIDGE_URL, '/v1/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.FLEET_GATEWAY_TOKEN || ''}`
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

  // KG graph query (Service Binding or HTTP)
  if (allSources.includes('kg')) {
    tasks.push((async () => {
      try {
        const resp = await bindingOrFetch(env, 'GRAPH_RAG', KG_URL, '/query', {
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

  // Neo4j AuraDB graph search
  if (allSources.includes('neo4j') && env.NEO4J_AUTH) {
    tasks.push((async () => {
      try {
        const resp = await fetch(NEO4J_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${env.NEO4J_AUTH}`,
          },
          body: JSON.stringify({
            statement: `MATCH (n) WHERE toLower(n.name) CONTAINS toLower($q) OR toLower(n.summary) CONTAINS toLower($q) RETURN n.id as id, n.name as name, labels(n)[0] as type, n.summary as summary LIMIT $limit`,
            parameters: { q: query.slice(0, 200), limit: limit * 2 }
          }),
          signal: AbortSignal.timeout(8000)
        });
        const json = await resp.json();
        const rows = json.data?.values || [];
        results.neo4j = rows.map((r, i) => ({
          id: r[0] || `neo4j-${i}`, name: r[1] || '', type: r[2] || 'entity',
          summary: r[3] || '', source: 'neo4j', rank: i
        }));
      } catch (e) {
        errors.push(`Neo4j: ${e.message}`);
      }
    })());
  }

  // Mem0.ai cross-session memory
  if (allSources.includes('mem0') && env.MEM0_API_KEY) {
    tasks.push((async () => {
      try {
        const resp = await fetch(`${MEM0_URL}/memories/search/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${env.MEM0_API_KEY}`,
          },
          body: JSON.stringify({ query: query.slice(0, 500), user_id: 'openclaw-agi', limit }),
          signal: AbortSignal.timeout(8000)
        });
        const json = await resp.json();
        const items = Array.isArray(json) ? json : (json.results || json.memories || []);
        results.mem0 = items.map((r, i) => ({
          id: r.id || `mem0-${i}`, name: r.memory || r.text || r.content || '',
          type: 'memory', summary: r.memory || r.text || r.content || '',
          score: r.score || 0, source: 'mem0', rank: i
        }));
      } catch (e) {
        errors.push(`Mem0: ${e.message}`);
      }
    })());
  }

  // Brave Search (web knowledge)
  if (allSources.includes('brave') && env.BRAVE_API_KEY) {
    tasks.push((async () => {
      try {
        const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query.slice(0, 300))}&count=${Math.min(limit, 10)}`, {
          headers: { 'X-Subscription-Token': env.BRAVE_API_KEY, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000)
        });
        const json = await resp.json();
        results.brave = (json.web?.results || []).map((r, i) => ({
          id: `brave-${i}`, name: r.title, type: 'web_result',
          summary: r.description?.slice(0, 300), source: 'brave',
          url: r.url, rank: i
        }));
      } catch (e) {
        errors.push(`Brave: ${e.message}`);
      }
    })());
  }

  // Neon Postgres via Hyperdrive (connection pooling + edge caching, up to 17x faster)
  // Falls back to raw HTTP if Hyperdrive binding not available
  if (allSources.includes('neon') && (env.NEON || env.NEON_CONNECTION_STRING)) {
    tasks.push((async () => {
      try {
        let connStr;
        if (env.NEON) {
          // Hyperdrive binding — connection string auto-rewritten to edge proxy
          connStr = env.NEON.connectionString;
        } else {
          connStr = env.NEON_CONNECTION_STRING + (env.NEON_CONNECTION_STRING.includes('sslmode') ? '' : '?sslmode=require');
        }
        const connParts = connStr.match(/postgresql:\/\/[^@]+@([^/?]+)/);
        if (connParts) {
          const host = connParts[1];
          const resp = await fetch(`https://${host}/sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Neon-Connection-String': connStr,
            },
            body: JSON.stringify({
              query: `SELECT id::text, name, type, summary FROM entities WHERE name ILIKE $1 OR summary ILIKE $1
                      UNION ALL
                      SELECT id::text, category as name, 'memory' as type, data::text as summary FROM yedan_memory WHERE category ILIKE $1 OR data::text ILIKE $1
                      LIMIT $2`,
              params: [`%${query.slice(0, 100)}%`, limit * 2]
            }),
            signal: AbortSignal.timeout(8000)
          });
          const json = await resp.json();
          results.neon = (json.rows || []).map((r, i) => ({
            ...r, source: env.NEON ? 'neon+hyperdrive' : 'neon', rank: i
          }));
        }
      } catch (e) {
        errors.push(`Neon: ${e.message}`);
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

// ── Unified Memory Write (D1 + Vectorize + Zilliz + KG + Neo4j + Mem0 + Neon) ──
async function memoryWrite(env, items, targets = 'all') {
  const targetList = targets === 'all' ? ['d1', 'vectorize', 'zilliz', 'kg', 'neo4j', 'mem0', 'neon'] : (Array.isArray(targets) ? targets : [targets]);
  const counts = { d1: 0, vectorize: 0, zilliz: 0, kg: 0, neo4j: 0, mem0: 0, neon: 0 };
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

    // Zilliz via bridge (Service Binding or HTTP)
    if (targetList.includes('zilliz')) {
      try {
        const resp = await bindingOrFetch(env, 'ZILLIZ_BRIDGE', ZILLIZ_BRIDGE_URL, '/v1/insert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.FLEET_GATEWAY_TOKEN || ''}`
          },
          body: JSON.stringify({ data: [{ id: item.id, name: item.name, type: item.type, summary: item.summary }] }),
          signal: AbortSignal.timeout(10000)
        });
        const json = await resp.json();
        if (json.ok) counts.zilliz += json.total || 1;
        else errors.push(`Zilliz ${item.id}: ${json.error || 'unknown'}`);
      } catch (e) { errors.push(`Zilliz ${item.id}: ${e.message}`); }
    }

    // KG (Service Binding or HTTP)
    if (targetList.includes('kg')) {
      try {
        const resp = await bindingOrFetch(env, 'GRAPH_RAG', KG_URL, '/ingest', {
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

    // Neo4j AuraDB
    if (targetList.includes('neo4j') && env.NEO4J_AUTH) {
      try {
        const resp = await fetch(NEO4J_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${env.NEO4J_AUTH}`,
          },
          body: JSON.stringify({
            statement: `MERGE (n:Entity {id: $id}) SET n.name = $name, n.type = $type, n.summary = $summary, n.source = 'unified-memory', n.updated_at = datetime()`,
            parameters: { id: item.id, name: item.name, type: item.type, summary: (item.summary || '').slice(0, 5000) }
          }),
          signal: AbortSignal.timeout(8000)
        });
        const json = await resp.json();
        if (!json.errors || json.errors.length === 0) counts.neo4j++;
      } catch (e) { errors.push(`Neo4j ${item.id}: ${e.message}`); }
    }

    // Mem0.ai cross-session memory
    if (targetList.includes('mem0') && env.MEM0_API_KEY) {
      try {
        const resp = await fetch(`${MEM0_URL}/memories/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${env.MEM0_API_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `${item.name}: ${(item.summary || '').slice(0, 2000)}` }],
            user_id: 'openclaw-agi',
            metadata: { id: item.id, type: item.type, source: 'unified-memory' }
          }),
          signal: AbortSignal.timeout(8000)
        });
        const json = await resp.json();
        if (json.id || json.results || (Array.isArray(json) && json.length > 0)) counts.mem0++;
      } catch (e) { errors.push(`Mem0 ${item.id}: ${e.message}`); }
    }

    // Neon Postgres via Hyperdrive (or raw HTTP fallback)
    if (targetList.includes('neon') && (env.NEON || env.NEON_CONNECTION_STRING)) {
      try {
        let connStr;
        if (env.NEON) {
          connStr = env.NEON.connectionString;
        } else {
          connStr = env.NEON_CONNECTION_STRING + (env.NEON_CONNECTION_STRING.includes('sslmode') ? '' : '?sslmode=require');
        }
        const connParts = connStr.match(/postgresql:\/\/[^@]+@([^/?]+)/);
        if (connParts) {
          const host = connParts[1];
          const resp = await fetch(`https://${host}/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': connStr },
            body: JSON.stringify({
              query: `INSERT INTO entities (id, name, type, summary, source, confidence, updated_at) VALUES ($1, $2, $3, $4, 'unified-memory', 1.0, NOW()) ON CONFLICT (id) DO UPDATE SET name=$2, type=$3, summary=$4, source='unified-memory', updated_at=NOW()`,
              params: [item.id, item.name, item.type, (item.summary || '').slice(0, 5000)]
            }),
            signal: AbortSignal.timeout(8000)
          });
          const json = await resp.json();
          if (!json.error) counts.neon++;
        }
      } catch (e) { errors.push(`Neon ${item.id}: ${e.message}`); }
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
        capabilities: ['dispatch', 'discuss', 'llm', 'memory-save', 'memory-query', 'memory-write', 'fleet-status'],
        ai_gateway: 'openclaw-ai-gateway',
        models: MODELS,
        timestamp: new Date().toISOString(),
      });
    }

    // A2A Agent Card (no auth)
    if (path === '/.well-known/agent.json') {
      return jsonResponse({
        name: 'fleet-gateway',
        description: 'Central command gateway for OpenClaw CF Worker fleet. Dispatch tasks, run multi-AI discussions, save to unified memory.',
        version: '1.0.0',
        capabilities: ['dispatch', 'discuss', 'llm', 'memory-save', 'memory-query', 'memory-write', 'fleet-status'],
        endpoints: {
          dispatch: '/v1/dispatch',
          discuss: '/v1/discuss',
          llm: '/v1/llm',
          memory_save: '/v1/memory/save',
          memory_query: '/v1/memory/query',
          memory_write: '/v1/memory/write',
          status: '/v1/fleet/status',
        },
        auth: 'Bearer token',
      });
    }

    // Auth required below
    const authResult = auth(request, env);
    if (authResult === null) {
      return jsonResponse({ error: 'Auth not configured' }, 500);
    }
    if (!authResult) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Rate limiting on sensitive endpoints
    const RATE_LIMITED_PATHS = ['/v1/memory/query', '/v1/dispatch', '/v1/discuss'];
    if (RATE_LIMITED_PATHS.includes(path) && !checkRateLimit(request)) {
      return jsonResponse({ error: 'Rate limit exceeded. Max 60 requests per minute.' }, 429);
    }

    // POST /v1/llm — LLM call with AI Gateway fallback chain
    if (path === '/v1/llm' && request.method === 'POST') {
      const body = await request.json();
      const { messages, model, max_tokens } = body;
      if (!messages || !Array.isArray(messages)) return jsonResponse({ error: 'Missing messages array' }, 400);
      const startTime = Date.now();
      const result = await llmWithFallback(env, messages, { model, max_tokens: max_tokens || 512 });
      return jsonResponse({ ...result, latency_ms: Date.now() - startTime });
    }

    // POST /v1/queue — enqueue task for reliable async processing
    if (path === '/v1/queue' && request.method === 'POST') {
      if (!env.TASK_QUEUE) return jsonResponse({ error: 'Queue not configured' }, 503);
      const body = await request.json();
      const { worker, payload, priority } = body;
      if (!worker) return jsonResponse({ error: 'Missing worker name' }, 400);
      try {
        await env.TASK_QUEUE.send({
          type: 'dispatch',
          target: worker,
          payload: payload || body,
          priority: priority || 'normal',
          created: Date.now(),
          source: 'fleet-gateway',
        });
        return jsonResponse({ ok: true, queued: worker, priority: priority || 'normal' });
      } catch (e) {
        return jsonResponse({ error: `Queue send failed: ${e.message}` }, 500);
      }
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
      const alive = status.filter(s => s.alive).length;
      const healthy = status.filter(s => s.ok).length;
      return jsonResponse({ total: status.length, alive, healthy, workers: status });
    }

    return jsonResponse({ error: 'Not found', routes: ['/v1/dispatch', '/v1/queue', '/v1/discuss', '/v1/llm', '/v1/memory/save', '/v1/memory/query', '/v1/memory/write', '/v1/fleet/status'] }, 404);
  },

  // ── Cron: Auto-save fleet state every 15 minutes ──
  async scheduled(event, env, ctx) {
    const timestamp = new Date().toISOString();
    console.log(`[FleetGateway] Cron auto-save triggered at ${timestamp}`);

    try {
      // 1. Collect fleet health snapshot
      const healthChecks = Object.entries(FLEET_WORKERS).map(async ([name, info]) => {
        try {
          const resp = await fetch(info.health || info.url, { method: 'GET', signal: AbortSignal.timeout(5000) });
          return { name, status: resp.status };
        } catch {
          return { name, status: 0 };
        }
      });
      const health = await Promise.all(healthChecks);
      // Any HTTP response = alive (even 404/405), only network error = down
      const alive = health.filter(h => h.status > 0).length;
      const down = health.filter(h => h.status === 0).map(h => h.name);

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
