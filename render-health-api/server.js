const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================================
// YEDAN BUNSHIN (分身) v3.0 — Full Autonomous Agent on Render
// 24/7 health + alerts + revenue + task execution + Telegram
// ============================================================

const IDENTITY = {
  name: 'YEDAN-Bunshin',
  version: '3.0.0',
  role: 'Autonomous MCP Server Monitor, Revenue Tracker & Alert System',
  parent: 'YEDAN Alpha Gateway (WSL2)',
  operator: 'Yagami',
};

const AUTH_TOKEN = process.env.AUTH_TOKEN || 'openclaw-bunshin-2026';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7848052227';

// ============================================================
// MONITORED SERVICES (全矩陣)
// ============================================================
const MCP_SERVERS = [
  { name: 'json-toolkit', url: 'https://json-toolkit-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'regex-engine', url: 'https://regex-engine-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'color-palette', url: 'https://color-palette-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'timestamp-converter', url: 'https://timestamp-converter-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'prompt-enhancer', url: 'https://prompt-enhancer-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'agentforge-compare', url: 'https://agentforge-compare-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'moltbook-publisher', url: 'https://moltbook-publisher-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'fortune', url: 'https://openclaw-fortune-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'intel', url: 'https://openclaw-intel-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'fortune-api', url: 'https://fortune-api.yagami8095.workers.dev', type: 'api' },
  { name: 'intel-api', url: 'https://openclaw-intel-api.yagami8095.workers.dev', type: 'api' },
  { name: 'product-store', url: 'https://product-store.yagami8095.workers.dev', type: 'store' },
  { name: 'cf-browser', url: 'https://openclaw-browser.yagami8095.workers.dev', type: 'tool' },
];

// ============================================================
// DATABASE
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 3,
  idleTimeoutMillis: 30000,
});

const healthCache = { latest: null, history: [] };
const MAX_MEMORY_HISTORY = 100;

