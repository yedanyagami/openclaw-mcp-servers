// ============================================================
// OODAAgent — Persistent OODA Loop Durable Object
// Self-scheduling via alarms (replaces cron Workers)
// SQLite-backed state, hibernates when idle (zero cost)
// ============================================================

import { DurableObject } from 'cloudflare:workers';

export class OODAAgent extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
  }

  // Initialize DO state and start OODA loop
  async init() {
    // Create state table if not exists
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS agent_state (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS ooda_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase TEXT,
        input TEXT,
        output TEXT,
        duration_ms INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Set initial state
    this._setState('status', 'active');
    this._setState('cycle_count', '0');
    this._setState('last_cycle', new Date().toISOString());

    // Schedule first OODA cycle (2 minutes)
    await this.ctx.storage.setAlarm(Date.now() + 120_000);

    return { ok: true, message: 'OODAAgent initialized, first cycle in 2 minutes' };
  }

  // Self-scheduling alarm — replaces cron
  async alarm() {
    const startTime = Date.now();
    const cycleCount = parseInt(this._getState('cycle_count') || '0') + 1;

    try {
      // OBSERVE — gather intelligence
      const observations = await this._observe();

      // ORIENT — analyze context
      const analysis = await this._orient(observations);

      // DECIDE — determine actions
      const decisions = await this._decide(analysis);

      // ACT — execute decisions
      const results = await this._act(decisions);

      // Persist cycle results
      const duration = Date.now() - startTime;
      this.ctx.storage.sql.exec(
        `INSERT INTO ooda_cycles (phase, input, output, duration_ms)
         VALUES ('complete', ?, ?, ?)`,
        JSON.stringify({ observations: observations.length, analysis: analysis.summary }),
        JSON.stringify({ decisions: decisions.length, results: results.length }),
        duration
      );

      this._setState('cycle_count', String(cycleCount));
      this._setState('last_cycle', new Date().toISOString());
      this._setState('last_duration_ms', String(duration));

      // Self-schedule next cycle (adaptive interval: 2-10 min based on activity)
      const interval = results.length > 0 ? 120_000 : 300_000; // More active → shorter interval
      await this.ctx.storage.setAlarm(Date.now() + interval);

    } catch (e) {
      console.error(`[OODAAgent] Cycle ${cycleCount} error: ${e.message}`);
      this._setState('last_error', e.message);
      // Retry in 5 minutes on error
      await this.ctx.storage.setAlarm(Date.now() + 300_000);
    }
  }

  // OBSERVE: Gather intelligence from fleet + external sources
  async _observe() {
    const observations = [];

    // Fleet health via Service Binding
    try {
      const resp = await this.env.FLEET_GATEWAY.fetch(
        new Request('http://internal/v1/fleet/status', {
          headers: { 'Authorization': `Bearer ${this.env.FLEET_GATEWAY_TOKEN || ''}` }
        })
      );
      const data = await resp.json();
      observations.push({ source: 'fleet-status', data: { total: data.total, alive: data.alive, healthy: data.healthy } });
    } catch (e) {
      observations.push({ source: 'fleet-status', error: e.message });
    }

    // Recent KG entities
    try {
      const resp = await this.env.GRAPH_RAG.fetch(
        new Request('http://internal/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'recent events and tasks', limit: 5 }),
        })
      );
      const data = await resp.json();
      observations.push({ source: 'knowledge-graph', count: (data.results || []).length });
    } catch (e) {
      observations.push({ source: 'knowledge-graph', error: e.message });
    }

    return observations;
  }

  // ORIENT: Analyze observations with AI
  async _orient(observations) {
    try {
      const result = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are an AGI OODA loop agent. Analyze observations and identify patterns, threats, and opportunities. Be concise (max 100 words).' },
          { role: 'user', content: `Observations:\n${JSON.stringify(observations, null, 2)}` },
        ],
        max_tokens: 256,
      });
      return { summary: result.response || 'No analysis', observations_count: observations.length };
    } catch (e) {
      return { summary: `Analysis failed: ${e.message}`, observations_count: observations.length };
    }
  }

  // DECIDE: Determine actions based on analysis
  async _decide(analysis) {
    const decisions = [];

    // Check if any Workers are down → queue health dispatch
    if (analysis.summary.toLowerCase().includes('down') || analysis.summary.toLowerCase().includes('fail')) {
      decisions.push({ action: 'health-check', priority: 'high', reason: 'Workers may be down' });
    }

    // Check if knowledge graph needs update
    if (analysis.summary.toLowerCase().includes('stale') || analysis.summary.toLowerCase().includes('outdated')) {
      decisions.push({ action: 'kg-refresh', priority: 'normal', reason: 'Knowledge may be stale' });
    }

    // Consult AGIBrain DO for routing recommendation
    try {
      const brainId = this.env.AGI_BRAIN.idFromName('primary');
      const brainStub = this.env.AGI_BRAIN.get(brainId);
      const rec = await brainStub.fetch(new Request('http://internal/recommend?task_type=monitoring'));
      const recData = await rec.json();
      if (recData.recommendation) {
        this._setState('preferred_brain', recData.recommendation.recommended);
      }
    } catch (e) {
      // AGIBrain may not be initialized yet — non-fatal
    }

    // For complex analysis, consult VM brains via external fetch
    if (analysis.summary.length > 200 || analysis.observations_count > 3) {
      try {
        const rendanUrl = this.env.RENDAN_URL || 'http://161.33.7.159:18790';
        const rendanToken = this.env.RENDAN_API_TOKEN || '';
        const resp = await fetch(`${rendanUrl}/v1/plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${rendanToken}`,
          },
          body: JSON.stringify({ payload: `Based on fleet analysis: ${analysis.summary.substring(0, 500)}. What actions should the OODA agent take?` }),
          signal: AbortSignal.timeout(15000),
        });
        if (resp.ok) {
          const planData = await resp.json();
          if (planData.plan?.steps) {
            for (const step of planData.plan.steps.slice(0, 3)) {
              decisions.push({
                action: 'vm-brain-recommended',
                priority: 'normal',
                reason: step.description,
                source: 'rendan',
              });
            }
          }
        }
      } catch (e) {
        // VM brain unreachable — continue with edge-only decisions
      }
    }

    return decisions;
  }

  // ACT: Execute decisions via Queue dispatch
  async _act(decisions) {
    const results = [];

    for (const decision of decisions) {
      if (this.env.TASK_QUEUE) {
        try {
          await this.env.TASK_QUEUE.send({
            type: 'dispatch',
            target: decision.action === 'health-check' ? 'health-commander' : 'intel-ops',
            payload: { reason: decision.reason, source: 'ooda-agent' },
            priority: decision.priority,
            created: Date.now(),
          });
          results.push({ ...decision, status: 'queued' });
        } catch (e) {
          results.push({ ...decision, status: 'error', error: e.message });
        }
      }
    }

    return results;
  }

  // Helper: get/set state
  _getState(key) {
    const rows = this.ctx.storage.sql.exec('SELECT value FROM agent_state WHERE key = ?', key).toArray();
    return rows.length > 0 ? rows[0].value : null;
  }

  _setState(key, value) {
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO agent_state (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      key, value
    );
  }

  // HTTP handler for DO
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/init' && request.method === 'POST') {
      return Response.json(await this.init());
    }

    if (url.pathname === '/status') {
      const state = {};
      const rows = this.ctx.storage.sql.exec('SELECT key, value FROM agent_state').toArray();
      for (const row of rows) state[row.key] = row.value;

      const recentCycles = this.ctx.storage.sql.exec(
        'SELECT * FROM ooda_cycles ORDER BY id DESC LIMIT 5'
      ).toArray();

      return Response.json({ state, recent_cycles: recentCycles });
    }

    if (url.pathname === '/trigger' && request.method === 'POST') {
      await this.alarm();
      return Response.json({ ok: true, message: 'OODA cycle triggered manually' });
    }

    return Response.json({ error: 'Not found', routes: ['/init', '/status', '/trigger'] }, { status: 404 });
  }
}
