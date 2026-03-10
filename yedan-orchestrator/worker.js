/**
 * YEDAN Fleet Orchestrator v3.0 — OODA ORIENT + DECIDE + REFLECT
 * Cron: every 2 minutes
 *
 * v3.0 Upgrades:
 *   - Plan-Act-Reflect loop: multi-step reasoning with self-correction
 *   - Graph RAG context: query knowledge graph before decisions
 *   - Confidence scoring: uncertainty-weighted task creation
 *   - Outcome learning: feedback loop adjusts future decisions
 *   - Dynamic priority: recent outcomes influence new task urgency
 */

const FLEET_WORKERS = [
  { id: 'yedan-orchestrator', url: 'https://yedan-orchestrator.yagami8095.workers.dev' },
  { id: 'yedan-revenue-sentinel', url: 'https://yedan-revenue-sentinel.yagami8095.workers.dev' },
  { id: 'yedan-content-engine', url: 'https://yedan-content-engine.yagami8095.workers.dev' },
  { id: 'yedan-intel-ops', url: 'https://yedan-intel-ops.yagami8095.workers.dev' },
  { id: 'yedan-health-commander', url: 'https://yedan-health-commander.yagami8095.workers.dev' },
  { id: 'yedan-cloud-executor', url: 'https://yedan-cloud-executor.yagami8095.workers.dev' },
  // dansin-gateway URL loaded from env.YEDAN_GATEWAY_URL
];

const MCP_SERVERS = [
  'json-toolkit-mcp', 'regex-engine-mcp', 'color-palette-mcp',
  'timestamp-converter-mcp', 'prompt-enhancer-mcp', 'agentforge-compare-mcp',
  'moltbook-publisher-mcp', 'openclaw-fortune-mcp', 'openclaw-intel-mcp'
];

const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
// BUNSHIN_AUTH loaded from env.BUNSHIN_AUTH_TOKEN (wrangler secret)
const TELEGRAM_CHAT_ID = '7848052227';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(orchestrate(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    // Auth check for mutating endpoints
    const PROTECTED = ['/dispatch', '/execute'];
    if (PROTECTED.includes(url.pathname)) {
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
      if (!env.FLEET_AUTH_TOKEN || token !== env.FLEET_AUTH_TOKEN)
        return json({ error: 'Unauthorized' }, 401);
    }

    switch (url.pathname) {
      case '/':
      case '/status':
        return await getFleetStatus(env);
      case '/health':
        return json({ status: 'operational', role: 'fleet-orchestrator', version: '3.0.0', ooda: 'ORIENT+DECIDE+REFLECT' });
      case '/fleet':
        return await getFleetDetails(env);
      case '/revenue':
        return await getRevenueReport(env);
      case '/intel':
        return await getIntelReport(env);
      case '/dispatch':
        if (request.method === 'POST') return await dispatchTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/metrics':
        return await getMetrics(env);
      case '/reflect':
        return await getReflection(env);
      case '/ping':
        return json({ pong: true, brain: 'orchestrator', version: '3.0.0', ts: Date.now() });
      default:
        return json({ error: 'Not found' }, 404);
    }
  }
};