// Smart alert state (prevent spam)
const alertState = {
  lastAlertTime: {},     // server_name → timestamp
  alertCooldown: 15 * 60 * 1000,  // 15 min between same alerts
  downServers: new Set(),           // currently known down servers
  consecutiveDown: {},              // server_name → count
};

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_checks (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        healthy INTEGER NOT NULL,
        total INTEGER NOT NULL,
        servers JSONB NOT NULL,
        latency_avg REAL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        payload JSONB DEFAULT '{}',
        result JSONB,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3
      );
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        type VARCHAR(50) NOT NULL,
        source VARCHAR(50) DEFAULT 'bunshin',
        data JSONB DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS kv_store (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        severity VARCHAR(20) NOT NULL,
        target VARCHAR(100),
        message TEXT NOT NULL,
        notified BOOLEAN DEFAULT false,
        resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_health_timestamp ON health_checks(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, priority DESC);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(resolved, timestamp DESC);
    `);
    console.log('[DB] Tables initialized (v3.0 schema)');
  } catch (err) {
    console.error('[DB] Init error:', err.message);
  }
}

// ============================================================
// TELEGRAM 通知系統
// ============================================================
async function sendTelegram(message, parseMode = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[TG] No token, skip:', message.substring(0, 80));
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    if (!data.ok) console.error('[TG] Send failed:', data.description);
    return data.ok;
  } catch (err) {
    console.error('[TG] Error:', err.message);
    return false;
  }
}

// Smart alert: only notify if not recently alerted for same server
async function smartAlert(severity, target, message) {
  const now = Date.now();
  const key = `${target}:${severity}`;
  const lastAlert = alertState.lastAlertTime[key] || 0;

  // Store alert in DB always
  try {
    await pool.query(
      'INSERT INTO alerts (severity, target, message, notified) VALUES ($1, $2, $3, $4)',
      [severity, target, message, now - lastAlert > alertState.alertCooldown]
    );
  } catch (err) {
    console.error('[ALERT] DB error:', err.message);
  }

  // Only send Telegram if cooldown passed
  if (now - lastAlert < alertState.alertCooldown) {
    console.log(`[ALERT] Suppressed (cooldown): ${target} ${severity}`);
    return false;
  }

  alertState.lastAlertTime[key] = now;

  const emoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
  const tgMessage = `${emoji} <b>BUNSHIN ALERT</b>\n` +
    `<b>Severity:</b> ${severity.toUpperCase()}\n` +
    `<b>Target:</b> ${target}\n` +
    `<b>Message:</b> ${message}\n` +
    `<b>Time:</b> ${new Date().toISOString()}`;

  return await sendTelegram(tgMessage);
}

// ============================================================
// CORE FUNCTIONS
// ============================================================
async function checkServer(server) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(server.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'YEDAN-Bunshin/3.0' },
    });
    clearTimeout(timeout);
    return {
      name: server.name,
      url: server.url,
      type: server.type,
      status: res.status,
      ok: res.status >= 200 && res.status < 500,
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: server.name,
      url: server.url,
      type: server.type,
      status: 0,
      ok: false,
      latency: Date.now() - start,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkAllServers() {
  const results = await Promise.all(MCP_SERVERS.map(checkServer));
  const healthy = results.filter(r => r.ok).length;
  const latencyAvg = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  const mcpResults = results.filter(r => r.type === 'mcp');
  const mcpHealthy = mcpResults.filter(r => r.ok).length;

  const record = {
    timestamp: new Date().toISOString(),
    servers: results,
    healthy,
    total: results.length,
    mcpHealthy,
    mcpTotal: mcpResults.length,
    latencyAvg: Math.round(latencyAvg),
  };

  healthCache.latest = record;
  healthCache.history.unshift(record);
  if (healthCache.history.length > MAX_MEMORY_HISTORY) healthCache.history.pop();

  // Persist to database
  try {
    await pool.query(
      'INSERT INTO health_checks (healthy, total, servers, latency_avg) VALUES ($1, $2, $3, $4)',
      [healthy, results.length, JSON.stringify(results), latencyAvg]
    );
  } catch (err) {
    console.error('[DB] Health persist error:', err.message);
  }

  // Smart alerting for down servers
  const downNow = results.filter(r => !r.ok);
  const upNow = results.filter(r => r.ok);

  for (const server of downNow) {
    alertState.consecutiveDown[server.name] = (alertState.consecutiveDown[server.name] || 0) + 1;
    const count = alertState.consecutiveDown[server.name];

    if (!alertState.downServers.has(server.name)) {
      // New outage
      alertState.downServers.add(server.name);
      await smartAlert('critical', server.name,
        `Server DOWN! Status: ${server.status || 'timeout'}, Error: ${server.error || 'none'}, Consecutive: ${count}`);
    } else if (count % 6 === 0) {
      // Still down after 30 min (6 checks * 5min)
      await smartAlert('warning', server.name,
        `Still down for ${count * 5} minutes. Status: ${server.status || 'timeout'}`);
    }
  }

  // Resolve alerts for servers that came back up
  for (const server of upNow) {
    if (alertState.downServers.has(server.name)) {
      alertState.downServers.delete(server.name);
      const downCount = alertState.consecutiveDown[server.name] || 0;
      alertState.consecutiveDown[server.name] = 0;
      await smartAlert('info', server.name,
        `Server RECOVERED! Was down for ~${downCount * 5} minutes. Latency: ${server.latency}ms`);
      // Mark alerts as resolved in DB
      try {
        await pool.query(
          "UPDATE alerts SET resolved = true, resolved_at = NOW() WHERE target = $1 AND resolved = false",
          [server.name]
        );
      } catch (err) {}
    }
  }

  return record;
}

async function logEvent(type, source, data = {}) {
  try {
    await pool.query(
      'INSERT INTO events (type, source, data) VALUES ($1, $2, $3)',
      [type, source, JSON.stringify(data)]
    );
  } catch (err) {
    console.error('[DB] Event log error:', err.message);
  }
}

async function kvSet(key, value) {
  await pool.query(
    `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

async function kvGet(key) {
  const { rows } = await pool.query('SELECT value, updated_at FROM kv_store WHERE key = $1', [key]);
  return rows[0] || null;
}

// ============================================================
// TASK PROCESSOR — 自動處理 pending tasks
// ============================================================
async function processNextTask() {
  try {
    // Get highest priority pending task
    const { rows } = await pool.query(
      `UPDATE tasks SET status = 'running', updated_at = NOW()
       WHERE id = (
         SELECT id FROM tasks
         WHERE status = 'pending' AND retry_count < max_retries
         ORDER BY priority DESC, created_at ASC LIMIT 1
         FOR UPDATE SKIP LOCKED
       ) RETURNING *`
    );

    if (!rows[0]) return null; // No pending tasks

    const task = rows[0];
    console.log(`[TASK] Processing #${task.id}: ${task.type}`);
    await logEvent('task_started', 'processor', { taskId: task.id, type: task.type });

    let result;
    try {
      result = await executeTask(task);
      await pool.query(
        "UPDATE tasks SET status = 'completed', result = $1, updated_at = NOW() WHERE id = $2",
        [JSON.stringify(result), task.id]
      );
      await logEvent('task_completed', 'processor', { taskId: task.id, type: task.type });
      console.log(`[TASK] Completed #${task.id}: ${task.type}`);
    } catch (err) {
      const newRetry = task.retry_count + 1;
      const newStatus = newRetry >= task.max_retries ? 'failed' : 'pending';
      await pool.query(
        "UPDATE tasks SET status = $1, error = $2, retry_count = $3, updated_at = NOW() WHERE id = $4",
        [newStatus, err.message, newRetry, task.id]
      );
      console.error(`[TASK] Error #${task.id}: ${err.message} (retry ${newRetry}/${task.max_retries})`);
      if (newStatus === 'failed') {
        await smartAlert('warning', `task-${task.id}`,
          `Task failed after ${task.max_retries} retries: ${task.type} — ${err.message}`);
      }
    }

    return task;
  } catch (err) {
    console.error('[TASK] Processor error:', err.message);
    return null;
  }
}

async function executeTask(task) {
  const { type, payload } = task;

  switch (type) {
    case 'health-check':
      return await checkAllServers();

    case 'check-server': {
      const server = MCP_SERVERS.find(s => s.name === payload.name);
      if (!server) throw new Error(`Unknown server: ${payload.name}`);
      return await checkServer(server);
    }

    case 'telegram-notify':
      if (!payload.message) throw new Error('message required');
      const sent = await sendTelegram(payload.message);
      return { sent, message: payload.message };

    case 'kv-set':
      if (!payload.key) throw new Error('key required');
      await kvSet(payload.key, payload.value);
      return { key: payload.key, stored: true };

    case 'fetch-url': {
      if (!payload.url) throw new Error('url required');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(payload.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'YEDAN-Bunshin/3.0' },
      });
      clearTimeout(timeout);
      const text = await res.text();
      return {
        url: payload.url,
        status: res.status,
        contentLength: text.length,
        body: text.substring(0, 1000), // Store first 1K only
      };
    }

    case 'revenue-check': {
      // Check product store for recent activity
      const storeCheck = await checkServer(
        { name: 'product-store', url: 'https://product-store.yagami8095.workers.dev', type: 'store' }
      );
      return { productStore: storeCheck };
    }

    case 'daily-report': {
      const report = await generateDailyReport();
      if (TELEGRAM_BOT_TOKEN) await sendTelegram(report);
      return { report, sent: !!TELEGRAM_BOT_TOKEN };
    }

    case 'cleanup':
      return await runCleanup();

    default:
      throw new Error(`Unknown task type: ${type}. Supported: health-check, check-server, telegram-notify, kv-set, fetch-url, revenue-check, daily-report, cleanup`);
  }
}

