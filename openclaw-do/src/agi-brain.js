// ============================================================
// AGIBrain — Persistent Learning Durable Object
// Accumulates knowledge across OODA cycles
// Tracks: task success rates, brain quality, latency trends
// Self-improves routing decisions based on historical data
// ============================================================

import { DurableObject } from 'cloudflare:workers';

export class AGIBrain extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
  }

  async init() {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS brain_metrics (
        brain TEXT,
        metric TEXT,
        value REAL,
        count INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (brain, metric)
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS routing_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_type TEXT,
        chosen_brain TEXT,
        success INTEGER,
        latency_ms INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS learning_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insight TEXT,
        confidence REAL,
        source TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    return { ok: true, message: 'AGIBrain initialized with persistent learning tables' };
  }

  // Record a task outcome for routing improvement
  async recordOutcome(taskType, brain, success, latencyMs) {
    // Record individual decision
    this.ctx.storage.sql.exec(
      `INSERT INTO routing_decisions (task_type, chosen_brain, success, latency_ms)
       VALUES (?, ?, ?, ?)`,
      taskType, brain, success ? 1 : 0, latencyMs
    );

    // Update aggregate metrics (exponential moving average)
    const alpha = 0.1; // Learning rate
    const existing = this.ctx.storage.sql.exec(
      'SELECT value, count FROM brain_metrics WHERE brain = ? AND metric = ?',
      brain, 'success_rate'
    ).toArray();

    if (existing.length > 0) {
      const newValue = existing[0].value * (1 - alpha) + (success ? 1 : 0) * alpha;
      this.ctx.storage.sql.exec(
        `UPDATE brain_metrics SET value = ?, count = count + 1, updated_at = datetime('now')
         WHERE brain = ? AND metric = ?`,
        newValue, brain, 'success_rate'
      );
    } else {
      this.ctx.storage.sql.exec(
        `INSERT INTO brain_metrics (brain, metric, value) VALUES (?, 'success_rate', ?)`,
        brain, success ? 1.0 : 0.0
      );
    }

    // Update latency metric
    const existingLatency = this.ctx.storage.sql.exec(
      'SELECT value FROM brain_metrics WHERE brain = ? AND metric = ?',
      brain, 'avg_latency_ms'
    ).toArray();

    if (existingLatency.length > 0) {
      const newLatency = existingLatency[0].value * (1 - alpha) + latencyMs * alpha;
      this.ctx.storage.sql.exec(
        `UPDATE brain_metrics SET value = ?, count = count + 1, updated_at = datetime('now')
         WHERE brain = ? AND metric = ?`,
        newLatency, brain, 'avg_latency_ms'
      );
    } else {
      this.ctx.storage.sql.exec(
        `INSERT INTO brain_metrics (brain, metric, value) VALUES (?, 'avg_latency_ms', ?)`,
        brain, latencyMs
      );
    }
  }

  // Get best brain for a task type based on historical performance
  getBestBrain(taskType) {
    // Check historical success rate for this task type
    const stats = this.ctx.storage.sql.exec(
      `SELECT chosen_brain,
              AVG(success) as success_rate,
              AVG(latency_ms) as avg_latency,
              COUNT(*) as total
       FROM routing_decisions
       WHERE task_type = ?
       GROUP BY chosen_brain
       HAVING total >= 3
       ORDER BY success_rate DESC, avg_latency ASC
       LIMIT 5`,
      taskType
    ).toArray();

    if (stats.length === 0) return null;
    return {
      recommended: stats[0].chosen_brain,
      confidence: stats[0].success_rate,
      alternatives: stats.slice(1).map(s => ({
        brain: s.chosen_brain,
        success_rate: s.success_rate,
        avg_latency: Math.round(s.avg_latency),
      })),
    };
  }

  // Record a learning insight
  async learn(insight, confidence, source) {
    this.ctx.storage.sql.exec(
      `INSERT INTO learning_log (insight, confidence, source) VALUES (?, ?, ?)`,
      insight, confidence, source
    );
  }

  // HTTP handler
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/init' && request.method === 'POST') {
      return Response.json(await this.init());
    }

    if (url.pathname === '/record' && request.method === 'POST') {
      const body = await request.json();
      await this.recordOutcome(body.task_type, body.brain, body.success, body.latency_ms || 0);
      return Response.json({ ok: true });
    }

    if (url.pathname === '/recommend') {
      const taskType = new URL(request.url).searchParams.get('task_type') || 'general';
      const recommendation = this.getBestBrain(taskType);
      return Response.json({ task_type: taskType, recommendation });
    }

    if (url.pathname === '/metrics') {
      const metrics = this.ctx.storage.sql.exec('SELECT * FROM brain_metrics ORDER BY brain, metric').toArray();
      const decisions = this.ctx.storage.sql.exec('SELECT COUNT(*) as total FROM routing_decisions').toArray();
      const insights = this.ctx.storage.sql.exec('SELECT * FROM learning_log ORDER BY id DESC LIMIT 10').toArray();
      return Response.json({ metrics, total_decisions: decisions[0]?.total || 0, recent_insights: insights });
    }

    if (url.pathname === '/learn' && request.method === 'POST') {
      const body = await request.json();
      await this.learn(body.insight, body.confidence || 0.5, body.source || 'manual');
      return Response.json({ ok: true });
    }

    // Sync metrics from VM brains (rendan + GOLEM)
    if (url.pathname === '/sync-vm' && request.method === 'POST') {
      const results = { synced: [] };

      // Fetch rendan metrics
      try {
        const rendanUrl = this.env.RENDAN_URL || 'http://161.33.7.159:18790';
        const rendanToken = this.env.RENDAN_API_TOKEN || '';
        const resp = await fetch(`${rendanUrl}/v1/metrics`, {
          headers: { 'Authorization': `Bearer ${rendanToken}` },
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.totalTasks) {
            await this.recordOutcome('general', 'rendan', data.successRate > 0.9, data.avgLatencyMs || 5000);
            results.synced.push({ brain: 'rendan', tasks: data.totalTasks, success: data.successRate });
          }
        }
      } catch (e) {
        results.rendan_error = e.message;
      }

      // Fetch GOLEM metrics
      try {
        const golemUrl = this.env.GOLEM_URL || 'http://64.110.96.233:18791';
        const golemToken = this.env.GOLEM_BRAIN_TOKEN || 'golem-brain-internal-2026';
        const resp = await fetch(`${golemUrl}/v1/metrics`, {
          headers: { 'Authorization': `Bearer ${golemToken}` },
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.totalTasks) {
            await this.recordOutcome('general', 'golem', data.successRate > 0.9, data.avgLatencyMs || 5000);
            results.synced.push({ brain: 'golem', tasks: data.totalTasks, success: data.successRate });
          }
        }
      } catch (e) {
        results.golem_error = e.message;
      }

      // Fetch AGI scores from both
      for (const [name, url_base, token] of [
        ['rendan', this.env.RENDAN_URL || 'http://161.33.7.159:18790', this.env.RENDAN_API_TOKEN || ''],
        ['golem', this.env.GOLEM_URL || 'http://64.110.96.233:18791', this.env.GOLEM_BRAIN_TOKEN || 'golem-brain-internal-2026'],
      ]) {
        try {
          const resp = await fetch(`${url_base}/v1/agi-score`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
          });
          if (resp.ok) {
            const score = await resp.json();
            this.ctx.storage.sql.exec(
              `INSERT OR REPLACE INTO brain_metrics (brain, metric, value, updated_at) VALUES (?, 'agi_score', ?, datetime('now'))`,
              name, score.total || 0
            );
            results.synced.push({ brain: name, agi_score: score.total });
          }
        } catch (e) { /* non-fatal */ }
      }

      return Response.json(results);
    }

    return Response.json({ error: 'Not found', routes: ['/init', '/record', '/recommend', '/metrics', '/learn', '/sync-vm'] }, { status: 404 });
  }
}