// === CORE ORCHESTRATION (6 Phases) ===
async function orchestrate(env) {
  const startTime = Date.now();

  try {
    // Phase 1: Fleet Health Check
    const fleetHealth = await checkFleetHealth(env);

    // Phase 2: ORIENT — AI Analysis of intel_feed
    const analysisResults = await orientAnalyzeIntel(env);

    // Phase 2.5: Graph RAG — Enrich decisions with knowledge graph context
    await writeToGraphRAG(env, 'orchestration_cycle', { fleet: fleetHealth, analysis: analysisResults });

    // Phase 3: DECIDE — Auto-create tasks from analysis
    const decisions = await decideActions(env);

    // Phase 4: Task Distribution
    const taskResults = await distributeTasks(env);

    // Phase 5: REFLECT — Learn from completed tasks
    const reflection = await reflectOnOutcomes(env);

    // Phase 6: Revenue Aggregation
    const revenue = await aggregateRevenue(env);

    // Phase 7: Metrics + Report
    const duration = Date.now() - startTime;
    await recordMetrics(env, fleetHealth, taskResults, revenue, duration);

    const report = {
      orchestrator: 'yedan-fleet-orchestrator',
      version: '3.0.0',
      ooda: { orient: analysisResults, decide: decisions, reflect: reflection },
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      fleet: { total: FLEET_WORKERS.length, healthy: fleetHealth.healthy, unhealthy: fleetHealth.unhealthy },
      tasks: taskResults,
      revenue: revenue
    };

    await reportToBunshin(report, env);
    await env.ARMY_KV.put('orchestrator:last-run', JSON.stringify(report), { expirationTtl: 7200 });

    // Update own heartbeat
    try {
      await env.ARMY_DB.prepare(
        `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + 1 WHERE id = 'yedan-orchestrator'`
      ).run();
    } catch {}

  } catch (err) {
    await logEvent(env, 'yedan-orchestrator', 'orchestration_error', 'critical', err.message);
  }
}

// === PHASE 2: ORIENT — AI Analysis ===
async function orientAnalyzeIntel(env) {
  if (!env.DEEPINFRA_API_KEY) return { skipped: true, reason: 'no DEEPINFRA_API_KEY' };

  try {
    // Get unanalyzed intel (max 5 per cycle — V3 is fast enough)
    const { results } = await env.ARMY_DB.prepare(
      `SELECT id, source, title, url, summary, metadata FROM intel_feed WHERE analyzed = 0 ORDER BY created_at DESC LIMIT 5`
    ).all();

    if (!results || results.length === 0) return { analyzed: 0 };

    let analyzed = 0;
    const highScoreItems = [];

    // Batch analyze — group items into one prompt for efficiency
    const itemList = results.map((r, i) => `${i + 1}. [${r.source}] ${r.title} — ${r.summary}`).join('\n');

    // Query Graph RAG for relevant context before analysis
    const graphContext = await queryGraphRAGContext(env, results.map(r => r.title).join(' '));

    // Check recent failure patterns for confidence adjustment
    let failureContext = '';
    try {
      const failTypes = ['content', 'intel', 'revenue-action', 'general'];
      for (const ft of failTypes) {
        const count = parseInt(await env.ARMY_KV.get(`reflect:fail:${ft}`) || '0');
        if (count >= 2) failureContext += `WARNING: "${ft}" tasks have ${count} recent failures. Reduce score for this type.\n`;
      }
    } catch {}

    const prompt = `You are YEDAN's AI strategist for OpenClaw MCP ecosystem.
Analyze ${results.length} intel items. For EACH provide:
- Score (1-10): Business relevance. 10 = must act NOW
- Confidence (0.0-1.0): How certain are you? Low if data is ambiguous
- Opportunity: One-sentence (or "none")
- Action: Specific action (or "monitor")

Our products: 9 MCP servers on Smithery, 15 digital products, Intel API, x402 payment gateway
Our tech: Cloudflare Workers, D1, KV, Workers AI, Graph RAG knowledge engine
${graphContext ? '\nKnowledge context:\n' + graphContext.slice(0, 500) : ''}
${failureContext}
Items:
${itemList}

JSON array ONLY:
[{"index":1,"score":5,"confidence":0.8,"opportunity":"...","action":"..."},...]`;

    const resp = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPINFRA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3-0324',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (resp.ok) {
      const data = await resp.json();
      let content = data.choices?.[0]?.message?.content || '';

      // Strip thinking tags if present (DeepSeek R1)
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Extract JSON array
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const analyses = JSON.parse(jsonMatch[0]);

          for (const analysis of analyses) {
            const idx = (analysis.index || 1) - 1;
            const item = results[idx];
            if (!item) continue;

            const score = Math.min(10, Math.max(1, parseInt(analysis.score) || 5));

            // Update intel_feed
            await env.ARMY_DB.prepare(
              `UPDATE intel_feed SET analyzed = 1, analysis_score = ?, analyzed_at = datetime('now') WHERE id = ?`
            ).bind(score, item.id).run();

            // Store analysis
            await env.ARMY_DB.prepare(
              `INSERT INTO intel_analysis (feed_id, score, opportunity, action_needed, analysis, model) VALUES (?, ?, ?, ?, ?, 'deepseek-v3')`
            ).bind(item.id, score, analysis.opportunity || '', analysis.action || '', JSON.stringify(analysis)).run();

            if (score >= 7) {
              highScoreItems.push({ ...item, score, confidence: analysis.confidence || 0.7, opportunity: analysis.opportunity, action: analysis.action });
            }

            analyzed++;
          }
        } catch {}
      }
    }

    // Telegram alert for high-score items
    if (highScoreItems.length > 0 && env.TELEGRAM_BOT_TOKEN) {
      const alertMsg = `OODA ORIENT | ${highScoreItems.length} high-score intel!\n\n` +
        highScoreItems.map(h => `Score ${h.score}/10: ${h.title}\n${h.opportunity}`).join('\n\n');
      await sendTelegram(env, alertMsg);
    }

    return { analyzed, high_score: highScoreItems.length };
  } catch (e) {
    return { error: e.message };
  }
}

