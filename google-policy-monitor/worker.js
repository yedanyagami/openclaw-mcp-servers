/**
 * Google Policy Monitor Worker
 *
 * Monitors Google Cloud Code, Gemini Code Assist, and Antigravity policy changes.
 * Checks multiple sources every 6 hours and sends Telegram alerts on new changes.
 *
 * Sources:
 *   1. Google Cloud Code / Gemini Code Assist release notes (RSS XML feed)
 *   2. Google Cloud Legal Change Log (HTML scrape)
 *   3. Google Cloud Status (JSON API)
 *   4. Gemini API changelog (ai.google.dev)
 *   5. Hacker News (Algolia search API) for ban/policy articles
 *   6. Google AI Developer Forum for enforcement threads
 *
 * Stores last-checked timestamps in KV to avoid duplicate alerts.
 * Logs all detected changes to D1 for historical analysis.
 *
 * Cron: 0 *\/6 * * * (every 6 hours)
 */

// ── Configuration ──────────────────────────────────────────────────────────────

const TELEGRAM_API = 'https://api.telegram.org/bot';
const TELEGRAM_BOT_TOKEN = '8584008728:AAEsxD3SXEkp62CZQc-5tpPp9XwWdntJtbc';
const TELEGRAM_CHAT_ID = '7848052227';

const SOURCES = {
  // Google Cloud release notes RSS feeds
  CLOUD_CODE_RSS: 'https://cloud.google.com/feeds/cloud-code-release-notes.xml',
  GEMINI_CLOUD_RSS: 'https://cloud.google.com/feeds/gemini-release-notes.xml',
  GCP_RELEASE_RSS: 'https://cloud.google.com/feeds/gcp-release-notes.xml',

  // Gemini Code Assist release notes page
  GEMINI_CODEASSIST_NOTES: 'https://docs.cloud.google.com/gemini/docs/codeassist/release-notes',

  // Google Cloud legal change log
  LEGAL_CHANGELOG: 'https://cloud.google.com/legal-change-log',

  // Google Cloud Status (JSON incidents feed)
  GCP_STATUS_JSON: 'https://status.cloud.google.com/incidents.json',

  // Gemini API changelog
  GEMINI_API_CHANGELOG: 'https://ai.google.dev/changelog',

  // Gemini API terms page
  GEMINI_API_TERMS: 'https://ai.google.dev/gemini-api/terms',

  // Hacker News Algolia search API
  HN_SEARCH: 'https://hn.algolia.com/api/v1/search_by_date',

  // Google AI Developer Forum (Antigravity category)
  GOOGLE_AI_FORUM: 'https://discuss.ai.google.dev/c/google-antigravity/40.json',
};

// Keywords that indicate policy-relevant content
const POLICY_KEYWORDS = [
  'terms of service', 'tos', 'policy', 'ban', 'banned', 'disabled',
  'suspended', 'suspension', 'violation', 'abuse', 'restrict',
  'restriction', 'antigravity', 'gemini code assist', 'cloud code',
  'oauth', 'api key', 'rate limit', 'quota', 'enforcement',
  'prohibited', 'acceptable use', 'aup', 'discontinu', 'deprecat',
  'breaking change', 'backward', 'incompatible', 'account',
  'openclaw', 'third-party', '403', 'cloudcode-pa',
];

// HN search queries (rotated each run to stay under rate limits)
const HN_QUERIES = [
  'Google Gemini ban account',
  'Google Cloud Code API policy',
  'Antigravity ban disabled',
  'Gemini Code Assist terms',
  'Google API account suspended',
  'Google developer account ban 2026',
];

// KV keys
const KV_PREFIX = 'google-policy-monitor:';
const KV_KEYS = {
  LAST_RUN: `${KV_PREFIX}last-run`,
  RSS_ETAGS: `${KV_PREFIX}rss-etags`,
  SEEN_ITEMS: `${KV_PREFIX}seen-items`,
  HN_LAST_TS: `${KV_PREFIX}hn-last-timestamp`,
  STATUS_LAST: `${KV_PREFIX}status-last-incident`,
  LEGAL_HASH: `${KV_PREFIX}legal-page-hash`,
  TERMS_HASH: `${KV_PREFIX}terms-page-hash`,
  FORUM_LAST: `${KV_PREFIX}forum-last-topic`,
  RUN_COUNT: `${KV_PREFIX}run-count`,
};

