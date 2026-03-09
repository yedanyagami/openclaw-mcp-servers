/**
 * Notion War Room API — Central Nervous System for OpenClaw Virtual Company
 *
 * Provides a unified REST API for all OpenClaw agents across cloud instances
 * to report status, raise alerts, and coordinate through a shared Notion database.
 *
 * Endpoints:
 *   POST /report    — Agent reports status/findings
 *   POST /alert     — Urgent alert from any agent
 *   GET  /dashboard — Current war room status summary
 *   POST /update    — Update existing task status
 *   GET  /agents    — List agents with last report time
 *   POST /sync      — Batch sync data to Notion
 *   GET  /health    — Health check (no auth required)
 */

const NOTION_API_VERSION = '2022-06-28';
const NOTION_BASE = 'https://api.notion.com/v1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

function notionHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': NOTION_API_VERSION,
    'Content-Type': 'application/json',
  };
}

function isoNow() {
  return new Date().toISOString();
}

// Map incoming priority strings to Notion select values.
function normalizePriority(raw) {
  const map = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return map[(raw || 'medium').toLowerCase()] || 'Medium';
}

function normalizeStatus(raw) {
  const map = {
    'not started': 'Not Started',
    'in progress': 'In Progress',
    'completed': 'Done',
    'done': 'Done',
    'blocked': 'Blocked',
    'cancelled': 'Cancelled',
  };
  return map[(raw || 'not started').toLowerCase()] || raw;
}

// ---------------------------------------------------------------------------
// Notion Client — thin wrapper around the REST API
// ---------------------------------------------------------------------------

class NotionClient {
  constructor(apiKey, databaseId) {
    this.apiKey = apiKey;
    this.databaseId = databaseId;
    this.headers = notionHeaders(apiKey);
  }

  async createPage(properties) {
    const res = await fetch(`${NOTION_BASE}/pages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        parent: { database_id: this.databaseId },
        properties,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Notion createPage failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  async updatePage(pageId, properties) {
    const res = await fetch(`${NOTION_BASE}/pages/${pageId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ properties }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Notion updatePage failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  async queryDatabase(filter, sorts, pageSize = 100) {
    const payload = {};
    if (filter) payload.filter = filter;
    if (sorts) payload.sorts = sorts;
    payload.page_size = Math.min(pageSize, 100);

    const res = await fetch(`${NOTION_BASE}/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Notion query failed (${res.status}): ${body}`);
    }
    return res.json();
  }
}

// ---------------------------------------------------------------------------
// Route: POST /report
// ---------------------------------------------------------------------------

async function handleReport(body, notion) {
  const { agent, type, status, findings, priority, category, platform, revenue_impact } = body;
  if (!agent || !type) {
    return errorResponse('Missing required fields: agent, type');
  }

  const title = `[${agent.toUpperCase()}] ${type}`;
  const properties = {
    Task: { title: [{ text: { content: title } }] },
    Status: { select: { name: normalizeStatus(status || 'In Progress') } },
    Priority: { select: { name: normalizePriority(priority) } },
    Owner: { rich_text: [{ text: { content: agent } }] },
    Notes: { rich_text: [{ text: { content: (findings || '').slice(0, 2000) } }] },
  };
  if (category) {
    properties.Category = { select: { name: category } };
  }
  if (platform) {
    properties.Platform = { select: { name: platform } };
  }
  if (revenue_impact) {
    properties['Revenue Impact'] = { rich_text: [{ text: { content: String(revenue_impact) } }] };
  }

  const page = await notion.createPage(properties);
  return jsonResponse({ ok: true, page_id: page.id, url: page.url });
}

// ---------------------------------------------------------------------------
// Route: POST /alert
// ---------------------------------------------------------------------------

async function handleAlert(body, notion) {
  const { agent, level, message } = body;
  if (!agent || !message) {
    return errorResponse('Missing required fields: agent, message');
  }

  const alertLevel = (level || 'high').toUpperCase();
  const title = `[ALERT:${alertLevel}] ${agent.toUpperCase()} — ${message.slice(0, 80)}`;

  const properties = {
    Task: { title: [{ text: { content: title } }] },
    Status: { select: { name: 'Not Started' } },
    Priority: { select: { name: alertLevel === 'CRITICAL' ? 'Critical' : 'High' } },
    Category: { select: { name: 'Alert' } },
    Owner: { rich_text: [{ text: { content: agent } }] },
    Notes: { rich_text: [{ text: { content: `[${isoNow()}] ${message}`.slice(0, 2000) } }] },
  };

  const page = await notion.createPage(properties);

  return jsonResponse({
    ok: true,
    page_id: page.id,
    url: page.url,
    alert_level: alertLevel,
    escalated: alertLevel === 'CRITICAL',
  });
}

// ---------------------------------------------------------------------------
// Route: GET /dashboard
// ---------------------------------------------------------------------------

async function handleDashboard(notion) {
  const data = await notion.queryDatabase(null, [
    { property: 'Created', direction: 'descending' },
  ]);

  const pages = data.results || [];

  // Counts by status
  const byStatus = {};
  const byAgent = {};
  const byPriority = {};
  const recent = [];

  for (const page of pages) {
    const props = page.properties;

    const status = props.Status?.select?.name || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    const owner = props.Owner?.rich_text?.[0]?.plain_text || 'unassigned';
    byAgent[owner] = (byAgent[owner] || 0) + 1;

    const priority = props.Priority?.select?.name || 'Unknown';
    byPriority[priority] = (byPriority[priority] || 0) + 1;

    if (recent.length < 10) {
      recent.push({
        id: page.id,
        title: props.Task?.title?.[0]?.plain_text || '(untitled)',
        status,
        priority,
        owner,
        created: page.created_time,
      });
    }
  }

  return jsonResponse({
    ok: true,
    total: pages.length,
    by_status: byStatus,
    by_agent: byAgent,
    by_priority: byPriority,
    recent,
    queried_at: isoNow(),
  });
}

// ---------------------------------------------------------------------------
// Route: POST /update
// ---------------------------------------------------------------------------

async function handleUpdate(body, notion) {
  const { page_id, status, notes, priority, category } = body;
  if (!page_id) {
    return errorResponse('Missing required field: page_id');
  }

  const properties = {};
  if (status) {
    properties.Status = { select: { name: normalizeStatus(status) } };
  }
  if (notes) {
    properties.Notes = { rich_text: [{ text: { content: notes.slice(0, 2000) } }] };
  }
  if (priority) {
    properties.Priority = { select: { name: normalizePriority(priority) } };
  }
  if (category) {
    properties.Category = { select: { name: category } };
  }

  const page = await notion.updatePage(page_id, properties);
  return jsonResponse({ ok: true, page_id: page.id, url: page.url });
}

// ---------------------------------------------------------------------------
// Route: GET /agents
// ---------------------------------------------------------------------------

async function handleAgents(notion) {
  const data = await notion.queryDatabase(null, [
    { property: 'Created', direction: 'descending' },
  ]);

  const agents = {};

  for (const page of data.results || []) {
    const owner = page.properties.Owner?.rich_text?.[0]?.plain_text;
    if (!owner) continue;

    if (!agents[owner]) {
      agents[owner] = {
        last_report: page.created_time,
        last_title: page.properties.Task?.title?.[0]?.plain_text || '',
        total_reports: 0,
        statuses: {},
      };
    }
    agents[owner].total_reports++;
    const status = page.properties.Status?.select?.name || 'Unknown';
    agents[owner].statuses[status] = (agents[owner].statuses[status] || 0) + 1;
  }

  return jsonResponse({
    ok: true,
    agents,
    agent_count: Object.keys(agents).length,
    queried_at: isoNow(),
  });
}

// ---------------------------------------------------------------------------
// Route: POST /sync
// ---------------------------------------------------------------------------

async function handleSync(body, notion) {
  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return errorResponse('Missing or empty "items" array');
  }

