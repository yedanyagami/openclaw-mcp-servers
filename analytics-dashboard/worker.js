/**
 * OpenClaw Analytics Dashboard
 * Aggregates KV metrics: rate limits, attribution, cache, defense, finops
 * GET /api/stats — full KV metrics scan
 * GET /api/usage — today's usage per server
 * GET /api/refs — attribution tracking summary
 * GET / — HTML dashboard
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SERVERS = [
  { key: 'json', name: 'JSON Toolkit', limit: 20 },
  { key: 'regex', name: 'Regex Engine', limit: 20 },
  { key: 'color', name: 'Color Palette', limit: 25 },
  { key: 'timestamp', name: 'Timestamp Converter', limit: 30 },
  { key: 'prompt', name: 'Prompt Enhancer', limit: 10 },
  { key: 'agentforge', name: 'AgentForge Compare', limit: 10 },
  { key: 'moltbook', name: 'MoltBook Publisher', limit: 5 },
  { key: 'fortune', name: 'Fortune MCP', limit: 50 },
  { key: 'intel', name: 'Intel MCP', limit: 20 },
  { key: 'fortune-api', name: 'Fortune API', limit: 50 },
  { key: 'product', name: 'Product Store', limit: 0 },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (url.pathname === '/api/stats') return await handleStats(env);
      if (url.pathname === '/api/usage') return await handleUsage(env);
      if (url.pathname === '/api/refs') return await handleRefs(env);
      if (url.pathname === '/') return handleDashboard();
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// GET /api/stats — comprehensive metrics
async function handleStats(env) {
  const kv = env.KV;
  const today = new Date().toISOString().split('T')[0];

  // Scan KV prefixes
  const [rlKeys, refKeys, cacheKeys, defenseKeys, finopsKeys] = await Promise.all([
    listPrefix(kv, `rl:`),
    listPrefix(kv, `ref:`),
    listPrefix(kv, `cache:`),
    listPrefix(kv, `defense:`),
    listPrefix(kv, `finops:`),
  ]);

  // Count today's rate limit keys
  const todayRL = rlKeys.filter(k => k.name.includes(today));

  // Parse ref keys into source counts
  const refSummary = {};
  for (const k of refKeys) {
    // format: ref:{server}:{source}:{date}
    const parts = k.name.split(':');
    const source = parts[2] || 'unknown';
    refSummary[source] = (refSummary[source] || 0) + 1;
  }

  // Cache stats by server
  const cacheSummary = {};
  for (const k of cacheKeys) {
    const parts = k.name.split(':');
    const server = parts[1] || 'unknown';
    cacheSummary[server] = (cacheSummary[server] || 0) + 1;
  }

  // Defense events
  const defenseSummary = {};
  for (const k of defenseKeys) {
    const parts = k.name.split(':');
    const type = parts[1] || 'unknown';
    defenseSummary[type] = (defenseSummary[type] || 0) + 1;
  }

  return json({
    timestamp: new Date().toISOString(),
    date: today,
    rate_limits: {
      total_keys: rlKeys.length,
      today_active: todayRL.length,
      unique_ips_today: new Set(todayRL.map(k => {
        const parts = k.name.split(':');
        return parts[2] || '';
      })).size,
    },
    attribution: {
      total_keys: refKeys.length,
      by_source: refSummary,
    },
    cache: {
      total_entries: cacheKeys.length,
      by_server: cacheSummary,
    },
    defense: {
      total_events: defenseKeys.length,
      by_type: defenseSummary,
    },
    finops: {
      total_keys: finopsKeys.length,
    },
  });
}

// GET /api/usage — today's usage per server
async function handleUsage(env) {
  const kv = env.KV;
  const today = new Date().toISOString().split('T')[0];

  const usage = {};

  for (const server of SERVERS) {
    // Scan rl:{server}:*:{today} keys
    const keys = await listPrefix(kv, `rl:${server.key}:`);
    const todayKeys = keys.filter(k => k.name.includes(today));

    let totalCalls = 0;
    const ips = new Set();

    for (const k of todayKeys) {
      try {
        const val = await kv.get(k.name);
        const count = parseInt(val) || 0;
        totalCalls += count;
        const parts = k.name.split(':');
        ips.add(parts[2] || '');
      } catch {}
    }

    usage[server.key] = {
      name: server.name,
      daily_limit: server.limit,
      total_calls_today: totalCalls,
      unique_ips_today: ips.size,
      rate_limit_keys: todayKeys.length,
    };
  }

  return json({
    timestamp: new Date().toISOString(),
    date: today,
    servers: usage,
  });
}

// GET /api/refs — attribution tracking
async function handleRefs(env) {
  const kv = env.KV;
  const refKeys = await listPrefix(kv, 'ref:');

  const bySource = {};
  const byServer = {};
  const byDate = {};

  for (const k of refKeys) {
    const parts = k.name.split(':');
    // ref:{server}:{source}:{date}
    const server = parts[1] || 'unknown';
    const source = parts[2] || 'unknown';
    const date = parts[3] || 'unknown';

    bySource[source] = (bySource[source] || 0) + 1;
    byServer[server] = (byServer[server] || 0) + 1;
    byDate[date] = (byDate[date] || 0) + 1;
  }

  return json({
    timestamp: new Date().toISOString(),
    total_ref_keys: refKeys.length,
    by_source: bySource,
    by_server: byServer,
    by_date: byDate,
  });
}

// List all keys with a given prefix (handles pagination)
async function listPrefix(kv, prefix) {
  const allKeys = [];
  let cursor = null;

  for (let i = 0; i < 10; i++) {  // max 10 pages (10000 keys)
    const opts = { prefix, limit: 1000 };
    if (cursor) opts.cursor = cursor;

    const result = await kv.list(opts);
    allKeys.push(...result.keys);

    if (result.list_complete) break;
    cursor = result.cursor;
  }

  return allKeys;
}

// GET / — HTML Dashboard
function handleDashboard() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OpenClaw Analytics</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 20px; }
  h1 { color: #ff6b35; margin-bottom: 20px; }
  h2 { color: #ff6b35; margin: 20px 0 10px; font-size: 1.1em; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 16px; }
  .card h3 { color: #ff6b35; font-size: 0.9em; margin-bottom: 8px; text-transform: uppercase; }
  .metric { font-size: 2em; font-weight: bold; color: #fff; }
  .sub { font-size: 0.85em; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #222; font-size: 0.85em; }
  th { color: #ff6b35; }
  .bar { background: #ff6b35; height: 8px; border-radius: 4px; }
  .loading { color: #888; font-style: italic; }
  #error { color: #ff4444; display: none; margin: 10px 0; }
  .refresh { color: #ff6b35; cursor: pointer; float: right; font-size: 0.9em; }
  .refresh:hover { text-decoration: underline; }
  footer { margin-top: 40px; text-align: center; color: #555; font-size: 0.8em; }
  footer a { color: #ff6b35; text-decoration: none; }
</style>
</head>
<body>
<h1>OpenClaw Analytics <span class="refresh" onclick="loadAll()">Refresh</span></h1>
<div id="error"></div>

<h2>Server Usage (Today)</h2>
<div class="grid" id="usage-grid"><div class="card loading">Loading...</div></div>

<h2>System Metrics</h2>
<div class="grid" id="stats-grid"><div class="card loading">Loading...</div></div>

<h2>Attribution Sources</h2>
<div id="refs-table"><div class="card loading">Loading...</div></div>

<footer>
  <p>OpenClaw Intelligence &mdash; <a href="https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers">GitHub</a> | 49 tools, 9 MCP servers</p>
</footer>

<script>
const BASE = '';

async function fetchJSON(path) {
  try {
    const r = await fetch(BASE + path);
    return await r.json();
  } catch (e) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = 'Error: ' + e.message;
    return null;
  }
}

function bar(val, max) {
  const pct = max > 0 ? Math.min(100, (val/max)*100) : 0;
  return '<div style="background:#222;border-radius:4px;overflow:hidden"><div class="bar" style="width:'+pct+'%"></div></div>';
}

async function loadUsage() {
  const data = await fetchJSON('/api/usage');
  if (!data) return;
  const grid = document.getElementById('usage-grid');
  grid.innerHTML = '';
  const servers = data.servers || {};
  for (const [key, info] of Object.entries(servers)) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h3>' + info.name + '</h3>' +
      '<div class="metric">' + info.total_calls_today + '</div>' +
      '<div class="sub">calls today | ' + info.unique_ips_today + ' unique IPs | limit ' + info.daily_limit + '/ip/day</div>' +
      bar(info.total_calls_today, info.daily_limit * Math.max(1, info.unique_ips_today));
    grid.appendChild(card);
  }
}

async function loadStats() {
  const data = await fetchJSON('/api/stats');
  if (!data) return;
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';

  const cards = [
    { title: 'Rate Limit Keys', value: data.rate_limits.total_keys, sub: data.rate_limits.today_active + ' active today, ' + data.rate_limits.unique_ips_today + ' unique IPs' },
    { title: 'Cache Entries', value: data.cache.total_entries, sub: Object.entries(data.cache.by_server).map(([k,v])=>k+':'+v).join(', ') },
    { title: 'Attribution Keys', value: data.attribution.total_keys, sub: Object.entries(data.attribution.by_source).map(([k,v])=>k+':'+v).join(', ') },
    { title: 'Defense Events', value: data.defense.total_events, sub: Object.entries(data.defense.by_type).map(([k,v])=>k+':'+v).join(', ') || 'none' },
    { title: 'FinOps Keys', value: data.finops.total_keys, sub: 'circuit breaker tracking' },
  ];

  for (const c of cards) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = '<h3>' + c.title + '</h3><div class="metric">' + c.value + '</div><div class="sub">' + c.sub + '</div>';
    grid.appendChild(el);
  }
}

async function loadRefs() {
  const data = await fetchJSON('/api/refs');
  if (!data) return;
  const container = document.getElementById('refs-table');

  let html = '<div class="card"><h3>Traffic Sources</h3><table><tr><th>Source</th><th>Keys</th></tr>';
  const sorted = Object.entries(data.by_source || {}).sort((a,b) => b[1]-a[1]);
  for (const [source, count] of sorted) {
    html += '<tr><td>' + source + '</td><td>' + count + '</td></tr>';
  }
  html += '</table></div>';

  html += '<div class="card" style="margin-top:16px"><h3>By Server</h3><table><tr><th>Server</th><th>Keys</th></tr>';
  const serverSorted = Object.entries(data.by_server || {}).sort((a,b) => b[1]-a[1]);
  for (const [server, count] of serverSorted) {
    html += '<tr><td>' + server + '</td><td>' + count + '</td></tr>';
  }
  html += '</table></div>';

  container.innerHTML = html;
}

function loadAll() {
  document.getElementById('error').style.display = 'none';
  loadUsage();
  loadStats();
  loadRefs();
}

loadAll();
setInterval(loadAll, 60000);
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' }
  });
}