// ── D1 Schema (run once) ───────────────────────────────────────────────────────

const D1_INIT_SQL = `
CREATE TABLE IF NOT EXISTS google_policy_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  severity TEXT DEFAULT 'info',
  detected_at TEXT NOT NULL,
  raw_data TEXT
);
CREATE INDEX IF NOT EXISTS idx_gpc_source ON google_policy_changes(source);
CREATE INDEX IF NOT EXISTS idx_gpc_detected ON google_policy_changes(detected_at);
`;

// ── Utilities ──────────────────────────────────────────────────────────────────

/**
 * Send a Telegram message with retry
 */
async function sendTelegram(text, parseMode = 'HTML') {
  const url = `${TELEGRAM_API}${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const maxLen = 4000;
  const truncated = text.length > maxLen ? text.substring(0, maxLen) + '\n...(truncated)' : text;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: truncated,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });
      if (resp.ok) return true;
      const err = await resp.text();
      console.error(`Telegram attempt ${attempt + 1} failed: ${resp.status} ${err}`);
      if (attempt < 2) await sleep(2000 * (attempt + 1));
    } catch (e) {
      console.error(`Telegram attempt ${attempt + 1} error: ${e.message}`);
      if (attempt < 2) await sleep(2000 * (attempt + 1));
    }
  }
  return false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simple hash for content change detection
 */
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if text contains policy-relevant keywords
 */
function containsPolicyKeywords(text) {
  const lower = text.toLowerCase();
  const matched = POLICY_KEYWORDS.filter(kw => lower.includes(kw));
  return { relevant: matched.length > 0, keywords: matched, score: matched.length };
}

/**
 * Classify severity based on keyword matches
 */
function classifySeverity(keywords) {
  const critical = ['ban', 'banned', 'disabled', 'suspended', 'suspension', 'violation', '403'];
  const high = ['terms of service', 'tos', 'policy', 'abuse', 'restrict', 'restriction',
    'enforcement', 'prohibited', 'discontinu', 'breaking change', 'incompatible'];
  const medium = ['deprecat', 'rate limit', 'quota', 'acceptable use', 'aup',
    'antigravity', 'openclaw', 'third-party'];

  if (keywords.some(k => critical.includes(k))) return 'critical';
  if (keywords.some(k => high.includes(k))) return 'high';
  if (keywords.some(k => medium.includes(k))) return 'medium';
  return 'info';
}

/**
 * Fetch with timeout and error handling
 */
async function safeFetch(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return resp;
  } catch (e) {
    clearTimeout(timeout);
    console.error(`Fetch failed for ${url}: ${e.message}`);
    return null;
  }
}

/**
 * Log a detected change to D1
 */
async function logToD1(db, change) {
  try {
    await db.prepare(
      `INSERT INTO google_policy_changes (source, title, summary, url, severity, detected_at, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      change.source,
      change.title,
      change.summary || null,
      change.url || null,
      change.severity || 'info',
      new Date().toISOString(),
      change.rawData ? JSON.stringify(change.rawData).substring(0, 5000) : null,
    ).run();
  } catch (e) {
    console.error(`D1 log failed: ${e.message}`);
  }
}

/**
 * Get seen items set from KV
 */
