/**
 * YEDAN Revenue Sentinel v2.0 - Money Never Sleeps
 * Cron: every 10 minutes
 *
 * v2.0: Full 15-product catalog, per-product analytics,
 * auto new-order detection, performance scoring, smart alerts,
 * /dashboard /products /trends endpoints
 */

const PRODUCT_STORE = 'https://product-store.yagami8095.workers.dev';
const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';

// ====== FULL PRODUCT CATALOG (15 Products) ======
const PRODUCT_CATALOG = {
  'prompt-collection-50': { name: 'AIプロンプト50選', price: 19, category: 'content', tier: 'starter' },
  'automation-guide': { name: '24時間稼働AIシステム', price: 15, category: 'content', tier: 'starter' },
  'side-income-roadmap': { name: 'AI副業ロードマップ', price: 12, category: 'content', tier: 'starter' },
  'intel-api-pro': { name: 'Intel Pro API Key', price: 9, category: 'api', tier: 'starter' },
  'mcp-starter-kit': { name: 'MCP Server スターターキット', price: 29, category: 'developer', tier: 'mid' },
  'ecosystem-pro': { name: 'OpenClaw Ecosystem Pro', price: 9, category: 'bundle', tier: 'starter' },
  'intel-annual-pass': { name: 'Intel Pro 年間パス', price: 79, category: 'api', tier: 'premium' },
  'enterprise-bundle': { name: 'Enterprise Bundle', price: 99, category: 'bundle', tier: 'premium' },
  'agent-builder-kit': { name: 'AI Agent Builder Kit', price: 49, category: 'developer', tier: 'mid' },
  'mcp-audit-report': { name: 'MCP Server Audit Report', price: 79, category: 'service', tier: 'premium' },
  'api-gateway-pro': { name: 'API Gateway Pro', price: 29, category: 'developer', tier: 'mid' },
  'revenue-automation-masterclass': { name: 'Revenue Automation Masterclass', price: 149, category: 'content', tier: 'premium' },
  'ooda-system-blueprint': { name: 'OODA Autonomous Intelligence', price: 59, category: 'content', tier: 'mid' },
  'ai-fleet-deployment': { name: 'AI Fleet Deployment Kit', price: 39, category: 'developer', tier: 'mid' },
  'claude-code-pro-toolkit': { name: 'Claude Code Pro Toolkit', price: 29, category: 'developer', tier: 'mid' },
};

const SMITHERY_SERVERS = [
  'json-toolkit-mcp', 'regex-engine-mcp', 'color-palette-mcp',
  'timestamp-converter-mcp', 'prompt-enhancer-mcp', 'agentforge-compare-mcp',
  'moltbook-publisher-mcp', 'openclaw-fortune-mcp', 'openclaw-intel-mcp',
];

const ALERT_BIG_ORDER_USD = 49;
const DAILY_TARGET_USD = 50;
const STREAK_THRESHOLD_HOURS = 1;

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sentinelScan(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/':
      case '/status':
        return await getSentinelStatus(env);
      case '/health':
        return json({ status: 'operational', role: 'revenue-sentinel', version: '2.0.0', products_tracked: Object.keys(PRODUCT_CATALOG).length });
      case '/scan':
        if (request.method === 'POST') {
          await sentinelScan(env);
          return json({ ok: true, message: 'Scan triggered' });
        }
        return json({ error: 'POST required' }, 405);
      case '/execute':
        if (request.method === 'POST') return await handleTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/report':
        return await getRevenueReport(env);
      case '/ping':
        return json({ pong: true, brain: 'revenue-sentinel', version: '2.0.0', ts: Date.now() });
      case '/dashboard':
        return await getDashboard(env);
      case '/products':
        return await getProductAnalytics(env);
      case '/trends':
        return await getRevenueTrends(env);
      default:
        return json({ error: 'Not found', endpoints: ['/', '/status', '/scan', '/report', '/dashboard', '/products', '/trends', '/health', '/ping'], version: '2.0.0' }, 404);
    }
  }
};