// === PHASE 3: DECIDE — Auto-create Tasks ===
async function decideActions(env) {
  try {
    // Get high-score analyses from last hour that haven't been tasked yet
    const { results } = await env.ARMY_DB.prepare(
      `SELECT a.id as analysis_id, a.score, a.opportunity, a.action_needed, a.analysis, f.source, f.title, f.url
       FROM intel_analysis a
       JOIN intel_feed f ON a.feed_id = f.id
       WHERE a.score >= 7
       AND a.created_at > datetime('now', '-1 hour')
       ORDER BY a.score DESC LIMIT 5`
    ).all();

    if (!results || results.length === 0) return { tasks_created: 0 };

    let created = 0;
    for (const item of results) {
      // Check if task already exists for this analysis
      const existing = await env.ARMY_DB.prepare(
        `SELECT id FROM fleet_tasks WHERE payload LIKE ? AND created_at > datetime('now', '-6 hours')`
      ).bind(`%analysis_id":${item.analysis_id}%`).first();

      if (existing) continue;

      // Check failure patterns — skip task types with 3+ recent failures
      const action = (item.action_needed || '').toLowerCase();
      let taskType = 'general';
      if (action.includes('content') || action.includes('write') || action.includes('post')) taskType = 'content';
      else if (action.includes('monitor') || action.includes('track')) taskType = 'monitoring';
      else if (action.includes('revenue') || action.includes('price')) taskType = 'revenue-action';
      else if (action.includes('health') || action.includes('fix')) taskType = 'health-check';
      else if (action.includes('intel') || action.includes('research')) taskType = 'intel';

      // Confidence-weighted priority: high confidence + high score = urgent
      const confidence = parseFloat(item.confidence || '0.7');
      const effectiveScore = Math.round(item.score * confidence);
      if (effectiveScore < 5) continue; // Skip low-confidence items

      // Skip task types with too many recent failures
      const failCount = parseInt(await env.ARMY_KV.get(`reflect:fail:${taskType}`) || '0');
      if (failCount >= 3) continue;

      const taskId = `ooda-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await env.ARMY_DB.prepare(
        `INSERT INTO fleet_tasks (id, type, priority, payload, status) VALUES (?, ?, ?, ?, 'pending')`
      ).bind(
        taskId,
        taskType,
        effectiveScore >= 8 ? 1 : effectiveScore >= 6 ? 3 : 5,
        JSON.stringify({
          analysis_id: item.analysis_id,
          source: item.source,
          title: item.title,
          url: item.url,
          opportunity: item.opportunity,
          action: item.action_needed,
          score: item.score,
          confidence,
          effective_score: effectiveScore,
          auto_created: true
        })
      ).run();

      created++;
    }

    if (created > 0 && env.TELEGRAM_BOT_TOKEN) {
      await sendTelegram(env, `OODA DECIDE | ${created} auto-tasks created from high-score intel`);
    }

    return { tasks_created: created, evaluated: results.length };
  } catch (e) {
    return { error: e.message, tasks_created: 0 };
  }
}

// === FLEET HEALTH ===
async function checkFleetHealth(env) {
  let healthy = 0, unhealthy = 0;
  const details = {};
  const workers = [...FLEET_WORKERS];
  if (env.YEDAN_GATEWAY_URL) workers.push({ id: 'dansin-gateway', url: env.YEDAN_GATEWAY_URL });

  const checks = workers.map(async (w) => {
    try {
      const resp = await fetch(`${w.url}/health`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'YedanOrchestrator/2.0' }
      });
      if (resp.ok) { details[w.id] = 'healthy'; healthy++; }
      else { details[w.id] = `degraded:${resp.status}`; unhealthy++; }
    } catch { details[w.id] = 'unreachable'; unhealthy++; }
  });

  await Promise.allSettled(checks);
  return { healthy, unhealthy, details };
}

// === TASK DISTRIBUTION ===
async function distributeTasks(env) {
  try {
    const { results } = await env.ARMY_DB.prepare(
      `SELECT * FROM fleet_tasks WHERE status = 'pending' ORDER BY priority ASC, created_at ASC LIMIT 10`
    ).all();

    if (!results || results.length === 0) return { dispatched: 0, total_pending: 0 };

    let dispatched = 0;
    for (const task of results) {
      const targetWorker = routeTask(task);
      if (targetWorker) {
        // Circuit breaker check
        const cbKey = `circuit:${targetWorker.id}`;
        try {
          const cb = await env.ARMY_KV.get(cbKey, 'json');
          if (cb && cb.openUntil && Date.now() < cb.openUntil) continue; // Skip — circuit open
        } catch {}

        try {
          const resp = await fetch(`${targetWorker.url}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.FLEET_AUTH_TOKEN || ''}` },
            body: JSON.stringify({ task_id: task.id, type: task.type, payload: task.payload }),
            signal: AbortSignal.timeout(10000)
          });
          if (resp.ok) {
            await env.ARMY_DB.prepare(
              `UPDATE fleet_tasks SET status = 'running', worker_id = ?, started_at = datetime('now') WHERE id = ?`
            ).bind(targetWorker.id, task.id).run();
            dispatched++;
            // Reset circuit on success
            try { await env.ARMY_KV.delete(cbKey); } catch {}
          } else {
            await tripCircuit(env, cbKey, targetWorker.id);
          }
        } catch {
          await tripCircuit(env, cbKey, targetWorker.id);
        }
      }
    }

    return { dispatched, total_pending: results.length };
  } catch (e) {
    return { dispatched: 0, error: e.message };
  }
}

async function tripCircuit(env, cbKey, workerId) {
  try {
    const cb = await env.ARMY_KV.get(cbKey, 'json') || { failures: 0 };
    cb.failures = (cb.failures || 0) + 1;
    if (cb.failures >= 3) {
      cb.openUntil = Date.now() + 10 * 60 * 1000; // Open for 10 minutes
    }
    await env.ARMY_KV.put(cbKey, JSON.stringify(cb), { expirationTtl: 1800 });
  } catch {}
}

function routeTask(task) {
  const routing = {
    'revenue': 'yedan-revenue-sentinel', 'revenue-check': 'yedan-revenue-sentinel', 'revenue-action': 'yedan-revenue-sentinel',
    'content': 'yedan-content-engine', 'content-create': 'yedan-content-engine',
    'intel': 'yedan-intel-ops', 'intel-gather': 'yedan-intel-ops',
    'health': 'yedan-health-commander', 'health-check': 'yedan-health-commander',
    'execute': 'yedan-cloud-executor', 'general': 'yedan-cloud-executor', 'monitoring': 'yedan-cloud-executor',
  };
  const workerId = routing[task.type] || 'yedan-cloud-executor';
  return FLEET_WORKERS.find(w => w.id === workerId);
}

// === REVENUE AGGREGATION ===
async function aggregateRevenue(env) {
  try {
    const { results } = await env.ARMY_DB.prepare(
      `SELECT source, SUM(amount) as total, COUNT(*) as count FROM revenue_ledger WHERE status = 'confirmed' GROUP BY source`
    ).all();
    const totalUSD = results?.reduce((sum, r) => sum + (r.total || 0), 0) || 0;

    let liveRevenue = null;
    try {
      const resp = await fetch('https://product-store.yagami8095.workers.dev/api/orders', { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const data = await resp.json();
        const paid = (data.orders || []).filter(o => o.status === 'paid');
        liveRevenue = { total: paid.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0), count: paid.length };
      }
    } catch {}

    return { confirmed_total_usd: totalUSD, sources: results || [], live: liveRevenue };
  } catch (e) {
    return { error: e.message };
  }
}

// === METRICS ===
async function recordMetrics(env, fleet, tasks, revenue, duration) {
  try {
    await env.ARMY_DB.batch([
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-orchestrator', 'fleet_healthy', fleet.healthy, 'count'),
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-orchestrator', 'tasks_dispatched', tasks.dispatched || 0, 'count'),
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-orchestrator', 'revenue_usd', revenue.confirmed_total_usd || 0, 'USD'),
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-orchestrator', 'orchestration_duration', duration, 'ms'),
    ]);
  } catch {}
}

// === ENDPOINTS ===
async function getFleetStatus(env) {
  const cached = await env.ARMY_KV.get('orchestrator:last-run', 'json').catch(() => null);
  const { results: workers } = await env.ARMY_DB.prepare(
    `SELECT id, name, type, status, last_heartbeat, tasks_completed, error_count FROM fleet_workers`
  ).all().catch(() => ({ results: [] }));
  return json({ fleet: 'YEDAN Cloud Army v2.0', ooda: 'ORIENT+DECIDE', timestamp: new Date().toISOString(), workers: workers || [], last_orchestration: cached });
}

async function getFleetDetails(env) {
  const { results: workers } = await env.ARMY_DB.prepare(`SELECT * FROM fleet_workers`).all().catch(() => ({ results: [] }));
  const { results: metrics } = await env.ARMY_DB.prepare(
    `SELECT worker_id, metric_name, metric_value, unit, recorded_at FROM fleet_metrics ORDER BY recorded_at DESC LIMIT 50`
  ).all().catch(() => ({ results: [] }));
  return json({ workers, metrics });
}

async function getRevenueReport(env) {
  const { results: ledger } = await env.ARMY_DB.prepare(`SELECT * FROM revenue_ledger ORDER BY recorded_at DESC`).all().catch(() => ({ results: [] }));
  const { results: totals } = await env.ARMY_DB.prepare(
    `SELECT source, SUM(amount) as total, COUNT(*) as orders FROM revenue_ledger WHERE status = 'confirmed' GROUP BY source`
  ).all().catch(() => ({ results: [] }));
  return json({ grand_total_usd: totals?.reduce((s, r) => s + (r.total || 0), 0) || 0, by_source: totals, entries: ledger });
}

async function getIntelReport(env) {
  const { results: recent } = await env.ARMY_DB.prepare(
    `SELECT a.score, a.opportunity, a.action_needed, a.created_at as analyzed_at, f.source, f.title, f.url
     FROM intel_analysis a JOIN intel_feed f ON a.feed_id = f.id ORDER BY a.created_at DESC LIMIT 20`
  ).all().catch(() => ({ results: [] }));
  return json({ recent_analyses: recent });
}

async function dispatchTask(request, env) {
  try {
    const { type, priority, payload } = await request.json();
    if (!type) return json({ error: 'type required' }, 400);
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await env.ARMY_DB.prepare(`INSERT INTO fleet_tasks (id, type, priority, payload) VALUES (?, ?, ?, ?)`)
      .bind(id, type, priority || 5, JSON.stringify(payload || {})).run();
    return json({ ok: true, task_id: id });
  } catch (e) { return json({ error: e.message }, 500); }
}

async function getReflection(env) {
  const lastReflection = await env.ARMY_KV.get('orchestrator:last-reflection', 'json').catch(() => null);
  const { results: recentCompleted } = await env.ARMY_DB.prepare(`
    SELECT type, worker_id, COUNT(*) as count,
      AVG(ROUND((julianday(completed_at) - julianday(created_at)) * 86400, 0)) as avg_duration
    FROM fleet_tasks WHERE status = 'completed' AND completed_at > datetime('now', '-24 hours')
    GROUP BY type, worker_id ORDER BY count DESC
  `).all().catch(() => ({ results: [] }));
  const { results: recentFailed } = await env.ARMY_DB.prepare(`
    SELECT type, worker_id, COUNT(*) as count, GROUP_CONCAT(result, ' | ') as errors
    FROM fleet_tasks WHERE status = 'failed' AND created_at > datetime('now', '-24 hours')
    GROUP BY type, worker_id ORDER BY count DESC
  `).all().catch(() => ({ results: [] }));
  // Failure pattern KV data
  const failPatterns = {};
  for (const ft of ['content', 'intel', 'revenue-action', 'general', 'monitoring', 'health-check']) {
    const count = parseInt(await env.ARMY_KV.get(`reflect:fail:${ft}`) || '0');
    if (count > 0) failPatterns[ft] = count;
  }
  return json({
    last_reflection: lastReflection,
    last_24h: { completed_by_type: recentCompleted, failed_by_type: recentFailed },
    failure_patterns: failPatterns,
    circuit_breakers: Object.fromEntries(
      await Promise.all(FLEET_WORKERS.map(async w => [w.id, await env.ARMY_KV.get(`circuit:${w.id}`, 'json').catch(() => null)]))
    )
  });
}

async function getMetrics(env) {
  const { results } = await env.ARMY_DB.prepare(
    `SELECT worker_id, metric_name, metric_value, unit, recorded_at FROM fleet_metrics ORDER BY recorded_at DESC LIMIT 100`
  ).all().catch(() => ({ results: [] }));
  return json({ metrics: results });
}

// === TELEGRAM (with 5-min dedup) ===
async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  const dedupKey = `alert:last:orch:${text.slice(0, 30).replace(/\W/g, '')}`;
  try {
    const last = await env.ARMY_KV.get(dedupKey);
    if (last) return;
    await env.ARMY_KV.put(dedupKey, Date.now().toString(), { expirationTtl: 300 });
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {}
}

// === PHASE 5: REFLECT — Learn from outcomes ===
async function reflectOnOutcomes(env) {
  try {
    // Get recently completed tasks (last 30 min)
    const { results: completed } = await env.ARMY_DB.prepare(`
      SELECT id, type, worker_id, result, created_at, completed_at,
        ROUND((julianday(completed_at) - julianday(created_at)) * 86400, 0) as duration_sec
      FROM fleet_tasks
      WHERE status = 'completed' AND completed_at > datetime('now', '-30 minutes')
      ORDER BY completed_at DESC LIMIT 10
    `).all();

    // Get recently failed tasks
    const { results: failed } = await env.ARMY_DB.prepare(`
      SELECT id, type, worker_id, result, created_at
      FROM fleet_tasks
      WHERE status = 'failed' AND created_at > datetime('now', '-30 minutes')
      ORDER BY created_at DESC LIMIT 5
    `).all();

    let lessons = 0;

    // Write outcome feedback to Graph RAG
    for (const task of (completed || [])) {
      try {
        const result = safeJsonParse(task.result);
        const isPositive = !result.error && result.status !== 'ai_failed';
        await fetch('https://yedan-graph-rag.yagami8095.workers.dev/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.FLEET_AUTH_TOKEN || ''}` },
          body: JSON.stringify({
            entity_id: task.worker_id,
            feedback_type: 'task_outcome',
            outcome: isPositive ? 'success' : 'partial',
            score: isPositive ? 1 : -1
          }),
          signal: AbortSignal.timeout(3000)
        });
        lessons++;
      } catch {}
    }

    // Track failure patterns — if a worker type keeps failing, reduce future dispatch
    for (const task of (failed || [])) {
      try {
        const failKey = `reflect:fail:${task.type}`;
        const prev = parseInt(await env.ARMY_KV.get(failKey) || '0');
        await env.ARMY_KV.put(failKey, String(prev + 1), { expirationTtl: 3600 });
        // If 3+ failures of same type in 1 hour, skip creating more of this type
        lessons++;
      } catch {}
    }

    // Store reflection summary
    const summary = {
      completed: completed?.length || 0,
      failed: failed?.length || 0,
      lessons_recorded: lessons,
      avg_duration_sec: completed?.length > 0
        ? Math.round(completed.reduce((s, t) => s + (t.duration_sec || 0), 0) / completed.length)
        : 0
    };
    await env.ARMY_KV.put('orchestrator:last-reflection', JSON.stringify(summary), { expirationTtl: 3600 });

    return summary;
  } catch (e) {
    return { error: e.message };
  }
}

