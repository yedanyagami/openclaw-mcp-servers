// ============================================================
// OpenClaw Tools — Unified MCP Toolkit Worker
// Consolidates 9 separate MCP Workers into 1
// Path routing: /json, /regex, /color, /timestamp, /prompt,
//               /intel, /fortune, /moltbook, /agentforge
// ============================================================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// ── JSON Toolkit ──
function handleJson(body) {
  const { action, data } = body;
  switch (action) {
    case 'validate':
      try { JSON.parse(typeof data === 'string' ? data : JSON.stringify(data)); return { valid: true }; }
      catch (e) { return { valid: false, error: e.message }; }
    case 'format':
      try { return { formatted: JSON.stringify(JSON.parse(typeof data === 'string' ? data : JSON.stringify(data)), null, 2) }; }
      catch (e) { return { error: e.message }; }
    case 'minify':
      try { return { minified: JSON.stringify(JSON.parse(typeof data === 'string' ? data : JSON.stringify(data))) }; }
      catch (e) { return { error: e.message }; }
    case 'diff':
      return { diff: 'JSON diff not yet implemented' };
    default:
      return { error: `Unknown action: ${action}`, actions: ['validate', 'format', 'minify', 'diff'] };
  }
}

// ── Regex Engine ──
function handleRegex(body) {
  const { pattern, text, flags } = body;
  if (!pattern || !text) return { error: 'Missing pattern or text' };
  try {
    const regex = new RegExp(pattern, flags || 'g');
    const matches = [...text.matchAll(regex)].map(m => ({ match: m[0], index: m.index, groups: m.groups || null }));
    return { matches, count: matches.length, pattern, flags: flags || 'g' };
  } catch (e) {
    return { error: e.message };
  }
}

// ── Color Palette ──
function handleColor(body) {
  const { color, action: colorAction } = body;
  if (!color) return { error: 'Missing color' };
  // Simple hex-to-rgb conversion
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { hex: `#${hex}`, rgb: { r, g, b }, hsl: rgbToHsl(r, g, b) };
  }
  return { error: 'Invalid hex color (expected #RRGGBB)' };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ── Timestamp Converter ──
function handleTimestamp(body) {
  const { timestamp, format } = body;
  const ts = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(ts.getTime())) return { error: 'Invalid timestamp' };
  return {
    iso: ts.toISOString(),
    unix: Math.floor(ts.getTime() / 1000),
    unix_ms: ts.getTime(),
    utc: ts.toUTCString(),
    local: ts.toString(),
    relative: getRelativeTime(ts),
  };
}

function getRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const seconds = Math.abs(Math.floor(diff / 1000));
  if (seconds < 60) return `${seconds}s ${diff > 0 ? 'ago' : 'from now'}`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${diff > 0 ? 'ago' : 'from now'}`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${diff > 0 ? 'ago' : 'from now'}`;
  return `${Math.floor(seconds / 86400)}d ${diff > 0 ? 'ago' : 'from now'}`;
}

// ── Prompt Enhancer ──
async function handlePrompt(body, env) {
  const { prompt, style } = body;
  if (!prompt) return { error: 'Missing prompt' };
  try {
    const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: `You are a prompt engineering expert. Enhance this prompt to be more specific, structured, and effective. Style: ${style || 'professional'}. Return only the enhanced prompt.` },
        { role: 'user', content: prompt },
      ],
      max_tokens: 512,
    });
    return { original: prompt, enhanced: result.response, style: style || 'professional' };
  } catch (e) {
    return { error: `AI enhancement failed: ${e.message}` };
  }
}

// ── Fortune API ──
const FORTUNES = [
  'The best time to plant a tree was 20 years ago. The second best time is now.',
  'Your code will compile on the first try today.',
  'A bug fixed today is a production incident avoided tomorrow.',
  'The AGI you seek is the AGI you build.',
  'Every great system starts with a single function.',
  'Efficiency is not about doing more, but doing what matters.',
  'The path to AGI is paved with well-tested code.',
  'Today is a good day to refactor.',
];

function handleFortune() {
  return { fortune: FORTUNES[Math.floor(Math.random() * FORTUNES.length)], timestamp: new Date().toISOString() };
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

    // Health
    if (path === '/health' || path === '/') {
      return jsonResponse({
        service: 'openclaw-tools',
        version: env.VERSION || '1.0.0',
        tools: ['json', 'regex', 'color', 'timestamp', 'prompt', 'fortune'],
        description: 'Unified MCP toolkit — consolidates 9 Workers into 1',
        timestamp: new Date().toISOString(),
      });
    }

    // Route tool requests
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));

      switch (path) {
        case '/json': return jsonResponse(handleJson(body));
        case '/regex': return jsonResponse(handleRegex(body));
        case '/color': return jsonResponse(handleColor(body));
        case '/timestamp': return jsonResponse(handleTimestamp(body));
        case '/prompt': return jsonResponse(await handlePrompt(body, env));
        case '/fortune': return jsonResponse(handleFortune());
        default: break;
      }
    }

    // GET fortune
    if (path === '/fortune' && request.method === 'GET') {
      return jsonResponse(handleFortune());
    }

    // GET timestamp
    if (path === '/timestamp' && request.method === 'GET') {
      return jsonResponse(handleTimestamp({}));
    }

    return jsonResponse({
      error: 'Not found',
      tools: {
        '/json': 'POST {action, data} — validate/format/minify JSON',
        '/regex': 'POST {pattern, text, flags?} — regex matching',
        '/color': 'POST {color} — hex/rgb/hsl conversion',
        '/timestamp': 'POST/GET {timestamp?} — timestamp conversion',
        '/prompt': 'POST {prompt, style?} — AI prompt enhancement',
        '/fortune': 'GET/POST — random fortune',
      },
    }, 404);
  },
};