async function sentinelScan(env) {
  const log = [];
  const start = Date.now();
  log.push('[SENTINEL v2.0] Full scan started ' + new Date().toISOString());
  await ensureSchema(env, log);

  // Parallel revenue checks
  const [productStore, smithery, mcp9Health] = await Promise.allSettled([
    checkProductStore(env, log),
    checkSmitheryStats(env, log),
    checkMCP9Health(env, log)
  ]);

  const report = {
    sentinel: 'yedan-revenue-sentinel',
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - start,
    product_store: productStore.status === 'fulfilled' ? productStore.value : { error: productStore.reason?.message },
    smithery: smithery.status === 'fulfilled' ? smithery.value : { error: smithery.reason?.message },
    mcp_health: mcp9Health.status === 'fulfilled' ? mcp9Health.value : { error: mcp9Health.reason?.message },
    log: log.slice(-15)
  };

  // Store results
  await env.ARMY_KV.put('sentinel:last-scan', JSON.stringify(report), { expirationTtl: 3600 });

  // Update fleet status
  try {
    await env.ARMY_DB.prepare(
      `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + 1 WHERE id = 'yedan-revenue-sentinel'`
    ).run();

    await env.ARMY_DB.prepare(
      `INSERT INTO fleet_events (worker_id, event_type, severity, message) VALUES (?, 'scan_complete', 'info', ?)`
    ).bind('yedan-revenue-sentinel', `Scan done in ${Date.now() - start}ms`).run();
  } catch {}

  // Report to Bunshin
  await reportBunshin('revenue-sentinel-status', {
    last_scan: report.timestamp,
    product_store_revenue: report.product_store?.total_revenue || 0,
    product_store_orders: report.product_store?.paid_count || 0,
    mcp_servers_up: report.mcp_health?.up || 0,
    duration_ms: report.duration_ms
  }, env);
}

async function checkProductStore(env, log) {
  log.push('[PS] Checking Product Store...');
  try {
    const resp = await fetch(`${PRODUCT_STORE}/api/orders`, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    const orders = data.orders || [];
    const paid = orders.filter(o => o.status === 'paid');
    const totalRevenue = paid.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);

    // Check for NEW orders not yet in ledger
    const knownOrders = await env.ARMY_DB.prepare(
      `SELECT order_id FROM revenue_ledger WHERE source = 'product-store'`
    ).all();
    const knownIds = new Set((knownOrders.results || []).map(r => r.order_id));

    const newOrders = paid.filter(o => !knownIds.has(o.order_id));
    if (newOrders.length > 0) {
      log.push(`[PS] ${newOrders.length} NEW orders found!`);
      for (const order of newOrders) {
        await env.ARMY_DB.prepare(
          `INSERT INTO revenue_ledger (source, amount, currency, order_id, product, status, verified_by) VALUES (?, ?, 'USD', ?, ?, 'confirmed', 'revenue-sentinel')`
        ).bind('product-store', parseFloat(order.amount) || 0, order.order_id, order.product || 'unknown').run();
      }

      // Alert Bunshin about new revenue!
      if (newOrders.length > 0) {
        const newAmount = newOrders.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
        await reportBunshin('revenue-alert', {
          type: 'new_orders',
          count: newOrders.length,
          new_amount: newAmount,
          total_revenue: totalRevenue,
          orders: newOrders.map(o => ({ id: o.order_id, amount: o.amount, product: o.product }))
        }, env);
      }
    }

    log.push(`[PS] Total: $${totalRevenue} from ${paid.length} paid orders (${newOrders.length} new)`);
        // Per-product breakdown
    const productBreakdown = {};
    for (const [slug, info] of Object.entries(PRODUCT_CATALOG)) {
      const po = paid.filter(o => o.product === slug);
      productBreakdown[slug] = { name: info.name, orders: po.length, revenue: po.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0), status: po.length > 0 ? 'active' : 'no_sales' };
    }
    const hot = Object.entries(productBreakdown).filter(([, v]) => v.orders >= 2).map(([k]) => k);
    const warm = Object.entries(productBreakdown).filter(([, v]) => v.orders === 1).map(([k]) => k);
    const cold = Object.entries(productBreakdown).filter(([, v]) => v.orders === 0).map(([k]) => k);
    log.push('[PS] Products: ' + hot.length + ' hot, ' + warm.length + ' warm, ' + cold.length + ' cold');
    await env.ARMY_KV.put('sentinel:product-breakdown', JSON.stringify(productBreakdown), { expirationTtl: 3600 });

return { total_revenue: totalRevenue, paid_count: paid.length, new_count: newOrders.length, all_count: orders.length, products_tracked: Object.keys(PRODUCT_CATALOG).length, performance: { hot: hot.length, warm: warm.length, cold: cold.length }, hot_products: hot, cold_products: cold };
  } catch (e) {
    log.push(`[PS] Error: ${e.message}`);
    return { error: e.message };
  }
}

