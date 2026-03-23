// ============================================================
// UnifiedBrainCortex — Single Decision Authority for ALL OODA
// ============================================================
// Replaces 7 fragmented OODA loops with ONE unified brain.
// SQLite-backed persistent state. Event-driven feedback loop.
//
// Tables:
//   observations — from ANY source (intel, health, metrics, KG)
//   decisions — routing decisions with confidence + results
//   routing_rules — learned task→brain affinity (auto-updated)
//   feedback_loop — outcome tracking for continuous improvement
//
// Endpoints:
//   POST /observe — accept observation from any source
//   POST /orient — trigger AI analysis of recent observations
//   POST /decide — get routing decision for a task
//   POST /act — dispatch task to chosen brain/worker
//   POST /reflect — record outcome, update routing rules
//   GET /state — full brain state
//   GET /dashboard — aggregated metrics
// ============================================================

import { DurableObject } from 'cloudflare:workers';

export class UnifiedCortex extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.ctx = ctx;
    this._initDB();
  }

  _initDB() {
    const sql = this.ctx.storage.sql;

    sql.exec(`CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      score REAL DEFAULT 0,
      processed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    sql.exec(`CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      observation_ids TEXT,
      task TEXT NOT NULL,
      brain TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      action TEXT,
      result TEXT,
      status TEXT DEFAULT 'pending',
      latency_ms INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    sql.exec(`CREATE TABLE IF NOT EXISTS routing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_type TEXT NOT NULL UNIQUE,
      preferred_brain TEXT NOT NULL,
      success_rate REAL DEFAULT 0.5,
      avg_latency_ms REAL DEFAULT 1000,
      total_attempts INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    )`);

    sql.exec(`CREATE TABLE IF NOT EXISTS feedback_loop (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_id INTEGER,
      outcome TEXT NOT NULL,
      success INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      lessons TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    // Seed default routing rules if empty
    const count = sql.exec('SELECT COUNT(*) as c FROM routing_rules').one().c;
    if (count === 0) {
      const defaults = [
        ['planning', 'rendan', 0.7],
        ['code_analysis', 'golem', 0.65],
        ['security_audit', 'cf-workers-ai', 0.6],
        ['research', 'rendan', 0.6],
        ['health_check', 'cf-workers-ai', 0.8],
        ['skill_synthesis', 'rendan', 0.7],
        ['council_debate', 'golem-hub', 0.75],
        ['ab_test', 'cf-workflows', 0.6],
        ['general', 'rendan', 0.5],
      ];
      for (const [type, brain, rate] of defaults) {
        sql.exec(
          `INSERT INTO routing_rules (task_type, preferred_brain, success_rate) VALUES (?, ?, ?)`,
          type, brain, rate
        );
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/observe' && request.method === 'POST') return this._observe(await request.json());
      if (path === '/orient' && request.method === 'POST') return this._orient(await request.json());
      if (path === '/decide' && request.method === 'POST') return this._decide(await request.json());
      if (path === '/act' && request.method === 'POST') return this._act(await request.json());
      if (path === '/reflect' && request.method === 'POST') return this._reflect(await request.json());
      if (path === '/state' && request.method === 'GET') return this._getState();
      if (path === '/dashboard' && request.method === 'GET') return this._getDashboard();
      if (path === '/health') return Response.json({ status: 'ok', cortex: 'unified', timestamp: new Date().toISOString() });

      return Response.json({ error: 'Unknown endpoint', routes: ['/observe', '/orient', '/decide', '/act', '/reflect', '/state', '/dashboard'] }, { status: 404 });
    } catch (e) {
      return Response.json({ error: e.message, stack: e.stack?.substring(0, 200) }, { status: 500 });
    }
  }

  // ── OBSERVE: Accept observation from ANY source ──
  async _observe(body) {
    const { source, type, content, score } = body;
    if (!source || !content) return Response.json({ error: 'Missing source or content' }, { status: 400 });

    const sql = this.ctx.storage.sql;
    sql.exec(
      `INSERT INTO observations (source, type, content, score) VALUES (?, ?, ?, ?)`,
      source, type || 'general', typeof content === 'string' ? content : JSON.stringify(content), score || 0
    );

    const id = sql.exec('SELECT last_insert_rowid() as id').one().id;

    // Auto-orient if we have 5+ unprocessed observations
    const unprocessed = sql.exec('SELECT COUNT(*) as c FROM observations WHERE processed = 0').one().c;
    if (unprocessed >= 5) {
      // Trigger orient asynchronously via alarm
      this.ctx.storage.setAlarm(Date.now() + 100); // 100ms delay
    }

    return Response.json({ ok: true, observation_id: id, unprocessed });
  }

  // ── ORIENT: AI analysis of recent observations ──
  async _orient(body = {}) {
    const sql = this.ctx.storage.sql;
    const observations = [...sql.exec(
      'SELECT * FROM observations WHERE processed = 0 ORDER BY created_at DESC LIMIT 20'
    )];

    if (observations.length === 0) {
      return Response.json({ ok: true, message: 'No unprocessed observations' });
    }

    // Use Workers AI for analysis
    let analysis;
    try {
      const result = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          {
            role: 'system',
            content: `You are the UnifiedBrainCortex — the central intelligence of the OpenClaw AGI fleet.
Analyze observations and produce a JSON response:
{
  "summary": "brief analysis",
  "priority_actions": [{"task": "...", "task_type": "planning|code_analysis|security_audit|research|health_check|skill_synthesis|council_debate|general", "urgency": "high|medium|low", "reasoning": "..."}],
  "patterns": ["..."],
  "risk_level": "low|medium|high|critical"
}`
          },
          {
            role: 'user',
            content: `Recent observations (${observations.length}):\n${observations.map(o =>
              `[${o.source}/${o.type}] score=${o.score}: ${String(o.content).substring(0, 200)}`
            ).join('\n')}`
          }
        ],
        max_tokens: 1024,
      });
      try { analysis = JSON.parse(result.response); } catch { analysis = { summary: result.response, priority_actions: [], patterns: [], risk_level: 'low' }; }
    } catch (e) {
      analysis = { summary: `AI analysis failed: ${e.message}`, priority_actions: [], patterns: [], risk_level: 'unknown' };
    }

    // Mark observations as processed
    const ids = observations.map(o => o.id);
    sql.exec(`UPDATE observations SET processed = 1 WHERE id IN (${ids.join(',')})`);

    // Auto-decide for high-urgency actions
    const highPriority = (analysis.priority_actions || []).filter(a => a.urgency === 'high');
    const autoDecisions = [];
    for (const action of highPriority) {
      const decision = await this._makeDecision(action.task, action.task_type);
      autoDecisions.push(decision);
    }

    return Response.json({
      ok: true,
      observations_analyzed: observations.length,
      analysis,
      auto_decisions: autoDecisions,
    });
  }

  // ── DECIDE: Get routing decision for a task ──
  async _decide(body) {
    const { task, task_type } = body;
    if (!task) return Response.json({ error: 'Missing task' }, { status: 400 });

    const decision = await this._makeDecision(task, task_type || 'general');
    return Response.json({ ok: true, decision });
  }

  async _makeDecision(task, taskType) {
    const sql = this.ctx.storage.sql;

    // Look up routing rule
    let rule = sql.exec('SELECT * FROM routing_rules WHERE task_type = ?', taskType).toArray()[0];
    if (!rule) {
      rule = sql.exec('SELECT * FROM routing_rules WHERE task_type = ?', 'general').toArray()[0];
    }

    // Check brain health from KV
    let brainHealth = {};
    try {
      const rendanMetrics = await this.env.KV.get('vm-metrics-rendan', 'json');
      const golemMetrics = await this.env.KV.get('vm-metrics-golem', 'json');
      brainHealth = {
        rendan: rendanMetrics ? { available: true, agi_score: rendanMetrics.agi_score?.total || 0 } : { available: false },
        golem: golemMetrics ? { available: true, agi_score: golemMetrics.agi_score?.total || 0 } : { available: false },
      };
    } catch { /* KV may not have data yet */ }

    // Choose brain: prefer rule, fall back to healthiest available
    let chosenBrain = rule?.preferred_brain || 'rendan';
    let confidence = rule?.success_rate || 0.5;

    // If preferred brain is unavailable, fall back
    if (chosenBrain === 'rendan' && !brainHealth.rendan?.available && brainHealth.golem?.available) {
      chosenBrain = 'golem';
      confidence *= 0.8;
    } else if (chosenBrain === 'golem' && !brainHealth.golem?.available && brainHealth.rendan?.available) {
      chosenBrain = 'rendan';
      confidence *= 0.8;
    }

    // Record decision
    sql.exec(
      `INSERT INTO decisions (task, brain, confidence, status) VALUES (?, ?, ?, 'pending')`,
      task.substring(0, 500), chosenBrain, confidence
    );
    const decisionId = sql.exec('SELECT last_insert_rowid() as id').one().id;

    return {
      decision_id: decisionId,
      brain: chosenBrain,
      confidence,
      task_type: taskType,
      brain_health: brainHealth,
      rule: rule ? { preferred: rule.preferred_brain, success_rate: rule.success_rate, attempts: rule.total_attempts } : null,
    };
  }

  // ── ACT: Dispatch task to chosen brain/worker ──
  async _act(body) {
    const { decision_id, brain, task } = body;
    if (!decision_id || !task) return Response.json({ error: 'Missing decision_id or task' }, { status: 400 });

    const sql = this.ctx.storage.sql;
    const startTime = Date.now();
    let result, success = false;

    try {
      // Dispatch based on brain type
      if (brain === 'rendan' || brain === 'golem') {
        // Enqueue for VM processing via queue (CF can't reach private VMs)
        await this.env.TASK_QUEUE.send({
          type: 'vm-dispatch',
          brain,
          task,
          decision_id,
          timestamp: new Date().toISOString(),
        });
        result = { dispatched: true, via: 'queue', brain };
        success = true;
      } else if (brain === 'cf-workers-ai') {
        // Use Workers AI directly
        const aiResult = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            { role: 'system', content: 'You are an AI assistant. Respond concisely and accurately.' },
            { role: 'user', content: task },
          ],
          max_tokens: 512,
        });
        result = { response: aiResult.response, via: 'workers-ai' };
        success = true;
      } else if (brain === 'golem-hub') {
        // Dispatch via fleet-gateway to Hub
        const resp = await this.env.FLEET_GATEWAY.fetch(
          new Request('http://internal/v1/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worker: 'orchestrator', payload: { action: task } }),
          })
        );
        result = await resp.json();
        success = resp.ok;
      } else {
        // Default: use fleet-gateway dispatch
        const resp = await this.env.FLEET_GATEWAY.fetch(
          new Request('http://internal/v1/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worker: brain, payload: { action: task } }),
          })
        );
        result = await resp.json();
        success = resp.ok;
      }
    } catch (e) {
      result = { error: e.message };
    }

    const latency = Date.now() - startTime;

    // Update decision
    sql.exec(
      `UPDATE decisions SET status = ?, result = ?, latency_ms = ? WHERE id = ?`,
      success ? 'completed' : 'failed',
      JSON.stringify(result).substring(0, 2000),
      latency,
      decision_id
    );

    return Response.json({ ok: true, decision_id, brain, success, latency_ms: latency, result });
  }

  // ── REFLECT: Record outcome and update routing rules ──
  async _reflect(body) {
    const { decision_id, outcome, success, latency_ms, lessons } = body;
    if (!decision_id) return Response.json({ error: 'Missing decision_id' }, { status: 400 });

    const sql = this.ctx.storage.sql;

    // Record feedback
    sql.exec(
      `INSERT INTO feedback_loop (decision_id, outcome, success, latency_ms, lessons) VALUES (?, ?, ?, ?, ?)`,
      decision_id, outcome || '', success ? 1 : 0, latency_ms || 0, lessons || ''
    );

    // Get the decision to update routing rules
    const decision = sql.exec('SELECT * FROM decisions WHERE id = ?', decision_id).toArray()[0];
    if (decision) {
      // Update routing rule with exponential moving average
      const rule = sql.exec('SELECT * FROM routing_rules WHERE preferred_brain = ?', decision.brain).toArray()[0];
      if (rule) {
        const alpha = 0.2; // Learning rate
        const newSuccessRate = rule.success_rate * (1 - alpha) + (success ? 1 : 0) * alpha;
        const newLatency = rule.avg_latency_ms * (1 - alpha) + (latency_ms || 0) * alpha;
        sql.exec(
          `UPDATE routing_rules SET success_rate = ?, avg_latency_ms = ?, total_attempts = total_attempts + 1, updated_at = datetime('now') WHERE id = ?`,
          newSuccessRate, newLatency, rule.id
        );
      }
    }

    return Response.json({ ok: true, decision_id, feedback_recorded: true });
  }

  // ── STATE: Full brain state dump ──
  async _getState() {
    const sql = this.ctx.storage.sql;

    const recentObs = [...sql.exec('SELECT * FROM observations ORDER BY created_at DESC LIMIT 10')];
    const recentDec = [...sql.exec('SELECT * FROM decisions ORDER BY created_at DESC LIMIT 10')];
    const rules = [...sql.exec('SELECT * FROM routing_rules ORDER BY success_rate DESC')];
    const recentFeedback = [...sql.exec('SELECT * FROM feedback_loop ORDER BY created_at DESC LIMIT 10')];

    return Response.json({
      cortex: 'unified',
      observations: { recent: recentObs, total: sql.exec('SELECT COUNT(*) as c FROM observations').one().c },
      decisions: { recent: recentDec, total: sql.exec('SELECT COUNT(*) as c FROM decisions').one().c },
      routing_rules: rules,
      feedback: { recent: recentFeedback, total: sql.exec('SELECT COUNT(*) as c FROM feedback_loop').one().c },
      timestamp: new Date().toISOString(),
    });
  }

  // ── DASHBOARD: Aggregated metrics ──
  async _getDashboard() {
    const sql = this.ctx.storage.sql;

    const totalObs = sql.exec('SELECT COUNT(*) as c FROM observations').one().c;
    const totalDec = sql.exec('SELECT COUNT(*) as c FROM decisions').one().c;
    const successDec = sql.exec("SELECT COUNT(*) as c FROM decisions WHERE status = 'completed'").one().c;
    const failedDec = sql.exec("SELECT COUNT(*) as c FROM decisions WHERE status = 'failed'").one().c;
    const rules = [...sql.exec('SELECT task_type, preferred_brain, success_rate, avg_latency_ms, total_attempts FROM routing_rules ORDER BY success_rate DESC')];

    // Brain utilization
    const brainUsage = [...sql.exec(`
      SELECT brain, COUNT(*) as tasks, AVG(latency_ms) as avg_latency,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successes
      FROM decisions GROUP BY brain
    `)];

    // Recent activity rate
    const lastHourObs = sql.exec("SELECT COUNT(*) as c FROM observations WHERE created_at > datetime('now', '-1 hour')").one().c;
    const lastHourDec = sql.exec("SELECT COUNT(*) as c FROM decisions WHERE created_at > datetime('now', '-1 hour')").one().c;

    return Response.json({
      cortex: 'unified',
      totals: { observations: totalObs, decisions: totalDec, success: successDec, failed: failedDec },
      success_rate: totalDec > 0 ? (successDec / totalDec * 100).toFixed(1) + '%' : 'N/A',
      routing_rules: rules,
      brain_utilization: brainUsage,
      activity_rate: { observations_per_hour: lastHourObs, decisions_per_hour: lastHourDec },
      timestamp: new Date().toISOString(),
    });
  }

  // ── Alarm handler for auto-orient ──
  async alarm() {
    await this._orient({});
  }
}