// ============================================================
// REPORTING
// ============================================================
async function generateDailyReport() {
  const latest = healthCache.latest || await checkAllServers();
  let stats = { healthChecks: 0, tasks: {}, events: 0, kvEntries: 0, alerts: 0 };
  try {
    const [hc, tc, ec, kv, al] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM health_checks WHERE timestamp > NOW() - INTERVAL '24 hours'"),
      pool.query("SELECT status, COUNT(*) as count FROM tasks GROUP BY status"),
      pool.query("SELECT COUNT(*) FROM events WHERE timestamp > NOW() - INTERVAL '24 hours'"),
      pool.query('SELECT COUNT(*) FROM kv_store'),
      pool.query("SELECT COUNT(*) FROM alerts WHERE timestamp > NOW() - INTERVAL '24 hours'"),
    ]);
    stats.healthChecks = parseInt(hc.rows[0].count);
    stats.tasks = tc.rows.reduce((a, r) => { a[r.status] = parseInt(r.count); return a; }, {});
    stats.events = parseInt(ec.rows[0].count);
    stats.kvEntries = parseInt(kv.rows[0].count);
    stats.alerts = parseInt(al.rows[0].count);
  } catch {}

  const mcpServers = latest.servers.filter(s => s.type === 'mcp');
  const mcpHealthy = mcpServers.filter(s => s.ok).length;
  const allHealthy = latest.servers.filter(s => s.ok).length;

  return `📊 <b>BUNSHIN Daily Report</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔧 <b>MCP Servers:</b> ${mcpHealthy}/${mcpServers.length} healthy\n` +
    `🌐 <b>All Services:</b> ${allHealthy}/${latest.servers.length} healthy\n` +
    `⏱ <b>Avg Latency:</b> ${latest.latencyAvg}ms\n` +
    `📈 <b>24h Health Checks:</b> ${stats.healthChecks}\n` +
    `📋 <b>Tasks:</b> ${JSON.stringify(stats.tasks)}\n` +
    `🔔 <b>24h Alerts:</b> ${stats.alerts}\n` +
    `💾 <b>KV Entries:</b> ${stats.kvEntries}\n` +
    `⏰ <b>Uptime:</b> ${Math.round(process.uptime() / 3600)}h\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 YEDAN Bunshin v${IDENTITY.version}`;
}