async function checkSmitheryStats(env, log) {
  log.push('[SMITHERY] Checking server stats...');
  const stats = {};

  const checks = SMITHERY_SERVERS.map(async (name) => {
    try {
      // Check if server is reachable via its workers.dev URL
      const resp = await fetch(`https://${name}.yagami8095.workers.dev/health`, {
        signal: AbortSignal.timeout(5000)
      });
      stats[name] = { reachable: resp.ok, status: resp.status };
    } catch (e) {
      stats[name] = { reachable: false, error: e.message };
    }
  });

  await Promise.allSettled(checks);
  const reachable = Object.values(stats).filter(s => s.reachable).length;
  log.push(`[SMITHERY] ${reachable}/${SMITHERY_SERVERS.length} servers reachable`);

  return { servers: stats, reachable, total: SMITHERY_SERVERS.length };
}

async function checkMCP9Health(env, log) {
  let up = 0, down = 0;
  const results = {};

  const checks = SMITHERY_SERVERS.map(async (name) => {
    try {
      const resp = await fetch(`https://${name}.yagami8095.workers.dev/`, {
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) { up++; results[name] = 'up'; }
      else { down++; results[name] = `down:${resp.status}`; }
    } catch {
      down++;
      results[name] = 'unreachable';
    }
  });

  await Promise.allSettled(checks);
  log.push(`[MCP9] ${up}/9 up, ${down}/9 down`);
  return { up, down, results };
}

async function handleTask(request, env) {
  try {
    const { task_id, type, payload } = await request.json();

    if (type === 'revenue-check' || type === 'revenue') {
      await sentinelScan(env);
      return json({ ok: true, task_id, result: 'scan_completed' });
    }

    return json({ ok: false, task_id, error: 'Unknown task type for revenue sentinel' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function getSentinelStatus(env) {
  const cached = await env.ARMY_KV.get('sentinel:last-scan', 'json').catch(() => null);
  const { results: revenue } = await env.ARMY_DB.prepare(
    `SELECT source, SUM(amount) as total, COUNT(*) as count FROM revenue_ledger WHERE status = 'confirmed' GROUP BY source`
  ).all().catch(() => ({ results: [] }));
  const grandTotal = revenue?.reduce((s, r) => s + r.total, 0) || 0;

  return json({
    role: 'revenue-sentinel',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    revenue: { grand_total_usd: grandTotal, by_source: revenue },
    last_scan: cached ? { timestamp: cached.timestamp, duration_ms: cached.duration_ms } : null
  });
}

async function getRevenueReport(env) {
  const { results } = await env.ARMY_DB.prepare(
    `SELECT * FROM revenue_ledger ORDER BY recorded_at DESC`
  ).all();
  const { results: summary } = await env.ARMY_DB.prepare(
    `SELECT source, SUM(amount) as total, COUNT(*) as orders FROM revenue_ledger GROUP BY source`
  ).all();
  return json({ summary, entries: results });
}

async function reportBunshin(key, value, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({ key, value, context: `Revenue Sentinel report` }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}


// ====== V2 NEW FUNCTIONS ======

async function ensureSchema(env, log) {
  try { await env.ARMY_DB.prepare(
    "CREATE TABLE IF NOT EXISTS product_stats (product TEXT PRIMARY KEY, total_revenue REAL DEFAULT 0, total_orders INTEGER DEFAULT 0, last_order_at TEXT, last_order_id TEXT, created_at TEXT DEFAULT (datetime('now')))"
  ).run(); } catch (e) { log.push('[SCHEMA] ' + e.message); }
}

async function getDashboard(env) {
  const cached = await env.ARMY_KV.get('sentinel:last-scan', 'json').catch(() => null);
  const breakdown = await env.ARMY_KV.get('sentinel:product-breakdown', 'json').catch(() => null);
  const { results: byProduct } = await env.ARMY_DB.prepare("SELECT product, SUM(amount) as total, COUNT(*) as orders FROM revenue_ledger WHERE status = 'confirmed' GROUP BY product ORDER BY total DESC").all().catch(() => ({ results: [] }));
  const { results: todayData } = await env.ARMY_DB.prepare("SELECT SUM(amount) as total, COUNT(*) as orders FROM revenue_ledger WHERE status = 'confirmed' AND date(recorded_at) = date('now')").all().catch(() => ({ results: [] }));
  const { results: totals } = await env.ARMY_DB.prepare("SELECT SUM(amount) as total, COUNT(*) as count FROM revenue_ledger WHERE status = 'confirmed'").all().catch(() => ({ results: [] }));
  const grandTotal = (totals && totals[0]) ? totals[0].total || 0 : 0;
  const dailyRevenue = (todayData && todayData[0]) ? todayData[0].total || 0 : 0;
  const productsWithSales = (byProduct || []).length;
  const soldSet = new Set((byProduct || []).map(r => r.product));
  const unsold = Object.entries(PRODUCT_CATALOG).filter(([slug]) => !soldSet.has(slug)).map(([slug, info]) => ({ slug, ...info }));
  const catRev = {};
  for (const row of (byProduct || [])) { const c = (PRODUCT_CATALOG[row.product] || {}).category || 'other'; catRev[c] = (catRev[c] || 0) + row.total; }
  const tierRev = {};
  for (const row of (byProduct || [])) { const t = (PRODUCT_CATALOG[row.product] || {}).tier || 'unknown'; tierRev[t] = (tierRev[t] || 0) + row.total; }
  return json({ version: '2.0.0', generated_at: new Date().toISOString(),
    overview: { total_revenue: grandTotal, total_orders: (totals && totals[0]) ? totals[0].count || 0 : 0, today_revenue: dailyRevenue, today_orders: (todayData && todayData[0]) ? todayData[0].orders || 0 : 0, products_tracked: Object.keys(PRODUCT_CATALOG).length, products_with_sales: productsWithSales, catalog_coverage: productsWithSales + '/' + Object.keys(PRODUCT_CATALOG).length },
    best_sellers: (byProduct || []).slice(0, 5).map(r => ({ product: r.product, name: (PRODUCT_CATALOG[r.product] || {}).name || r.product, revenue: r.total, orders: r.orders })),
    unsold_products: unsold, revenue_by_category: catRev, revenue_by_tier: tierRev,
    last_scan: cached ? { timestamp: cached.timestamp, duration_ms: cached.duration_ms } : null,
    product_breakdown: breakdown });
}

async function getProductAnalytics(env) {
  const { results: stats } = await env.ARMY_DB.prepare("SELECT product, SUM(amount) as revenue, COUNT(*) as orders, MAX(recorded_at) as last_sale FROM revenue_ledger WHERE status = 'confirmed' GROUP BY product").all().catch(() => ({ results: [] }));
  const statsMap = {};
  for (const row of (stats || [])) { statsMap[row.product] = row; }
  const products = Object.entries(PRODUCT_CATALOG).map(([slug, info]) => {
    const s = statsMap[slug] || { revenue: 0, orders: 0, last_sale: null };
    let score = 'dead';
    if (s.orders >= 3) score = 'hot'; else if (s.orders >= 2) score = 'warm'; else if (s.orders >= 1) score = 'cool';
    return { slug, name: info.name, price: info.price, category: info.category, tier: info.tier, total_revenue: s.revenue, total_orders: s.orders, last_sale: s.last_sale, score, store_url: PRODUCT_STORE + '/products/' + slug };
  });
  products.sort((a, b) => b.total_revenue - a.total_revenue);
  const sc = { hot: 0, warm: 0, cool: 0, dead: 0 };
  products.forEach(p => sc[p.score]++);
  return json({ products_tracked: products.length, score_summary: sc, total_catalog_value: Object.values(PRODUCT_CATALOG).reduce((s, p) => s + p.price, 0), products });
}

async function getRevenueTrends(env) {
  const { results: daily } = await env.ARMY_DB.prepare("SELECT date(recorded_at) as day, SUM(amount) as revenue, COUNT(*) as orders FROM revenue_ledger WHERE status = 'confirmed' AND recorded_at >= datetime('now', '-30 days') GROUP BY date(recorded_at) ORDER BY day DESC").all().catch(() => ({ results: [] }));
  const { results: pt } = await env.ARMY_DB.prepare("SELECT product, date(recorded_at) as day, SUM(amount) as revenue, COUNT(*) as orders FROM revenue_ledger WHERE status = 'confirmed' AND recorded_at >= datetime('now', '-30 days') GROUP BY product, date(recorded_at) ORDER BY day DESC").all().catch(() => ({ results: [] }));
  const td = (daily || []).length || 1;
  const to2 = (daily || []).reduce((s, d) => s + d.orders, 0);
  const tr = (daily || []).reduce((s, d) => s + d.revenue, 0);
  return json({ period: '30_days', summary: { active_days: td, total_revenue: tr, total_orders: to2, avg_daily_revenue: Math.round((tr / td) * 100) / 100, avg_daily_orders: Math.round((to2 / td) * 100) / 100, avg_order_value: to2 > 0 ? Math.round((tr / to2) * 100) / 100 : 0 }, daily, by_product: pt });
}