async function getSeenItems(kv) {
  try {
    const raw = await kv.get(KV_KEYS.SEEN_ITEMS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    // Keep only last 500 items to avoid KV size limits
    return new Set(arr.slice(-500));
  } catch {
    return new Set();
  }
}

/**
 * Save seen items to KV
 */
async function saveSeenItems(kv, seenSet) {
  const arr = Array.from(seenSet).slice(-500);
  await kv.put(KV_KEYS.SEEN_ITEMS, JSON.stringify(arr), { expirationTtl: 86400 * 30 });
}

// ── Source Checkers ────────────────────────────────────────────────────────────

/**
 * 1. Check Google Cloud RSS feeds for Cloud Code / Gemini releases
 */
async function checkRSSFeeds(kv) {
  const changes = [];
  const feeds = [
    { url: SOURCES.CLOUD_CODE_RSS, name: 'Cloud Code' },
    { url: SOURCES.GEMINI_CLOUD_RSS, name: 'Gemini Cloud' },
  ];

  // Get stored ETags
  let etags = {};
  try {
    const raw = await kv.get(KV_KEYS.RSS_ETAGS);
    if (raw) etags = JSON.parse(raw);
  } catch { /* fresh start */ }

  for (const feed of feeds) {
    const headers = {};
    if (etags[feed.url]) {
      headers['If-None-Match'] = etags[feed.url];
    }

    const resp = await safeFetch(feed.url, { headers });
    if (!resp) continue;

    // 304 Not Modified — no changes
    if (resp.status === 304) {
      console.log(`${feed.name} RSS: not modified`);
      continue;
    }

    if (!resp.ok) {
      console.error(`${feed.name} RSS: ${resp.status}`);
      continue;
    }

    // Store new ETag
    const newEtag = resp.headers.get('etag');
    if (newEtag) etags[feed.url] = newEtag;

    const xml = await resp.text();

    // Parse RSS entries — simple regex extraction (no XML parser in Workers)
    const entries = extractRSSEntries(xml);

    for (const entry of entries) {
      const { relevant, keywords, score } = containsPolicyKeywords(
        `${entry.title} ${entry.description}`
      );
      if (relevant && score >= 1) {
        changes.push({
          source: `rss:${feed.name}`,
          title: entry.title,
          summary: entry.description.substring(0, 500),
          url: entry.link,
          severity: classifySeverity(keywords),
          keywords,
          id: `rss:${feed.name}:${entry.link || entry.title}`,
        });
      }
    }
  }

  // Save ETags
  await kv.put(KV_KEYS.RSS_ETAGS, JSON.stringify(etags), { expirationTtl: 86400 * 7 });
  return changes;
}

/**
 * Extract entries from RSS/Atom XML using regex (Workers have no DOM parser)
 */
function extractRSSEntries(xml) {
  const entries = [];

  // Try Atom <entry> format
  const atomPattern = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = atomPattern.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractAttr(block, 'link', 'href') || extractTag(block, 'link');
    const description = extractTag(block, 'content') || extractTag(block, 'summary') || '';
    const updated = extractTag(block, 'updated') || extractTag(block, 'published') || '';
    entries.push({ title, link, description: stripHTML(description), updated });
  }

  // Try RSS <item> format if no Atom entries found
  if (entries.length === 0) {
    const rssPattern = /<item>([\s\S]*?)<\/item>/gi;
    while ((match = rssPattern.exec(xml)) !== null) {
      const block = match[1];
      const title = extractTag(block, 'title');
      const link = extractTag(block, 'link');
      const description = extractTag(block, 'description') || '';
      const pubDate = extractTag(block, 'pubDate') || '';
      entries.push({ title, link, description: stripHTML(description), updated: pubDate });
    }
  }

  // Return only last 20 entries (most recent)
  return entries.slice(0, 20);
}

function extractTag(xml, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 'si');
  const m = pattern.exec(xml);
  return m ? m[1].trim() : '';
}

function extractAttr(xml, tag, attr) {
  const pattern = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const m = pattern.exec(xml);
  return m ? m[1] : '';
}