async function runCleanup() {
  const hc = await pool.query("DELETE FROM health_checks WHERE timestamp < NOW() - INTERVAL '7 days'");
  const ev = await pool.query("DELETE FROM events WHERE timestamp < NOW() - INTERVAL '14 days'");
  const tasks = await pool.query("DELETE FROM tasks WHERE status IN ('completed','failed') AND updated_at < NOW() - INTERVAL '3 days'");
  const alerts = await pool.query("DELETE FROM alerts WHERE resolved = true AND resolved_at < NOW() - INTERVAL '7 days'");
  return {
    healthChecksDeleted: hc.rowCount,
    eventsDeleted: ev.rowCount,
    tasksDeleted: tasks.rowCount,
    alertsDeleted: alerts.rowCount,
  };
}

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============================================================
// PUBLIC ROUTES
// ============================================================
app.get('/', (req, res) => {
  res.json({
    ...IDENTITY,
    endpoints: {
      public: ['/', '/ping', '/health', '/health/history', '/health/:name', '/status'],
      protected: [
        '/api/tasks', '/api/tasks/:id', '/api/events', '/api/alerts',
        '/api/kv/:key', '/api/db/health-history', '/api/db/stats',
        '/api/command', '/api/report', '/api/telegram/test',
      ],
    },
    monitoring: {
      mcp: MCP_SERVERS.filter(s => s.type === 'mcp').length,
      api: MCP_SERVERS.filter(s => s.type === 'api').length,
      store: MCP_SERVERS.filter(s => s.type === 'store').length,
      tools: MCP_SERVERS.filter(s => s.type === 'tool').length,
      total: MCP_SERVERS.length,
    },
    features: ['health-monitoring', 'telegram-alerts', 'task-queue', 'task-processor',
      'kv-store', 'smart-alerts', 'daily-reports', 'auto-cleanup', 'revenue-tracking'],
    uptime: process.uptime(),
    dbConnected: pool.totalCount > 0,
    telegramEnabled: !!TELEGRAM_BOT_TOKEN,
  });
});