// === GRAPH RAG CONTEXT-AWARE QUERY ===
async function queryGraphRAGContext(env, query) {
  try {
    const resp = await fetch('https://yedan-graph-rag.yagami8095.workers.dev/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.FLEET_AUTH_TOKEN || ''}` },
      body: JSON.stringify({ query, max_hops: 1, limit: 5 }),
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.context || '';
    }
  } catch {}
  return '';
}

function safeJsonParse(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

// === GRAPH RAG INTEGRATION ===
async function writeToGraphRAG(env, eventType, data) {
  try {
    const entities = [];
    const relationships = [];

    // Write orchestration event as entity
    const eventId = `event-${eventType}-${Date.now()}`;
    entities.push({
      id: eventId,
      type: 'event',
      name: `${eventType} ${new Date().toISOString().slice(0, 16)}`,
      properties: { event_type: eventType, timestamp: new Date().toISOString() },
      summary: `Orchestration ${eventType} cycle`
    });
    relationships.push({ source: 'yedan-orchestrator', target: eventId, type: 'generates', layer: 'temporal' });

    await fetch('https://yedan-graph-rag.yagami8095.workers.dev/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.FLEET_AUTH_TOKEN || ''}` },
      body: JSON.stringify({ entities, relationships, source: 'orchestrator' }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {}
}

// === BUNSHIN (with D1 mirror fallback) ===
async function reportToBunshin(report, env) {
  const payload = JSON.stringify({ key: 'fleet-orchestrator-status', value: report, context: 'OODA Orchestrator v2.0' });
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.BUNSHIN_AUTH_TOKEN || ''}` };
  try {
    const res = await fetch(`${BUNSHIN_URL}/api/brain`, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(8000) });
    if (res.ok) return;
  } catch {}
  // Fallback to D1 mirror
  try {
    await fetch('https://bunshin-mirror.yagami8095.workers.dev/api/brain', { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(5000) });
  } catch {}
}

async function logEvent(env, workerId, eventType, severity, message) {
  try {
    await env.ARMY_DB.prepare(`INSERT INTO fleet_events (worker_id, event_type, severity, message) VALUES (?, ?, ?, ?)`)
      .bind(workerId, eventType, severity, message).run();
  } catch {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store' }
  });
}