  const results = [];
  const errors = [];

  // Process in batches of 5 to avoid rate limits (Notion allows ~3 req/s)
  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (item, idx) => {
      try {
        const title = item.title || `[SYNC] ${item.agent || 'system'} — ${item.type || 'data'}`;
        const properties = {
          Task: { title: [{ text: { content: title.slice(0, 200) } }] },
          Status: { select: { name: normalizeStatus(item.status || 'Not Started') } },
          Priority: { select: { name: normalizePriority(item.priority) } },
          Owner: { rich_text: [{ text: { content: item.agent || 'system' } }] },
          Notes: { rich_text: [{ text: { content: (item.notes || item.data || '').slice(0, 2000) } }] },
        };
        if (item.category) {
          properties.Category = { select: { name: item.category } };
        }
        if (item.platform) {
          properties.Platform = { select: { name: item.platform } };
        }
        const page = await notion.createPage(properties);
        results.push({ index: i + idx, page_id: page.id, ok: true });
      } catch (err) {
        errors.push({ index: i + idx, error: err.message });
      }
    });
    await Promise.all(promises);
  }

  return jsonResponse({
    ok: errors.length === 0,
    created: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  return authHeader.slice(7) === env.WARROOM_AUTH_TOKEN;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Health check — no auth required
    if (path === '/health' && method === 'GET') {
      return jsonResponse({ ok: true, service: 'notion-warroom', time: isoNow() });
    }

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Auth check for all other routes
    if (!authenticate(request, env)) {
      return errorResponse('Unauthorized', 401);
    }

    // Validate env
    if (!env.NOTION_API_KEY || !env.NOTION_DATABASE_ID) {
      return errorResponse('Server misconfigured: missing NOTION_API_KEY or NOTION_DATABASE_ID', 500);
    }

    const notion = new NotionClient(env.NOTION_API_KEY, env.NOTION_DATABASE_ID);

    try {
      // POST routes — parse body
      let body = null;
      if (method === 'POST') {
        try {
          body = await request.json();
        } catch {
          return errorResponse('Invalid JSON body');
        }
      }

      switch (path) {
        case '/report':
          if (method !== 'POST') return errorResponse('Method not allowed', 405);
          return await handleReport(body, notion);

        case '/alert':
          if (method !== 'POST') return errorResponse('Method not allowed', 405);
          return await handleAlert(body, notion);

        case '/dashboard':
          if (method !== 'GET') return errorResponse('Method not allowed', 405);
          return await handleDashboard(notion);

        case '/update':
          if (method !== 'POST') return errorResponse('Method not allowed', 405);
          return await handleUpdate(body, notion);

        case '/agents':
          if (method !== 'GET') return errorResponse('Method not allowed', 405);
          return await handleAgents(notion);

        case '/sync':
          if (method !== 'POST') return errorResponse('Method not allowed', 405);
          return await handleSync(body, notion);

        default:
          return errorResponse(`Unknown route: ${path}`, 404);
      }
    } catch (err) {
      console.error(`[${path}] Error:`, err.message, err.stack);
      return errorResponse(`Internal error: ${err.message}`, 500);
    }
  },
};