app.get('/ping', async (req, res) => {
  const start = Date.now();
  let dbOk = false;
  try { await pool.query('SELECT 1'); dbOk = true; } catch {}
  res.json({
    pong: true,
    version: IDENTITY.version,
    uptime: process.uptime(),
    dbConnected: dbOk,
    telegramEnabled: !!TELEGRAM_BOT_TOKEN,
    monitored: MCP_SERVERS.length,
    latency: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  const result = await checkAllServers();
  await logEvent('health_check', 'api', { healthy: result.healthy, total: result.total });
  const statusCode = result.healthy === result.total ? 200 : 503;
  res.status(statusCode).json(result);
});

app.get('/health/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, MAX_MEMORY_HISTORY);
  res.json({
    source: 'memory',
    count: healthCache.history.length,
    history: healthCache.history.slice(0, limit),
  });
});

app.get('/health/:name', async (req, res) => {
  const server = MCP_SERVERS.find(s => s.name === req.params.name);
  if (!server) {
    return res.status(404).json({ error: 'Server not found', available: MCP_SERVERS.map(s => s.name) });
  }
  const result = await checkServer(server);
  res.json(result);
});

app.get('/status', (req, res) => {
  const latest = healthCache.latest;
  if (!latest) {
    return res.json({ message: 'No health checks yet. Visit /health first.', servers: MCP_SERVERS.length });
  }
  res.json({
    healthy: latest.healthy,
    total: latest.total,
    mcpHealthy: latest.mcpHealthy,
    mcpTotal: latest.mcpTotal,
    allOk: latest.healthy === latest.total,
    latencyAvg: latest.latencyAvg,
    lastCheck: latest.timestamp,
    uptime: process.uptime(),
    activeAlerts: alertState.downServers.size,
    downServers: [...alertState.downServers],
    telegramEnabled: !!TELEGRAM_BOT_TOKEN,
  });
});

// ============================================================
// PROTECTED ROUTES
// ============================================================

// Task Queue
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    let query, vals;
    if (status) {
      query = 'SELECT * FROM tasks WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2';
      vals = [status, limit];
    } else {
      query = 'SELECT * FROM tasks ORDER BY priority DESC, created_at DESC LIMIT $1';
      vals = [limit];
    }
    const { rows } = await pool.query(query, vals);
    res.json({ count: rows.length, tasks: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { type, payload = {}, priority = 5, maxRetries = 3 } = req.body;
    if (!type) return res.status(400).json({ error: 'type is required' });
    const { rows } = await pool.query(
      'INSERT INTO tasks (type, payload, priority, max_retries) VALUES ($1, $2, $3, $4) RETURNING *',
      [type, JSON.stringify(payload), priority, maxRetries]
    );
    await logEvent('task_created', 'api', { taskId: rows[0].id, type });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { status, result, error } = req.body;
    const sets = ['updated_at = NOW()'];
    const vals = [];
    let idx = 1;
    if (status) { sets.push(`status = $${idx++}`); vals.push(status); }
    if (result !== undefined) { sets.push(`result = $${idx++}`); vals.push(JSON.stringify(result)); }
    if (error !== undefined) { sets.push(`error = $${idx++}`); vals.push(error); }
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alerts
app.get('/api/alerts', authMiddleware, async (req, res) => {
  try {
    const resolved = req.query.resolved === 'true';
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { rows } = await pool.query(
      'SELECT * FROM alerts WHERE resolved = $1 ORDER BY timestamp DESC LIMIT $2',
      [resolved, limit]
    );
    res.json({
      count: rows.length,
      activeDown: [...alertState.downServers],
      alerts: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Event Log
app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const type = req.query.type;
    let query = 'SELECT * FROM events';
    const vals = [];
    if (type) { query += ' WHERE type = $1'; vals.push(type); }
    query += ' ORDER BY timestamp DESC LIMIT $' + (vals.length + 1);
    vals.push(limit);
    const { rows } = await pool.query(query, vals);
    res.json({ count: rows.length, events: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// KV Store
app.get('/api/kv/:key', authMiddleware, async (req, res) => {
  try {
    const result = await kvGet(req.params.key);
    if (!result) return res.status(404).json({ error: 'Key not found' });
    res.json({ key: req.params.key, value: result.value, updatedAt: result.updated_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/kv/:key', authMiddleware, async (req, res) => {
  try {
    await kvSet(req.params.key, req.body.value);
    res.json({ key: req.params.key, value: req.body.value, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DB stats & history
app.get('/api/db/health-history', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const hours = parseInt(req.query.hours) || 24;
    const { rows } = await pool.query(
      `SELECT id, timestamp, healthy, total, latency_avg
       FROM health_checks WHERE timestamp > NOW() - INTERVAL '1 hour' * $1
       ORDER BY timestamp DESC LIMIT $2`,
      [hours, limit]
    );
    res.json({ count: rows.length, hours, history: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/stats', authMiddleware, async (req, res) => {
  try {
    const [hc, tc, ec, kv, al] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM health_checks'),
      pool.query("SELECT status, COUNT(*) as count FROM tasks GROUP BY status"),
      pool.query('SELECT COUNT(*) as count FROM events'),
      pool.query('SELECT COUNT(*) as count FROM kv_store'),
      pool.query("SELECT COUNT(*) as count, resolved FROM alerts GROUP BY resolved"),
    ]);
    res.json({
      healthChecks: parseInt(hc.rows[0].count),
      tasks: tc.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
      events: parseInt(ec.rows[0].count),
      kvEntries: parseInt(kv.rows[0].count),
      alerts: al.rows.reduce((acc, r) => { acc[r.resolved ? 'resolved' : 'active'] = parseInt(r.count); return acc; }, {}),
      pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Report
app.get('/api/report', authMiddleware, async (req, res) => {
  try {
    const report = await generateDailyReport();
    const send = req.query.send === 'true';
    let sent = false;
    if (send && TELEGRAM_BOT_TOKEN) {
      sent = await sendTelegram(report);
    }
    res.json({ report, sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Telegram test
app.post('/api/telegram/test', authMiddleware, async (req, res) => {
  const msg = req.body.message || '🧪 BUNSHIN Telegram test — connection OK!';
  const sent = await sendTelegram(msg);
  res.json({ sent, telegramEnabled: !!TELEGRAM_BOT_TOKEN });
});

// Command endpoint — YEDAN sends commands
app.post('/api/command', authMiddleware, async (req, res) => {
  try {
    const { command, args = {} } = req.body;
    if (!command) return res.status(400).json({ error: 'command is required' });
    await logEvent('command_received', 'yedan', { command, args });

    let result;
    switch (command) {
      case 'health-check':
        result = await checkAllServers();
        break;
      case 'create-task':
        result = (await pool.query(
          'INSERT INTO tasks (type, payload, priority) VALUES ($1, $2, $3) RETURNING *',
          [args.type || 'general', JSON.stringify(args.payload || {}), args.priority || 5]
        )).rows[0];
        break;
      case 'get-status': {
        const [hc, tc, ec, al] = await Promise.all([
          pool.query('SELECT COUNT(*) FROM health_checks'),
          pool.query("SELECT COUNT(*) FROM tasks WHERE status = 'pending'"),
          pool.query("SELECT COUNT(*) FROM events WHERE timestamp > NOW() - INTERVAL '1 hour'"),
          pool.query("SELECT COUNT(*) FROM alerts WHERE resolved = false"),
        ]);
        result = {
          lastHealth: healthCache.latest,
          pendingTasks: parseInt(tc.rows[0].count),
          recentEvents: parseInt(ec.rows[0].count),
          activeAlerts: parseInt(al.rows[0].count),
          downServers: [...alertState.downServers],
          totalHealthChecks: parseInt(hc.rows[0].count),
          uptime: process.uptime(),
        };
        break;
      }
      case 'kv-set':
        await kvSet(args.key, args.value);
        result = { key: args.key, stored: true };
        break;
      case 'kv-get':
        result = { key: args.key, ...(await kvGet(args.key)) };
        break;
      case 'send-telegram':
        result = { sent: await sendTelegram(args.message || 'No message') };
        break;
      case 'daily-report':
        const report = await generateDailyReport();
        if (TELEGRAM_BOT_TOKEN) await sendTelegram(report);
        result = { report, sent: !!TELEGRAM_BOT_TOKEN };
        break;
      case 'process-tasks':
        const processed = [];
        for (let i = 0; i < (args.count || 5); i++) {
          const task = await processNextTask();
          if (!task) break;
          processed.push(task.id);
        }
        result = { processed: processed.length, taskIds: processed };
        break;
      case 'cleanup':
        result = await runCleanup();
        break;
      default:
        return res.status(400).json({
          error: `Unknown command: ${command}`,
          available: ['health-check', 'create-task', 'get-status', 'kv-set', 'kv-get',
            'send-telegram', 'daily-report', 'process-tasks', 'cleanup'],
        });
    }

    await logEvent('command_executed', 'bunshin', { command, success: true });
    res.json({ command, result, timestamp: new Date().toISOString() });
  } catch (err) {
    await logEvent('command_error', 'bunshin', { command: req.body.command, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// AUTONOMOUS OPERATIONS
// ============================================================

// Health check every 5 minutes
setInterval(async () => {
  try {
    const result = await checkAllServers();
    const down = result.servers.filter(s => !s.ok);
    if (down.length > 0) {
      console.error(`[ALERT] ${down.length}/${result.total} DOWN: ${down.map(s => s.name).join(', ')}`);
    } else {
      console.log(`[OK] ${result.total}/${result.total} healthy | avg ${result.latencyAvg}ms`);
    }
  } catch (err) {
    console.error('[ERROR] Health check failed:', err.message);
  }
}, 5 * 60 * 1000);

// Process pending tasks every 2 minutes
setInterval(async () => {
  try {
    const task = await processNextTask();
    if (task) console.log(`[TASK] Auto-processed #${task.id}: ${task.type}`);
  } catch (err) {
    console.error('[TASK] Auto-process error:', err.message);
  }
}, 2 * 60 * 1000);

// Daily report at startup + every 24 hours
setInterval(async () => {
  try {
    if (TELEGRAM_BOT_TOKEN) {
      const report = await generateDailyReport();
      await sendTelegram(report);
      console.log('[REPORT] Daily report sent to Telegram');
    }
  } catch (err) {
    console.error('[REPORT] Error:', err.message);
  }
}, 24 * 60 * 60 * 1000);

// Database cleanup every 6 hours
setInterval(async () => {
  try {
    const result = await runCleanup();
    console.log(`[CLEANUP] Deleted: ${result.healthChecksDeleted}hc, ${result.eventsDeleted}ev, ${result.tasksDeleted}tasks, ${result.alertsDeleted}alerts`);
  } catch (err) {
    console.error('[CLEANUP] Error:', err.message);
  }
}, 6 * 60 * 60 * 1000);

// ============================================================
// STARTUP
// ============================================================
async function boot() {
  await initDatabase();

  setTimeout(async () => {
    try {
      const result = await checkAllServers();
      console.log(`[BOOT] Health: ${result.healthy}/${result.total} (MCP: ${result.mcpHealthy}/${result.mcpTotal}) | avg ${result.latencyAvg}ms`);
      await logEvent('boot', 'system', {
        version: IDENTITY.version,
        healthy: result.healthy,
        total: result.total,
        uptime: process.uptime(),
      });

      // Boot notification
      if (TELEGRAM_BOT_TOKEN) {
        await sendTelegram(
          `🚀 <b>BUNSHIN v${IDENTITY.version} BOOT</b>\n` +
          `MCP: ${result.mcpHealthy}/${result.mcpTotal} | All: ${result.healthy}/${result.total}\n` +
          `Avg: ${result.latencyAvg}ms | DB: ✅`
        );
      }
    } catch (err) {
      console.error('[BOOT] Error:', err.message);
    }
  }, 3000);
}

app.listen(PORT, () => {
  console.log(`=== YEDAN BUNSHIN v${IDENTITY.version} ===`);
  console.log(`Port ${PORT} | Monitoring ${MCP_SERVERS.length} services`);
  console.log(`DB: ${process.env.DATABASE_URL ? '✅' : '❌'} | TG: ${TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`);
  boot();
});