function stripHTML(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * 2. Check Google Cloud Status for incidents affecting Gemini/Cloud Code
 */
async function checkGCPStatus(kv) {
  const changes = [];
  const resp = await safeFetch(SOURCES.GCP_STATUS_JSON);
  if (!resp || !resp.ok) {
    console.error('GCP Status fetch failed');
    return changes;
  }

  let incidents;
  try {
    incidents = await resp.json();
  } catch {
    console.error('GCP Status JSON parse failed');
    return changes;
  }

  if (!Array.isArray(incidents)) {
    console.error('GCP Status: unexpected format');
    return changes;
  }

  // Get last known incident ID
  const lastIncident = await kv.get(KV_KEYS.STATUS_LAST);

  // Filter for Gemini / Cloud Code / AI related incidents
  const relevant = incidents.filter(inc => {
    const text = `${inc.service_name || ''} ${inc.external_desc || ''} ${inc.service_key || ''}`.toLowerCase();
    return (
      text.includes('gemini') ||
      text.includes('cloud code') ||
      text.includes('ai platform') ||
      text.includes('vertex') ||
      text.includes('code assist') ||
      text.includes('antigravity')
    );
  });

  // Only report new incidents (after last known)
  let foundNew = false;
  for (const inc of relevant.slice(0, 5)) {
    const incId = inc.id || inc.number || `${inc.begin}`;
    if (lastIncident && incId <= lastIncident) continue;
    foundNew = true;

    changes.push({
      source: 'gcp-status',
      title: `GCP Incident: ${inc.service_name || 'Unknown Service'}`,
      summary: (inc.external_desc || inc.most_recent_update?.text || 'No description').substring(0, 500),
      url: `https://status.cloud.google.com/incidents/${inc.id || ''}`,
      severity: inc.severity === 'high' ? 'critical' : 'high',
      id: `status:${incId}`,
    });
  }

  // Update last incident marker
  if (relevant.length > 0) {
    const latestId = relevant[0].id || relevant[0].number || `${relevant[0].begin}`;
    await kv.put(KV_KEYS.STATUS_LAST, latestId, { expirationTtl: 86400 * 30 });
  }

  return changes;
}

/**
 * 3. Check Google Cloud Legal Change Log for updates
 */
async function checkLegalChangelog(kv) {
  const changes = [];
  const resp = await safeFetch(SOURCES.LEGAL_CHANGELOG);
  if (!resp || !resp.ok) {
    console.error('Legal changelog fetch failed');
    return changes;
  }

  const html = await resp.text();
  const currentHash = await hashText(html);
  const storedHash = await kv.get(KV_KEYS.LEGAL_HASH);

  if (storedHash && storedHash === currentHash) {
    console.log('Legal changelog: no change');
    return changes;
  }

  // Page changed — extract recent entries
  // Look for date patterns and associated text
  const datePattern = /(\w+ \d{1,2}, 20\d{2})/g;
  const dates = [];
  let m;
  while ((m = datePattern.exec(html)) !== null) {
    dates.push({ date: m[1], index: m.index });
  }

  // Extract text around each date for context
  for (const d of dates.slice(0, 5)) {
    const context = stripHTML(html.substring(d.index, d.index + 500));
    const { relevant, keywords } = containsPolicyKeywords(context);
    if (relevant) {
      changes.push({
        source: 'legal-changelog',
        title: `Legal Change Log Update (${d.date})`,
        summary: context.substring(0, 300),
        url: SOURCES.LEGAL_CHANGELOG,
        severity: classifySeverity(keywords),
        keywords,
        id: `legal:${d.date}`,
      });
    }
  }

  // If first run (no stored hash), don't alert on everything — just store hash
  if (!storedHash && changes.length > 0) {
    console.log(`Legal changelog: first run, storing hash, ${changes.length} entries found (suppressed)`);
    await kv.put(KV_KEYS.LEGAL_HASH, currentHash, { expirationTtl: 86400 * 90 });
    return [];
  }

  await kv.put(KV_KEYS.LEGAL_HASH, currentHash, { expirationTtl: 86400 * 90 });
  return changes;
}

/**
 * 4. Check Gemini API Terms page for changes
 */
async function checkGeminiTerms(kv) {
  const changes = [];
  const resp = await safeFetch(SOURCES.GEMINI_API_TERMS);
  if (!resp || !resp.ok) {
    console.error('Gemini API terms fetch failed');
    return changes;
  }

  const html = await resp.text();
  const currentHash = await hashText(html);
  const storedHash = await kv.get(KV_KEYS.TERMS_HASH);

  if (storedHash && storedHash === currentHash) {
    console.log('Gemini API terms: no change');
    return changes;
  }

  if (storedHash) {
    // Page changed
    changes.push({
      source: 'gemini-api-terms',
      title: 'Gemini API Terms of Service Updated',
      summary: 'The Gemini API Additional Terms of Service page has been modified. Review for changes to competitive use restrictions, data usage policies, or third-party tool clauses.',
      url: SOURCES.GEMINI_API_TERMS,
      severity: 'high',
      id: `terms:${currentHash.substring(0, 16)}`,
    });
  } else {
    console.log('Gemini API terms: first run, storing hash');
  }

  await kv.put(KV_KEYS.TERMS_HASH, currentHash, { expirationTtl: 86400 * 90 });
  return changes;
}

/**
 * 5. Check Hacker News for relevant articles about Google bans / policy changes
 */
async function checkHackerNews(kv) {
  const changes = [];

  // Get last checked timestamp
  let lastTs = parseInt(await kv.get(KV_KEYS.HN_LAST_TS) || '0', 10);
  if (lastTs === 0) {
    // First run: set to 24 hours ago
    lastTs = Math.floor(Date.now() / 1000) - 86400;
  }

  // Rotate through queries based on run count
  let runCount = parseInt(await kv.get(KV_KEYS.RUN_COUNT) || '0', 10);
  const queryIndex = runCount % HN_QUERIES.length;
  const query = HN_QUERIES[queryIndex];

  const url = `${SOURCES.HN_SEARCH}?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${lastTs}&hitsPerPage=10`;

  const resp = await safeFetch(url);
  if (!resp || !resp.ok) {
    console.error('HN search failed');
    return changes;
  }

  let data;
  try {
    data = await resp.json();
  } catch {
    console.error('HN JSON parse failed');
    return changes;
  }

  const hits = data.hits || [];
  let maxTs = lastTs;

  for (const hit of hits) {
    const title = hit.title || '';
    const hitUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
    const points = hit.points || 0;
    const createdAt = hit.created_at_i || 0;

    // Only care about stories with some traction (3+ points) or very relevant
    const { relevant, keywords, score } = containsPolicyKeywords(title);
    if (!relevant) continue;
    if (points < 3 && score < 2) continue;

    if (createdAt > maxTs) maxTs = createdAt;

    changes.push({
      source: 'hacker-news',
      title: `HN: ${title}`,
      summary: `${points} points | ${hit.num_comments || 0} comments | Query: "${query}"`,
      url: hitUrl,
      severity: classifySeverity(keywords),
      keywords,
      id: `hn:${hit.objectID}`,
      rawData: { points, comments: hit.num_comments, author: hit.author },
    });
  }

  // Also search for a second query to broaden coverage
  const query2Index = (queryIndex + 3) % HN_QUERIES.length;
  const query2 = HN_QUERIES[query2Index];
  const url2 = `${SOURCES.HN_SEARCH}?query=${encodeURIComponent(query2)}&tags=story&numericFilters=created_at_i>${lastTs}&hitsPerPage=10`;

  const resp2 = await safeFetch(url2);
  if (resp2 && resp2.ok) {
    try {
      const data2 = await resp2.json();
      for (const hit of (data2.hits || [])) {
        const title = hit.title || '';
        const hitUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        const points = hit.points || 0;
        const createdAt = hit.created_at_i || 0;
        const { relevant, keywords, score } = containsPolicyKeywords(title);
        if (!relevant || (points < 3 && score < 2)) continue;
        if (createdAt > maxTs) maxTs = createdAt;
        // Avoid duplicates
        if (changes.some(c => c.id === `hn:${hit.objectID}`)) continue;
        changes.push({
          source: 'hacker-news',
          title: `HN: ${title}`,
          summary: `${points} points | ${hit.num_comments || 0} comments | Query: "${query2}"`,
          url: hitUrl,
          severity: classifySeverity(keywords),
          keywords,
          id: `hn:${hit.objectID}`,
          rawData: { points, comments: hit.num_comments, author: hit.author },
        });
      }
    } catch { /* ignore parse errors on second query */ }
  }

  // Update timestamp
  if (maxTs > lastTs) {
    await kv.put(KV_KEYS.HN_LAST_TS, String(maxTs), { expirationTtl: 86400 * 30 });
  }

  return changes;
}

/**
 * 6. Check Gemini Code Assist release notes page for new entries
 */
async function checkGeminiCodeAssistNotes(kv) {
  const changes = [];
  const resp = await safeFetch(SOURCES.GEMINI_CODEASSIST_NOTES);
  if (!resp || !resp.ok) {
    console.error('Gemini Code Assist release notes fetch failed');
    return changes;
  }

  const html = await resp.text();

  // Extract date headings and their content sections
  // Release notes pages typically have date headers like "March 5, 2026" or "2026-03-05"
  const datePattern = /(?:<h[23][^>]*>.*?)((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}|20\d{2}-\d{2}-\d{2})/gi;
  const dates = [];
  let m;
  while ((m = datePattern.exec(html)) !== null) {
    dates.push({ date: m[1], index: m.index });
  }

  // Only look at the most recent 3 entries
  for (let i = 0; i < Math.min(dates.length, 3); i++) {
    const d = dates[i];
    const endIndex = dates[i + 1] ? dates[i + 1].index : d.index + 2000;
    const sectionHTML = html.substring(d.index, endIndex);
    const sectionText = stripHTML(sectionHTML);
    const { relevant, keywords } = containsPolicyKeywords(sectionText);

    if (relevant) {
      changes.push({
        source: 'gemini-codeassist-notes',
        title: `Gemini Code Assist Update (${d.date})`,
        summary: sectionText.substring(0, 400),
        url: SOURCES.GEMINI_CODEASSIST_NOTES,
        severity: classifySeverity(keywords),
        keywords,
        id: `codeassist:${d.date}`,
      });
    }
  }

  return changes;
}

/**
 * 7. Check Google AI Developer Forum for Antigravity enforcement threads
 */
async function checkGoogleAIForum(kv) {
  const changes = [];
  const resp = await safeFetch(SOURCES.GOOGLE_AI_FORUM);
  if (!resp || !resp.ok) {
    // Forum JSON endpoint may not be available — try search fallback
    return await checkGoogleAIForumFallback(kv);
  }

  let data;
  try {
    data = await resp.json();
  } catch {
    console.error('Forum JSON parse failed');
    return changes;
  }

  const topics = data.topic_list?.topics || [];
  const lastTopicId = parseInt(await kv.get(KV_KEYS.FORUM_LAST) || '0', 10);
  let maxTopicId = lastTopicId;

  for (const topic of topics.slice(0, 15)) {
    if (topic.id <= lastTopicId) continue;
    if (topic.id > maxTopicId) maxTopicId = topic.id;

    const title = topic.title || '';
    const { relevant, keywords, score } = containsPolicyKeywords(title);
    if (!relevant || score < 1) continue;

    changes.push({
      source: 'google-ai-forum',
      title: `Forum: ${title}`,
      summary: `${topic.posts_count || 0} posts, ${topic.views || 0} views`,
      url: `https://discuss.ai.google.dev/t/${topic.slug}/${topic.id}`,
      severity: classifySeverity(keywords),
      keywords,
      id: `forum:${topic.id}`,
    });
  }

  if (maxTopicId > lastTopicId) {
    await kv.put(KV_KEYS.FORUM_LAST, String(maxTopicId), { expirationTtl: 86400 * 30 });
  }

  return changes;
}

/**
 * Forum fallback: use discuss.ai.google.dev search if category JSON fails
 */
async function checkGoogleAIForumFallback(kv) {
  // Simple search for recent Antigravity-related topics
  const searchUrl = 'https://discuss.ai.google.dev/search.json?q=banned%20OR%20disabled%20OR%20suspended%20category%3Agoogle-antigravity%20order%3Alatest';
  const resp = await safeFetch(searchUrl);
  if (!resp || !resp.ok) {
    console.log('Forum fallback search also failed, skipping');
    return [];
  }

  const changes = [];
  try {
    const data = await resp.json();
    const topics = data.topics || [];
    const lastTopicId = parseInt(await kv.get(KV_KEYS.FORUM_LAST) || '0', 10);
    let maxTopicId = lastTopicId;

    for (const topic of topics.slice(0, 10)) {
      if (topic.id <= lastTopicId) continue;
      if (topic.id > maxTopicId) maxTopicId = topic.id;

      changes.push({
        source: 'google-ai-forum',
        title: `Forum: ${topic.title || 'Unknown'}`,
        summary: `Search hit for ban/disable/suspend in Antigravity category`,
        url: `https://discuss.ai.google.dev/t/${topic.slug}/${topic.id}`,
        severity: 'high',
        id: `forum:${topic.id}`,
      });
    }

    if (maxTopicId > lastTopicId) {
      await kv.put(KV_KEYS.FORUM_LAST, String(maxTopicId), { expirationTtl: 86400 * 30 });
    }
  } catch { /* ignore */ }

  return changes;
}

// ── Alert Formatting ───────────────────────────────────────────────────────────

/**
 * Format a single change into a Telegram message
 */
function formatAlert(change) {
  const severityEmoji = {
    critical: '\u{1F6A8}',  // rotating light
    high: '\u{1F534}',      // red circle
    medium: '\u{1F7E0}',    // orange circle
    info: '\u{1F535}',       // blue circle
  };

  const emoji = severityEmoji[change.severity] || '\u{1F514}'; // bell
  const kws = change.keywords ? `\nKeywords: ${change.keywords.slice(0, 5).join(', ')}` : '';

  return (
    `${emoji} <b>Google Policy Alert</b> [${(change.severity || 'info').toUpperCase()}]\n\n` +
    `<b>Source:</b> ${escapeHTML(change.source)}\n` +
    `<b>Title:</b> ${escapeHTML(change.title)}\n` +
    `<b>Summary:</b> ${escapeHTML(change.summary || 'N/A')}` +
    `${kws}\n\n` +
    (change.url ? `<a href="${change.url}">View Details</a>` : '')
  );
}

/**
 * Format a digest of multiple changes
 */
function formatDigest(changes) {
  if (changes.length === 0) return null;

  const critical = changes.filter(c => c.severity === 'critical');
  const high = changes.filter(c => c.severity === 'high');
  const medium = changes.filter(c => c.severity === 'medium');
  const info = changes.filter(c => c.severity === 'info');

  let msg = `\u{1F514} <b>Google Policy Monitor Report</b>\n`;
  msg += `<i>${new Date().toISOString().split('T')[0]}</i>\n`;
  msg += `Found <b>${changes.length}</b> policy-relevant change(s)\n\n`;

  const sections = [
    { label: '\u{1F6A8} CRITICAL', items: critical },
    { label: '\u{1F534} HIGH', items: high },
    { label: '\u{1F7E0} MEDIUM', items: medium },
    { label: '\u{1F535} INFO', items: info },
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;
    msg += `${section.label} (${section.items.length}):\n`;
    for (const item of section.items.slice(0, 5)) {
      const url = item.url ? ` (<a href="${item.url}">link</a>)` : '';
      msg += `  - ${escapeHTML(item.title.substring(0, 100))}${url}\n`;
    }
    if (section.items.length > 5) {
      msg += `  ... and ${section.items.length - 5} more\n`;
    }
    msg += '\n';
  }

  return msg;
}

function escapeHTML(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Main Handler ───────────────────────────────────────────────────────────────

export default {
  /**
   * Cron trigger — main monitoring loop
   */
  async scheduled(event, env, ctx) {
    console.log(`Google Policy Monitor: cron triggered at ${new Date().toISOString()}`);
    await runMonitor(env);
  },

  /**
   * HTTP handler — manual trigger and status endpoint
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/run' || url.pathname === '/trigger') {
      // Manual trigger
      ctx.waitUntil(runMonitor(env));
      return new Response(JSON.stringify({ status: 'triggered', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/status') {
      const lastRun = await env.KV.get(KV_KEYS.LAST_RUN);
      const runCount = await env.KV.get(KV_KEYS.RUN_COUNT);
      return new Response(JSON.stringify({
        worker: 'google-policy-monitor',
        version: '1.0.0',
        lastRun,
        runCount: parseInt(runCount || '0', 10),
        sources: Object.keys(SOURCES).length,
        kvPrefix: KV_PREFIX,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/history') {
      // Query D1 for recent changes
      try {
        const results = await env.DB.prepare(
          'SELECT * FROM google_policy_changes ORDER BY detected_at DESC LIMIT 50'
        ).all();
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({
      name: 'Google Policy Monitor',
      version: '1.0.0',
      endpoints: {
        '/': 'This info page',
        '/run': 'Manual trigger (POST or GET)',
        '/status': 'Worker status and last run info',
        '/history': 'Recent detected changes from D1',
      },
      schedule: 'Every 6 hours (0 */6 * * *)',
      sources: [
        'Google Cloud Code RSS',
        'Gemini Cloud RSS',
        'GCP Status incidents',
        'Google Legal Change Log',
        'Gemini API Terms',
        'Gemini Code Assist release notes',
        'Hacker News (Algolia)',
        'Google AI Developer Forum',
      ],
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

/**
 * Core monitoring function — called by both cron and manual trigger
 */
async function runMonitor(env) {
  const startTime = Date.now();
  const kv = env.KV;
  const db = env.DB;

  // Initialize D1 table if needed
  try {
    await db.exec(D1_INIT_SQL);
  } catch (e) {
    console.error(`D1 init warning: ${e.message}`);
  }

  // Increment run count
  let runCount = parseInt(await kv.get(KV_KEYS.RUN_COUNT) || '0', 10);
  runCount++;
  await kv.put(KV_KEYS.RUN_COUNT, String(runCount), { expirationTtl: 86400 * 365 });

  console.log(`Run #${runCount} starting...`);

  // Load seen items to deduplicate
  const seenItems = await getSeenItems(kv);

  // Run all source checks in parallel
  const [
    rssChanges,
    statusChanges,
    legalChanges,
    termsChanges,
    hnChanges,
    codeAssistChanges,
    forumChanges,
  ] = await Promise.allSettled([
    checkRSSFeeds(kv),
    checkGCPStatus(kv),
    checkLegalChangelog(kv),
    checkGeminiTerms(kv),
    checkHackerNews(kv),
    checkGeminiCodeAssistNotes(kv),
    checkGoogleAIForum(kv),
  ]);

  // Collect all changes, filtering out failures
  const allChanges = [];
  const results = [rssChanges, statusChanges, legalChanges, termsChanges, hnChanges, codeAssistChanges, forumChanges];
  const sourceNames = ['RSS', 'GCP Status', 'Legal', 'Terms', 'HN', 'Code Assist', 'Forum'];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      console.log(`${sourceNames[i]}: ${result.value.length} changes found`);
      allChanges.push(...result.value);
    } else if (result.status === 'rejected') {
      console.error(`${sourceNames[i]}: check failed — ${result.reason}`);
    }
  }

  // Deduplicate against seen items
  const newChanges = allChanges.filter(c => {
    if (seenItems.has(c.id)) return false;
    seenItems.add(c.id);
    return true;
  });

  console.log(`Total: ${allChanges.length} raw, ${newChanges.length} new (after dedup)`);

  // Log all new changes to D1
  for (const change of newChanges) {
    await logToD1(db, change);
  }

  // Send alerts
  if (newChanges.length > 0) {
    // Critical/high severity: send individual alerts
    const urgent = newChanges.filter(c => c.severity === 'critical' || c.severity === 'high');
    for (const change of urgent.slice(0, 5)) {
      await sendTelegram(formatAlert(change));
      await sleep(500); // Rate limit Telegram
    }

    // Always send a digest if there are changes
    const digest = formatDigest(newChanges);
    if (digest) {
      await sendTelegram(digest);
    }
  }

  // Save state
  await saveSeenItems(kv, seenItems);
  await kv.put(KV_KEYS.LAST_RUN, new Date().toISOString(), { expirationTtl: 86400 * 30 });

  const elapsed = Date.now() - startTime;
  console.log(`Run #${runCount} complete in ${elapsed}ms. ${newChanges.length} new alerts sent.`);
}
