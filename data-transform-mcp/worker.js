/**
 * Data Transform MCP Server
 * Transform data between formats (CSV, JSON, YAML, XML, TOML) for AI agents.
 *
 * Tools (6 free tools, 15 req/day per IP via KV rate limiting):
 *   1. csv_to_json      — Parse CSV with headers to JSON array
 *   2. json_to_csv      — Flatten nested JSON to CSV
 *   3. yaml_to_json     — Parse YAML to JSON
 *   4. json_to_yaml     — Convert JSON to clean YAML output
 *   5. xml_to_json      — Parse XML to JSON
 *   6. data_stats       — Calculate statistics on tabular data
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'data-transform', version: '1.0.0' };
const VENDOR = 'OpenClaw Intelligence';
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

const RATE_LIMIT_MAX = 15;           // requests per day free
const RATE_LIMIT_WINDOW = 86400;     // 24 hours in seconds
const PRO_RATE_LIMIT = 150;          // requests per day Pro

// ============================================================
// In-Memory Fallback Rate Limiter (KV Safe Mode)
// When KV is unavailable, degrade to 5 req/min/IP instead of unlimited
// ============================================================
const _memRL = new Map();
const MEM_RL_LIMIT = 5;
const MEM_RL_WINDOW = 60000; // 1 minute

function memoryRateLimit(ip) {
  const now = Date.now();
  const entry = _memRL.get(ip);
  if (!entry || now - entry.ts > MEM_RL_WINDOW) {
    _memRL.set(ip, { ts: now, count: 1 });
    return { allowed: true, remaining: MEM_RL_LIMIT - 1, safeMode: true };
  }
  if (entry.count >= MEM_RL_LIMIT) {
    return { allowed: false, remaining: 0, safeMode: true };
  }
  entry.count++;
  return { allowed: true, remaining: MEM_RL_LIMIT - entry.count, safeMode: true };
}

const ECOSYSTEM = {
  json_toolkit: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  regex:        'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color:        'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  prompt:       'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp:    'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  intel:        'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune:      'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook:     'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge:   'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  data_transform: 'https://data-transform-mcp.yagami8095.workers.dev/mcp',
  store:        'https://product-store.yagami8095.workers.dev',
  fortune_api:  'https://fortune-api.yagami8095.workers.dev',
  intel_api:    'https://openclaw-intel-api.yagami8095.workers.dev',
};

// ============================================================
// Rate Limiting (KV-backed, per IP, 15 req/day)
// ============================================================

// ============================================================
// Pro API Key Validation (shared KV: prokey:{key})
// ============================================================
const PRO_DAILY_LIMIT = 1000;

async function validateProKey(kv, apiKey) {
  if (!apiKey || !kv) return null;
  try {
    const kd = await kv.get(`prokey:${apiKey}`, { type: 'json' });
    if (!kd) return null;
    if (kd.expires && new Date(kd.expires) < new Date()) return null;
    if (kd.tier === 'pro' || kd.tier === 'pro_trial') {
      return { valid: true, tier: kd.tier, daily_limit: kd.daily_limit || PRO_DAILY_LIMIT };
    }
    return null;
  } catch { return null; }
}

async function proKeyRateLimit(kv, apiKey, limit) {
  if (!kv) return { allowed: true, remaining: limit, total: limit, used: 0, pro: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:pro:${apiKey.slice(0, 16)}:${today}`;
  let count = 0;
  try { const val = await kv.get(key); count = val ? parseInt(val, 10) : 0; } catch {}
  if (count >= limit) return { allowed: false, remaining: 0, total: limit, used: count, pro: true };
  try { await kv.put(key, String(count + 1), { expirationTtl: 86400 }); } catch {}
  return { allowed: true, remaining: limit - count - 1, total: limit, used: count + 1, pro: true };
}

async function checkRateLimit(kv, ip) {
  if (!kv) return memoryRateLimit(ip);

  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:dtx:${ip}:${today}`;

  let count = 0;
  try {
    const val = await kv.get(key);
    count = val ? parseInt(val, 10) : 0;
  } catch {
    return memoryRateLimit(ip);
  }

  if (count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, total: RATE_LIMIT_MAX, used: count };
  }

  try {
    await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
  } catch {
    // ignore write failure
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - count - 1,
    total: RATE_LIMIT_MAX,
    used: count + 1,
  };
}

// ============================================================
// JSON-RPC helpers
// ============================================================

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function toolResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(message) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ============================================================
// CSV Parser — handles quoted fields, commas in values,
// escaped quotes, custom delimiters, newlines in quoted fields
// ============================================================

function parseCSV(input, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < input.length && input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      // Any char inside quotes (including newlines, delimiters)
      field += ch;
      i++;
      continue;
    }

    // Not in quotes
    if (ch === '"') {
      // Start of quoted field (only valid at field start or after delimiter)
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === delimiter) {
      row.push(field);
      field = '';
      i++;
      continue;
    }

    if (ch === '\r') {
      // Handle \r\n or standalone \r
      row.push(field);
      field = '';
      if (i + 1 < input.length && input[i + 1] === '\n') {
        i++;
      }
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        rows.push(row);
      }
      row = [];
      i++;
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      field = '';
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        rows.push(row);
      }
      row = [];
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function csvToJson(csvStr, delimiter = ',', hasHeaders = true) {
  if (!csvStr || typeof csvStr !== 'string') {
    return { error: 'csv parameter is required and must be a string' };
  }

  const rows = parseCSV(csvStr.trim(), delimiter);
  if (rows.length === 0) {
    return { error: 'CSV is empty or contains no valid rows' };
  }

  if (!hasHeaders) {
    // No headers — return array of arrays
    return {
      data: rows,
      row_count: rows.length,
      column_count: rows[0]?.length || 0,
      has_headers: false,
      ecosystem: ECOSYSTEM,
    };
  }

  const headers = rows[0];
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const val = rows[i][j] !== undefined ? rows[i][j] : '';
      // Auto-type: numbers, booleans, null
      obj[headers[j]] = autoType(val);
    }
    data.push(obj);
  }

  return {
    data,
    row_count: data.length,
    column_count: headers.length,
    columns: headers,
    has_headers: true,
    ecosystem: ECOSYSTEM,
  };
}

function autoType(val) {
  if (val === '') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === 'NULL') return null;
  // Check if it's a number (but not things like "007" or "+1234")
  if (/^-?\d+(\.\d+)?$/.test(val) && !val.startsWith('0') || val === '0' || /^-?0\.\d+$/.test(val)) {
    const n = Number(val);
    if (!isNaN(n) && isFinite(n)) return n;
  }
  return val;
}

// ============================================================
// JSON to CSV — flatten nested objects, auto-generate columns
// ============================================================

function jsonToCsv(jsonStr, delimiter = ',') {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { error: `Invalid JSON: ${e.message}` };
  }

  // Accept array of objects or single object
  if (!Array.isArray(data)) {
    if (data !== null && typeof data === 'object') {
      data = [data];
    } else {
      return { error: 'JSON must be an array of objects or a single object' };
    }
  }

  if (data.length === 0) {
    return { error: 'JSON array is empty' };
  }

  // Flatten each object
  const flatRows = data.map(item => flattenForCsv(item));

  // Collect all unique column names preserving insertion order
  const colSet = new Set();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      colSet.add(key);
    }
  }
  const columns = [...colSet];

  // Build CSV
  const lines = [];
  // Header
  lines.push(columns.map(c => csvEscapeField(c, delimiter)).join(delimiter));
  // Data rows
  for (const row of flatRows) {
    const vals = columns.map(col => {
      const v = row[col];
      if (v === null || v === undefined) return '';
      return csvEscapeField(String(v), delimiter);
    });
    lines.push(vals.join(delimiter));
  }

  const csv = lines.join('\n');

  return {
    csv,
    row_count: flatRows.length,
    column_count: columns.length,
    columns,
    ecosystem: ECOSYSTEM,
  };
}

function flattenForCsv(obj, prefix = '', result = {}) {
  if (obj === null || obj === undefined) {
    if (prefix) result[prefix] = null;
    return result;
  }
  if (typeof obj !== 'object') {
    if (prefix) result[prefix] = obj;
    return result;
  }
  if (Array.isArray(obj)) {
    if (prefix) {
      // For arrays of primitives, join with semicolons
      const allPrimitive = obj.every(v => v === null || typeof v !== 'object');
      if (allPrimitive) {
        result[prefix] = obj.join(';');
      } else {
        // Flatten each array element with index
        for (let i = 0; i < obj.length; i++) {
          flattenForCsv(obj[i], `${prefix}[${i}]`, result);
        }
      }
    }
    return result;
  }
  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      flattenForCsv(val, newKey, result);
    } else if (Array.isArray(val)) {
      flattenForCsv(val, newKey, result);
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

function csvEscapeField(field, delimiter = ',') {
  if (field.includes('"') || field.includes(delimiter) || field.includes('\n') || field.includes('\r')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

// ============================================================
// YAML Parser — handles indentation-based nesting, multiline
// strings, anchors/aliases, lists, inline flow, comments
// ============================================================

function yamlToJson(yamlStr) {
  if (!yamlStr || typeof yamlStr !== 'string') {
    return { error: 'yaml parameter is required and must be a string' };
  }

  try {
    const result = parseYAML(yamlStr);
    return {
      data: result,
      type: Array.isArray(result) ? 'array' : typeof result,
      ecosystem: ECOSYSTEM,
    };
  } catch (e) {
    return { error: `YAML parse error: ${e.message}` };
  }
}

function parseYAML(input) {
  const lines = input.split('\n');
  const anchors = {};
  const ctx = { lines, pos: 0, anchors };

  // Strip document start/end markers
  const cleaned = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed === '---' || trimmed === '...') continue;
    cleaned.push(line);
  }
  ctx.lines = cleaned;

  return parseYAMLNode(ctx, 0);
}

function parseYAMLNode(ctx, minIndent) {
  skipBlanksAndComments(ctx);
  if (ctx.pos >= ctx.lines.length) return null;

  const line = ctx.lines[ctx.pos];
  const indent = getIndent(line);
  const trimmed = line.trim();

  if (indent < minIndent) return null;

  // Check if it's a list item
  if (trimmed.startsWith('- ') || trimmed === '-') {
    return parseYAMLList(ctx, indent);
  }

  // Check if it's a mapping
  if (trimmed.includes(':')) {
    // Make sure it's a key: value, not just a string with colon
    const colonIdx = findMappingColon(trimmed);
    if (colonIdx >= 0) {
      return parseYAMLMapping(ctx, indent);
    }
  }

  // Scalar
  ctx.pos++;
  return parseYAMLScalar(trimmed, ctx.anchors);
}

function findMappingColon(trimmed) {
  // Find the colon that separates key from value (not inside quotes)
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (inSingle || inDouble) continue;
    if (ch === ':' && (i + 1 >= trimmed.length || trimmed[i + 1] === ' ' || trimmed[i + 1] === '\n')) {
      return i;
    }
  }
  return -1;
}

function parseYAMLMapping(ctx, baseIndent) {
  const result = {};

  while (ctx.pos < ctx.lines.length) {
    skipBlanksAndComments(ctx);
    if (ctx.pos >= ctx.lines.length) break;

    const line = ctx.lines[ctx.pos];
    const indent = getIndent(line);
    const trimmed = line.trim();

    if (trimmed === '' || indent < baseIndent) break;
    if (indent > baseIndent) break; // child handled recursively

    // Must be a key: value line
    const colonIdx = findMappingColon(trimmed);
    if (colonIdx < 0) break;

    // Check if this is a list item "- key: value" at the same indent
    if (trimmed.startsWith('- ')) break;

    let key = trimmed.slice(0, colonIdx).trim();
    let valueStr = trimmed.slice(colonIdx + 1).trim();

    // Strip quotes from key
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }

    // Handle anchors on keys: &anchor
    let anchor = null;
    const anchorMatch = valueStr.match(/^&(\S+)\s*(.*)/);
    if (anchorMatch) {
      anchor = anchorMatch[1];
      valueStr = anchorMatch[2];
    }

    // Handle aliases: *alias
    if (valueStr.startsWith('*')) {
      const aliasName = valueStr.slice(1).split(/\s/)[0];
      const aliasVal = ctx.anchors[aliasName];
      result[key] = aliasVal !== undefined ? JSON.parse(JSON.stringify(aliasVal)) : null;
      if (anchor) ctx.anchors[anchor] = result[key];
      ctx.pos++;
      continue;
    }

    let value;

    if (valueStr === '' || valueStr === null) {
      // Value is on next lines (nested mapping, list, or multiline)
      ctx.pos++;
      skipBlanksAndComments(ctx);
      if (ctx.pos < ctx.lines.length) {
        const nextLine = ctx.lines[ctx.pos];
        const nextIndent = getIndent(nextLine);
        const nextTrimmed = nextLine.trim();
        if (nextIndent > baseIndent) {
          // Check for block scalar indicators on NEXT line
          if (nextTrimmed.startsWith('- ') || nextTrimmed === '-') {
            value = parseYAMLList(ctx, nextIndent);
          } else {
            value = parseYAMLNode(ctx, nextIndent);
          }
        } else {
          value = null;
        }
      } else {
        value = null;
      }
    } else if (valueStr === '|' || valueStr === '|-' || valueStr === '|+') {
      // Block literal scalar
      const chomp = valueStr;
      ctx.pos++;
      value = parseBlockScalar(ctx, baseIndent, chomp);
    } else if (valueStr === '>' || valueStr === '>-' || valueStr === '>+') {
      // Block folded scalar
      const chomp = valueStr;
      ctx.pos++;
      value = parseBlockScalar(ctx, baseIndent, chomp);
    } else if (valueStr.startsWith('[')) {
      // Inline flow sequence
      value = parseFlowSequence(valueStr);
      ctx.pos++;
    } else if (valueStr.startsWith('{')) {
      // Inline flow mapping
      value = parseFlowMapping(valueStr);
      ctx.pos++;
    } else {
      // Inline scalar
      value = parseYAMLScalar(valueStr, ctx.anchors);
      ctx.pos++;
    }

    if (anchor) ctx.anchors[anchor] = value;
    result[key] = value;
  }

  return result;
}

function parseYAMLList(ctx, baseIndent) {
  const result = [];

  while (ctx.pos < ctx.lines.length) {
    skipBlanksAndComments(ctx);
    if (ctx.pos >= ctx.lines.length) break;

    const line = ctx.lines[ctx.pos];
    const indent = getIndent(line);
    const trimmed = line.trim();

    if (trimmed === '' || indent < baseIndent) break;
    if (indent > baseIndent) break;

    if (!trimmed.startsWith('- ') && trimmed !== '-') break;

    const afterDash = trimmed === '-' ? '' : trimmed.slice(2).trim();

    if (afterDash === '' || afterDash === null) {
      // Next line(s) hold the value
      ctx.pos++;
      skipBlanksAndComments(ctx);
      if (ctx.pos < ctx.lines.length) {
        const nextIndent = getIndent(ctx.lines[ctx.pos]);
        if (nextIndent > baseIndent) {
          const item = parseYAMLNode(ctx, nextIndent);
          result.push(item);
        } else {
          result.push(null);
        }
      } else {
        result.push(null);
      }
      continue;
    }

    // Check for inline mapping "- key: value"
    const colonIdx = findMappingColon(afterDash);
    if (colonIdx >= 0) {
      // It's an inline mapping start. We need to handle potentially multi-line mappings.
      // Parse as a mapping starting from this item's content indent
      const itemIndent = indent + 2; // after "- "
      // Reconstruct: replace the "- key: value" with "key: value" at higher indent
      const originalLine = ctx.lines[ctx.pos];
      const dashPos = originalLine.indexOf('-');
      ctx.lines[ctx.pos] = ' '.repeat(dashPos + 2) + afterDash;
      const item = parseYAMLMapping(ctx, dashPos + 2);
      result.push(item);
      continue;
    }

    // Check for inline flow
    if (afterDash.startsWith('[')) {
      result.push(parseFlowSequence(afterDash));
      ctx.pos++;
      continue;
    }
    if (afterDash.startsWith('{')) {
      result.push(parseFlowMapping(afterDash));
      ctx.pos++;
      continue;
    }

    // Alias
    if (afterDash.startsWith('*')) {
      const aliasName = afterDash.slice(1).split(/\s/)[0];
      const aliasVal = ctx.anchors[aliasName];
      result.push(aliasVal !== undefined ? JSON.parse(JSON.stringify(aliasVal)) : null);
      ctx.pos++;
      continue;
    }

    // Simple scalar
    result.push(parseYAMLScalar(afterDash, ctx.anchors));
    ctx.pos++;
  }

  return result;
}

function parseBlockScalar(ctx, parentIndent, mode) {
  const lines = [];
  let scalarIndent = -1;

  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    const trimmed = line.trim();

    // Blank lines are included in block scalars
    if (trimmed === '') {
      lines.push('');
      ctx.pos++;
      continue;
    }

    const indent = getIndent(line);
    if (indent <= parentIndent) break;

    if (scalarIndent < 0) scalarIndent = indent;
    if (indent < scalarIndent) break;

    lines.push(line.slice(scalarIndent));
    ctx.pos++;
  }

  // Remove trailing blank lines for clip/strip modes
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  if (mode.startsWith('|')) {
    // Literal: preserve newlines
    let text = lines.join('\n');
    if (mode === '|' || mode === '|+') text += '\n';
    // |- strips trailing newline (already done)
    if (mode === '|-') { /* no trailing newline */ }
    return text;
  }
  if (mode.startsWith('>')) {
    // Folded: replace single newlines with spaces
    let text = '';
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '') {
        text += '\n';
      } else if (i > 0 && lines[i - 1] !== '' && text.length > 0 && !text.endsWith('\n')) {
        text += ' ' + lines[i];
      } else {
        text += lines[i];
      }
    }
    if (mode === '>' || mode === '>+') text += '\n';
    return text;
  }

  return lines.join('\n');
}

function parseFlowSequence(str) {
  // Parse [a, b, c] inline YAML flow
  const inner = str.trim();
  if (!inner.startsWith('[') || !inner.endsWith(']')) return str;
  const content = inner.slice(1, -1).trim();
  if (content === '') return [];
  return splitFlowItems(content).map(item => {
    item = item.trim();
    if (item.startsWith('{')) return parseFlowMapping(item);
    if (item.startsWith('[')) return parseFlowSequence(item);
    return parseYAMLScalar(item, {});
  });
}

function parseFlowMapping(str) {
  const inner = str.trim();
  if (!inner.startsWith('{') || !inner.endsWith('}')) return str;
  const content = inner.slice(1, -1).trim();
  if (content === '') return {};
  const result = {};
  const pairs = splitFlowItems(content);
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx < 0) continue;
    let key = pair.slice(0, colonIdx).trim();
    let val = pair.slice(colonIdx + 1).trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }
    if (val.startsWith('{')) {
      result[key] = parseFlowMapping(val);
    } else if (val.startsWith('[')) {
      result[key] = parseFlowSequence(val);
    } else {
      result[key] = parseYAMLScalar(val, {});
    }
  }
  return result;
}

function splitFlowItems(content) {
  const items = [];
  let depth = 0;
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
    if (inSingle || inDouble) { current += ch; continue; }
    if (ch === '[' || ch === '{') { depth++; current += ch; continue; }
    if (ch === ']' || ch === '}') { depth--; current += ch; continue; }
    if (ch === ',' && depth === 0) {
      items.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

function parseYAMLScalar(val, anchors) {
  if (val === '' || val === '~' || val === 'null' || val === 'Null' || val === 'NULL') return null;
  if (val === 'true' || val === 'True' || val === 'TRUE') return true;
  if (val === 'false' || val === 'False' || val === 'FALSE') return false;

  // Handle anchors on scalars
  const anchorMatch = val.match(/^&(\S+)\s+(.*)/);
  if (anchorMatch) {
    const anchor = anchorMatch[1];
    const rest = anchorMatch[2];
    const parsed = parseYAMLScalar(rest, anchors);
    anchors[anchor] = parsed;
    return parsed;
  }

  // Alias
  if (val.startsWith('*')) {
    const aliasName = val.slice(1).split(/\s/)[0];
    return anchors[aliasName] !== undefined ? JSON.parse(JSON.stringify(anchors[aliasName])) : null;
  }

  // Quoted strings
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\').replace(/\\"/g, '"');
  }

  // Strip inline comments
  const commentIdx = val.indexOf(' #');
  const cleaned = commentIdx >= 0 ? val.slice(0, commentIdx).trim() : val;

  // Numbers
  if (/^-?\d+$/.test(cleaned)) return parseInt(cleaned, 10);
  if (/^-?\d+\.\d+$/.test(cleaned)) return parseFloat(cleaned);
  if (/^0x[0-9a-fA-F]+$/.test(cleaned)) return parseInt(cleaned, 16);
  if (/^0o[0-7]+$/.test(cleaned)) return parseInt(cleaned.slice(2), 8);

  // Infinity / NaN
  if (cleaned === '.inf' || cleaned === '.Inf') return Infinity;
  if (cleaned === '-.inf' || cleaned === '-.Inf') return -Infinity;
  if (cleaned === '.nan' || cleaned === '.NaN') return NaN;

  return cleaned;
}

function skipBlanksAndComments(ctx) {
  while (ctx.pos < ctx.lines.length) {
    const trimmed = ctx.lines[ctx.pos].trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      ctx.pos++;
      continue;
    }
    break;
  }
}

function getIndent(line) {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ' ') count++;
    else break;
  }
  return count;
}

// ============================================================
// JSON to YAML — clean output
// ============================================================

function jsonToYaml(jsonStr, indent = 2) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { error: `Invalid JSON: ${e.message}` };
  }

  const yaml = toYAML(data, 0, indent);

  return {
    yaml,
    ecosystem: ECOSYSTEM,
  };
}

function toYAML(value, depth, indent) {
  if (value === null) return 'null';
  if (value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (value === Infinity) return '.inf';
    if (value === -Infinity) return '-.inf';
    if (isNaN(value)) return '.nan';
    return String(value);
  }
  if (typeof value === 'string') {
    return yamlQuoteString(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const lines = [];
    const pad = ' '.repeat(depth * indent);
    for (const item of value) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const objYaml = toYAMLMapping(item, depth + 1, indent);
        // First key on same line as dash
        const firstNewline = objYaml.indexOf('\n');
        if (firstNewline < 0) {
          lines.push(`${pad}- ${objYaml.trim()}`);
        } else {
          const firstLine = objYaml.slice(0, firstNewline).trim();
          const rest = objYaml.slice(firstNewline + 1);
          lines.push(`${pad}- ${firstLine}`);
          if (rest.trim()) lines.push(rest.replace(/\n$/, ''));
        }
      } else {
        lines.push(`${pad}- ${toYAML(item, depth + 1, indent)}`);
      }
    }
    return lines.join('\n');
  }

  if (typeof value === 'object') {
    if (Object.keys(value).length === 0) return '{}';
    return toYAMLMapping(value, depth, indent);
  }

  return String(value);
}

function toYAMLMapping(obj, depth, indent) {
  const pad = ' '.repeat(depth * indent);
  const lines = [];
  for (const [key, val] of Object.entries(obj)) {
    const safeKey = yamlSafeKey(key);
    if (val !== null && typeof val === 'object') {
      if (Array.isArray(val) && val.length === 0) {
        lines.push(`${pad}${safeKey}: []`);
      } else if (!Array.isArray(val) && Object.keys(val).length === 0) {
        lines.push(`${pad}${safeKey}: {}`);
      } else {
        lines.push(`${pad}${safeKey}:`);
        lines.push(toYAML(val, depth + 1, indent));
      }
    } else {
      lines.push(`${pad}${safeKey}: ${toYAML(val, depth + 1, indent)}`);
    }
  }
  return lines.join('\n');
}

function yamlSafeKey(key) {
  if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key)) return key;
  return '"' + key.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function yamlQuoteString(str) {
  // If the string looks like a YAML special value, quote it
  const specials = ['true', 'false', 'null', 'True', 'False', 'Null', 'TRUE', 'FALSE', 'NULL', '~', 'yes', 'no', 'on', 'off', 'Yes', 'No', 'On', 'Off'];
  if (specials.includes(str)) return `"${str}"`;
  if (/^-?\d+(\.\d+)?$/.test(str)) return `"${str}"`;
  if (str.includes('\n')) {
    // Use block literal for multiline
    const lines = str.split('\n');
    const indented = lines.map(l => '  ' + l).join('\n');
    return '|\n' + indented;
  }
  if (/[:{}\[\],&*?|>!%@`#]/.test(str) || str.startsWith(' ') || str.endsWith(' ')) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return str;
}

// ============================================================
// XML Parser — handles attributes, text nodes, namespaces,
// self-closing tags, CDATA, comments, processing instructions
// ============================================================

function xmlToJson(xmlStr) {
  if (!xmlStr || typeof xmlStr !== 'string') {
    return { error: 'xml parameter is required and must be a string' };
  }

  try {
    const result = parseXML(xmlStr.trim());
    return {
      data: result,
      ecosystem: ECOSYSTEM,
    };
  } catch (e) {
    return { error: `XML parse error: ${e.message}` };
  }
}

function parseXML(xml) {
  let pos = 0;

  function skipWhitespace() {
    while (pos < xml.length && /\s/.test(xml[pos])) pos++;
  }

  function parseDocument() {
    skipWhitespace();
    // Skip XML declaration <?xml ... ?>
    while (pos < xml.length && xml.slice(pos, pos + 2) === '<?') {
      const end = xml.indexOf('?>', pos);
      if (end < 0) throw new Error('Unterminated processing instruction');
      pos = end + 2;
      skipWhitespace();
    }
    // Skip DOCTYPE
    while (pos < xml.length && xml.slice(pos, pos + 9) === '<!DOCTYPE') {
      const end = xml.indexOf('>', pos);
      if (end < 0) throw new Error('Unterminated DOCTYPE');
      pos = end + 1;
      skipWhitespace();
    }
    // Skip comments at top level
    while (pos < xml.length && xml.slice(pos, pos + 4) === '<!--') {
      const end = xml.indexOf('-->', pos);
      if (end < 0) throw new Error('Unterminated comment');
      pos = end + 3;
      skipWhitespace();
    }
    return parseElement();
  }

  function parseElement() {
    skipWhitespace();

    if (pos >= xml.length || xml[pos] !== '<') {
      throw new Error(`Expected '<' at position ${pos}`);
    }

    pos++; // skip <

    // Read tag name
    const tagStart = pos;
    while (pos < xml.length && !/[\s/>]/.test(xml[pos])) pos++;
    const tagName = xml.slice(tagStart, pos);
    if (!tagName) throw new Error(`Empty tag name at position ${tagStart}`);

    const node = {};
    const attrs = {};
    let hasAttrs = false;

    // Parse attributes
    skipWhitespace();
    while (pos < xml.length && xml[pos] !== '>' && xml[pos] !== '/') {
      const attrName = readAttrName();
      if (!attrName) break;
      skipWhitespace();

      let attrValue = '';
      if (pos < xml.length && xml[pos] === '=') {
        pos++; // skip =
        skipWhitespace();
        attrValue = readAttrValue();
      }

      attrs[`@${attrName}`] = attrValue;
      hasAttrs = true;
      skipWhitespace();
    }

    // Self-closing tag
    if (pos < xml.length && xml[pos] === '/') {
      pos++; // skip /
      if (pos < xml.length && xml[pos] === '>') pos++; // skip >
      if (hasAttrs) {
        return { [tagName]: attrs };
      }
      return { [tagName]: null };
    }

    if (pos < xml.length && xml[pos] === '>') pos++; // skip >

    // Parse children
    const children = [];
    let textContent = '';

    while (pos < xml.length) {
      skipWhitespace();

      // Check for closing tag
      if (xml.slice(pos, pos + 2) === '</') {
        pos += 2;
        // Read closing tag name
        const closeStart = pos;
        while (pos < xml.length && xml[pos] !== '>') pos++;
        const closeName = xml.slice(closeStart, pos).trim();
        if (pos < xml.length) pos++; // skip >
        if (closeName !== tagName) {
          throw new Error(`Mismatched closing tag: expected </${tagName}>, got </${closeName}>`);
        }
        break;
      }

      // CDATA
      if (xml.slice(pos, pos + 9) === '<![CDATA[') {
        const cdataEnd = xml.indexOf(']]>', pos + 9);
        if (cdataEnd < 0) throw new Error('Unterminated CDATA section');
        textContent += xml.slice(pos + 9, cdataEnd);
        pos = cdataEnd + 3;
        continue;
      }

      // Comment
      if (xml.slice(pos, pos + 4) === '<!--') {
        const commentEnd = xml.indexOf('-->', pos + 4);
        if (commentEnd < 0) throw new Error('Unterminated comment');
        pos = commentEnd + 3;
        continue;
      }

      // Child element
      if (xml[pos] === '<' && pos + 1 < xml.length && xml[pos + 1] !== '/') {
        const child = parseElement();
        children.push(child);
        continue;
      }

      // Text content
      const textStart = pos;
      while (pos < xml.length && xml[pos] !== '<') pos++;
      const text = xml.slice(textStart, pos);
      if (text.trim()) {
        textContent += decodeXMLEntities(text.trim());
      }
    }

    // Build result for this tag
    const content = {};

    if (hasAttrs) {
      Object.assign(content, attrs);
    }

    if (children.length > 0) {
      // Group children by tag name
      const childMap = {};
      for (const child of children) {
        const childTag = Object.keys(child)[0];
        if (!childMap[childTag]) {
          childMap[childTag] = [];
        }
        childMap[childTag].push(child[childTag]);
      }

      for (const [childTag, vals] of Object.entries(childMap)) {
        if (vals.length === 1) {
          content[childTag] = vals[0];
        } else {
          content[childTag] = vals;
        }
      }

      if (textContent) {
        content['#text'] = textContent;
      }
    } else if (textContent) {
      if (hasAttrs) {
        content['#text'] = textContent;
      } else {
        // Simple text element — return as scalar
        return { [tagName]: autoTypeXML(textContent) };
      }
    } else if (!hasAttrs) {
      return { [tagName]: null };
    }

    if (Object.keys(content).length === 0) {
      return { [tagName]: null };
    }

    return { [tagName]: content };
  }

  function readAttrName() {
    const start = pos;
    while (pos < xml.length && /[a-zA-Z0-9_:.\-]/.test(xml[pos])) pos++;
    return xml.slice(start, pos);
  }

  function readAttrValue() {
    if (xml[pos] === '"' || xml[pos] === "'") {
      const quote = xml[pos];
      pos++; // skip opening quote
      const start = pos;
      while (pos < xml.length && xml[pos] !== quote) pos++;
      const value = xml.slice(start, pos);
      if (pos < xml.length) pos++; // skip closing quote
      return decodeXMLEntities(value);
    }
    // Unquoted attribute value
    const start = pos;
    while (pos < xml.length && !/[\s>]/.test(xml[pos])) pos++;
    return decodeXMLEntities(xml.slice(start, pos));
  }

  return parseDocument();
}

function decodeXMLEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function autoTypeXML(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+$/.test(val)) {
    const n = parseInt(val, 10);
    if (n >= Number.MIN_SAFE_INTEGER && n <= Number.MAX_SAFE_INTEGER) return n;
  }
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  return val;
}

// ============================================================
// data_stats — Calculate statistics on tabular data
// ============================================================

function dataStats(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { error: `Invalid JSON: ${e.message}` };
  }

  if (!Array.isArray(data)) {
    return { error: 'Input must be a JSON array of objects (tabular data)' };
  }

  if (data.length === 0) {
    return { row_count: 0, columns: [], ecosystem: ECOSYSTEM };
  }

  // Collect all column names
  const colSet = new Set();
  for (const row of data) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      for (const key of Object.keys(row)) {
        colSet.add(key);
      }
    }
  }
  const columns = [...colSet];
  const stats = {};

  for (const col of columns) {
    const values = data.map(row => (row && typeof row === 'object') ? row[col] : undefined);
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const nullCount = values.length - nonNull.length;
    const types = {};
    const numericValues = [];
    const uniqueSet = new Set();

    for (const v of nonNull) {
      const t = typeof v;
      types[t] = (types[t] || 0) + 1;

      if (typeof v === 'number' && isFinite(v)) {
        numericValues.push(v);
      } else if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
        numericValues.push(parseFloat(v));
      }

      // Track unique values (only for reasonable cardinality)
      if (uniqueSet.size < 1001) {
        uniqueSet.add(typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    }

    const colStat = {
      type: Object.keys(types).sort((a, b) => types[b] - types[a])[0] || 'unknown',
      type_distribution: types,
      total: values.length,
      non_null: nonNull.length,
      null_count: nullCount,
      unique_count: Math.min(uniqueSet.size, 1000),
      unique_capped: uniqueSet.size > 1000,
    };

    if (numericValues.length > 0) {
      numericValues.sort((a, b) => a - b);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const mean = sum / numericValues.length;
      const min = numericValues[0];
      const max = numericValues[numericValues.length - 1];
      const median = numericValues.length % 2 === 0
        ? (numericValues[numericValues.length / 2 - 1] + numericValues[numericValues.length / 2]) / 2
        : numericValues[Math.floor(numericValues.length / 2)];

      // Standard deviation
      const variance = numericValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / numericValues.length;
      const stddev = Math.sqrt(variance);

      colStat.numeric = {
        min,
        max,
        mean: Math.round(mean * 1000) / 1000,
        median,
        sum: Math.round(sum * 1000) / 1000,
        stddev: Math.round(stddev * 1000) / 1000,
        count: numericValues.length,
      };
    }

    // Show top unique values if cardinality is low
    if (uniqueSet.size <= 20) {
      colStat.unique_values = [...uniqueSet];
    }

    stats[col] = colStat;
  }

  return {
    row_count: data.length,
    column_count: columns.length,
    columns,
    column_stats: stats,
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// MCP Tools Definitions
// ============================================================

const TOOLS = [
  {
    name: 'csv_to_json',
    description: 'Parse CSV text with headers into a JSON array of objects. Handles quoted fields, commas inside values, escaped quotes, different delimiters (comma, tab, semicolon, pipe). Set has_headers=false for headerless CSV.',
    inputSchema: {
      type: 'object',
      properties: {
        csv:         { type: 'string', description: 'The CSV text to parse' },
        delimiter:   { type: 'string', description: 'Field delimiter character (default: ","). Use "\\t" for tab.', default: ',' },
        has_headers: { type: 'boolean', description: 'If true (default), first row is treated as column headers', default: true },
      },
      required: ['csv'],
    },
  },
  {
    name: 'json_to_csv',
    description: 'Convert a JSON array of objects (or single object) to CSV format. Automatically flattens nested objects into dot-notation column names (e.g. "address.city"). Arrays of primitives are joined with semicolons.',
    inputSchema: {
      type: 'object',
      properties: {
        json:      { type: 'string', description: 'JSON string (array of objects or single object)' },
        delimiter: { type: 'string', description: 'Field delimiter (default: ",")', default: ',' },
      },
      required: ['json'],
    },
  },
  {
    name: 'yaml_to_json',
    description: 'Parse YAML text into JSON. Supports indentation-based nesting, multiline strings (| and > block scalars), anchors (&) and aliases (*), flow sequences [...], flow mappings {...}, comments (#), and all YAML scalar types.',
    inputSchema: {
      type: 'object',
      properties: {
        yaml: { type: 'string', description: 'The YAML text to parse' },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'json_to_yaml',
    description: 'Convert JSON to clean, human-readable YAML output. Produces properly indented YAML with safe string quoting, block scalars for multiline strings, and empty collection literals ([] and {}).',
    inputSchema: {
      type: 'object',
      properties: {
        json:   { type: 'string', description: 'JSON string to convert' },
        indent: { type: 'integer', description: 'Indentation spaces per level (default: 2)', default: 2, minimum: 1, maximum: 8 },
      },
      required: ['json'],
    },
  },
  {
    name: 'xml_to_json',
    description: 'Parse XML text into JSON. Handles element attributes (prefixed with @), text nodes (#text), self-closing tags, CDATA sections, namespaced elements, nested elements, and XML entity decoding. Repeated sibling elements become arrays.',
    inputSchema: {
      type: 'object',
      properties: {
        xml: { type: 'string', description: 'The XML text to parse' },
      },
      required: ['xml'],
    },
  },
  {
    name: 'data_stats',
    description: 'Calculate statistics on tabular data (JSON array of objects). Returns per-column: data type distribution, null count, unique value count. For numeric columns: min, max, mean, median, sum, standard deviation. Shows unique values for low-cardinality columns.',
    inputSchema: {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'JSON array of objects (tabular data)' },
      },
      required: ['json'],
    },
  },
];

// ============================================================
// MCP Tool Dispatch
// ============================================================

async function handleToolCall(id, params) {
  const { name, arguments: args } = params;

  try {
    let result;
    switch (name) {
      case 'csv_to_json': {
        let delim = args?.delimiter ?? ',';
        if (delim === '\\t' || delim === 'tab') delim = '\t';
        result = csvToJson(args?.csv ?? '', delim, args?.has_headers !== false);
        break;
      }
      case 'json_to_csv': {
        let delim = args?.delimiter ?? ',';
        if (delim === '\\t' || delim === 'tab') delim = '\t';
        result = jsonToCsv(args?.json ?? '', delim);
        break;
      }
      case 'yaml_to_json':
        result = yamlToJson(args?.yaml ?? '');
        break;
      case 'json_to_yaml':
        result = jsonToYaml(args?.json ?? '', args?.indent ?? 2);
        break;
      case 'xml_to_json':
        result = xmlToJson(args?.xml ?? '');
        break;
      case 'data_stats':
        result = dataStats(args?.json ?? '');
        break;
      default:
        return jsonRpcError(id, -32601, `Tool not found: ${name}`);
    }

    if (result.error) {
      return jsonRpcResponse(id, toolError(result.error));
    }
    return jsonRpcResponse(id, toolResult(result));
  } catch (e) {
    return jsonRpcResponse(id, toolError(`Internal error: ${e.message}`));
  }
}

// Semantic Cache — deterministic tool results cached in KV (24h TTL)
async function cacheHash(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCached(kv, server, tool, args) {
  if (!kv) return null;
  try {
    const h = await cacheHash(JSON.stringify(args));
    const val = await kv.get(`cache:${server}:${tool}:${h}`);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function setCache(kv, server, tool, args, result, ttl = 86400) {
  if (!kv) return;
  try {
    const h = await cacheHash(JSON.stringify(args));
    await kv.put(`cache:${server}:${tool}:${h}`, JSON.stringify(result), { expirationTtl: ttl });
  } catch {}
}

// Dynamic Upgrade Prompt — progressive messaging based on usage
function addUpgradePrompt(response, rateLimitInfo) {
  if (!rateLimitInfo || !response?.result?.content?.[0]) return;
  if (response.result.isError) return;
  const c = response.result.content[0];
  if (c.type !== 'text' || !c.text) return;

  const used = rateLimitInfo.used || 0;
  const remaining = rateLimitInfo.remaining ?? 0;

  let msg = '';
  if (remaining <= 2 && remaining > 0) {
    msg = `\n\n⚡ ${remaining} call${remaining === 1 ? '' : 's'} left today. Pro $29/mo: paypal.me/Yagami8095/29 (PayPal) | https://product-store.yagami8095.workers.dev/products/ecosystem-pro (Card/Stripe)`;
  } else if (used <= 3) {
    msg = '\n\n— powered by OpenClaw (openclaw.dev)';
  }

  if (msg) c.text += msg;
}

// ============================================================
// MCP Protocol dispatcher
// ============================================================

async function handleMcpRequest(req, kv, clientIp, _proKeyInfo, apiKey) {
  const isBatch = Array.isArray(req);
  const requests = isBatch ? req : [req];
  const responses = [];

  // For tool calls, check rate limit once per batch
  const hasToolCall = requests.some(r => r.method === 'tools/call');
  let rateLimitInfo = null;
  if (hasToolCall) {
    rateLimitInfo = await checkRateLimit(kv, clientIp);

      // Pro key override: use higher limit
      if (_proKeyInfo && _proKeyInfo.valid) {
        rateLimitInfo = await proKeyRateLimit(kv || env?.KV, apiKey, _proKeyInfo.daily_limit);
      }

    if (!rateLimitInfo.allowed) {
      const rl = jsonRpcError(
        requests.find(r => r.method === 'tools/call')?.id ?? null,
        -32029,
        `Rate limit exceeded (${RATE_LIMIT_MAX}/day). FREE 7-day trial (100 calls/day): https://product-store.yagami8095.workers.dev/auth/login\n\nPro ($29/mo, 50,000/month): https://paypal.me/Yagami8095/29 (PayPal) | https://product-store.yagami8095.workers.dev/products/ecosystem-pro (Card/Stripe) | x402: $0.05/call USDC on Base`
      );
      return isBatch ? [rl] : rl;
    }
  }

  for (const r of requests) {
    if (!r || typeof r !== 'object' || r.jsonrpc !== '2.0' || !r.method) {
      responses.push(jsonRpcError(r?.id ?? null, -32600, 'Invalid JSON-RPC 2.0 request'));
      continue;
    }

    switch (r.method) {
      case 'initialize':
        responses.push(jsonRpcResponse(r.id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: CAPABILITIES,
          serverInfo: SERVER_INFO,
          vendor: VENDOR,
        }));
        break;

      case 'notifications/initialized':
        // No response for notifications
        break;

      case 'ping':
        responses.push(jsonRpcResponse(r.id, {}));
        break;

      case 'tools/list':
        responses.push(jsonRpcResponse(r.id, { tools: TOOLS }));
        break;

      case 'tools/call': {
        const toolName = r.params?.name;
        const toolArgs = r.params?.arguments || {};
        Object.keys(toolArgs).forEach(k => { if (typeof toolArgs[k] === 'string') toolArgs[k] = sanitizeInput(toolArgs[k]); });

        // Semantic cache check
        const cached = await getCached(kv, 'dtx', toolName, toolArgs);
        if (cached) {
          const cachedResp = jsonRpcResponse(r.id, cached);
          addUpgradePrompt(cachedResp, rateLimitInfo);
          responses.push(cachedResp);
          break;
        }

        const toolResp = await handleToolCall(r.id, r.params || {});
        addUpgradePrompt(toolResp, rateLimitInfo);

        // Cache successful results (24h)
        if (toolResp?.result && !toolResp.result.isError) {
          await setCache(kv, 'dtx', toolName, toolArgs, toolResp.result);
        }

        responses.push(toolResp);
        break;
      }

      default:
        responses.push(jsonRpcError(r.id, -32601, `Method not found: ${r.method}`));
    }
  }

  const filtered = responses.filter(Boolean);
  if (filtered.length === 0) return null; // all notifications
  return isBatch ? filtered : filtered[0];
}

// ============================================================
// Landing Page
// ============================================================

function buildLandingHtml() {
  const tools = [
    { name: 'csv_to_json',  desc: 'Parse CSV with headers to JSON array — handles quoted fields, commas in values, custom delimiters' },
    { name: 'json_to_csv',  desc: 'Flatten nested JSON to CSV with auto-generated dot-notation column names' },
    { name: 'yaml_to_json', desc: 'Parse YAML to JSON — multiline strings, anchors/aliases, flow sequences, comments' },
    { name: 'json_to_yaml', desc: 'Convert JSON to clean, human-readable YAML output' },
    { name: 'xml_to_json',  desc: 'Parse XML to JSON — attributes, text nodes, CDATA, namespaces, self-closing tags' },
    { name: 'data_stats',   desc: 'Statistics on tabular data: row count, column types, null counts, min/max/mean, unique values' },
  ];

  const toolsHtml = tools.map(t => `
        <li class="py-3 border-b border-cyan-900/50 last:border-0">
          <code class="text-cyan-400 font-semibold">${t.name}</code>
          <span class="text-gray-400 text-sm ml-2">— ${t.desc}</span>
        </li>`).join('');

  const ecosystemHtml = Object.entries({
    'json-toolkit-mcp':       { url: ECOSYSTEM.json_toolkit, desc: 'JSON format, validate, diff, query, transform, schema generation' },
    'openclaw-intel-mcp':     { url: ECOSYSTEM.intel,        desc: 'AI market intelligence — track Claude Code, Cursor, Devin growth trends' },
    'openclaw-fortune-mcp':   { url: ECOSYSTEM.fortune,      desc: 'Daily zodiac horoscope & tarot readings for all 12 signs' },
    'moltbook-publisher-mcp': { url: ECOSYSTEM.moltbook,     desc: 'Japanese content publishing — MD to HTML, SEO, EN to JP for note.com/Zenn/Qiita' },
    'agentforge-compare-mcp': { url: ECOSYSTEM.agentforge,   desc: 'AI coding tool comparison — Claude Code vs Cursor vs Devin analysis' },
    'regex-engine-mcp':       { url: ECOSYSTEM.regex,        desc: 'Regex testing, debugging, explanation & generation with examples' },
    'color-palette-mcp':      { url: ECOSYSTEM.color,        desc: 'Color palette generation, conversion, contrast checks & harmony' },
    'prompt-enhancer-mcp':    { url: ECOSYSTEM.prompt,       desc: 'Prompt optimization, rewriting, scoring & multilingual enhancement' },
    'timestamp-converter-mcp':{ url: ECOSYSTEM.timestamp,    desc: 'Unix/ISO timestamp conversion, timezone math & duration calc' },
    'product-store':          { url: ECOSYSTEM.store,         desc: 'AI tools, templates, and intelligence products' },
  }).map(([name, info]) => `
        <li class="py-2 text-sm">
          <a href="${info.url.replace('/mcp', '')}" class="text-cyan-400 hover:underline font-medium">${name}</a>
          <span class="text-gray-500 ml-2">— ${info.desc}</span>
        </li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data Transform MCP — OpenClaw Intelligence</title>
  <meta name="description" content="Free MCP server to transform data between CSV, JSON, YAML, and XML formats. Real parsers handle edge cases. Works with Claude Code, Cursor, Windsurf.">
  <meta name="keywords" content="CSV to JSON, JSON to CSV, YAML parser, XML parser, data transform, MCP server, AI tools, Claude Code">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://data-transform-mcp.yagami8095.workers.dev">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Data Transform MCP Server - CSV, JSON, YAML, XML Conversion | OpenClaw">
  <meta property="og:description" content="Free MCP server to transform data between CSV, JSON, YAML, and XML formats. Real parsers handle edge cases. Works with Claude Code, Cursor, Windsurf.">
  <meta property="og:url" content="https://data-transform-mcp.yagami8095.workers.dev">
  <meta property="og:site_name" content="OpenClaw Intelligence">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Data Transform MCP Server - CSV, JSON, YAML, XML Conversion | OpenClaw">
  <meta name="twitter:description" content="Free MCP server to transform data between CSV, JSON, YAML, and XML formats. Real parsers handle edge cases. Works with Claude Code, Cursor, Windsurf.">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    pre { scrollbar-width: thin; scrollbar-color: #0891b2 #083344; }
    pre::-webkit-scrollbar { height: 6px; }
    pre::-webkit-scrollbar-track { background: #083344; }
    pre::-webkit-scrollbar-thumb { background: #0891b2; border-radius: 3px; }
  </style>

  <script type="application/ld+json">
  {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Data Transform MCP Server",
  "description": "Free MCP server to transform data between CSV, JSON, YAML, and XML formats. Real parsers handle edge cases. Works with Claude Code, Cursor, Windsurf.",
  "url": "https://data-transform-mcp.yagami8095.workers.dev",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "OpenClaw Intelligence",
    "url": "https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers"
  }
}
  <\/script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen font-sans">

  <!-- Header -->
  <header class="border-b border-cyan-900/50 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">DT</div>
        <span class="font-bold text-lg text-white">Data Transform MCP</span>
        <span class="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">v1.0.0</span>
      </div>
      <span class="text-xs text-gray-500">by OpenClaw Intelligence</span>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12">

    <!-- Hero -->
    <div class="mb-12 text-center">
      <div class="inline-block bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-800/50 rounded-2xl px-6 py-2 mb-6">
        <span class="text-cyan-400 text-sm font-medium">Free Tier: ${RATE_LIMIT_MAX} requests/day per IP</span>
      </div>
      <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
        Data Transform MCP Server
      </h1>
      <p class="text-gray-400 text-lg max-w-2xl mx-auto">
        6 data transformation tools for AI agents — convert between CSV, JSON, YAML, and XML with real parsers that handle edge cases.
      </p>
    </div>

    <!-- Quick Connect -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40 shadow-lg shadow-cyan-950/20">
      <h2 class="text-lg font-bold mb-1 text-white">Quick Connect</h2>
      <p class="text-gray-500 text-sm mb-4">Add to your Claude Code / Cursor / Windsurf / Cline MCP config:</p>
      <pre class="bg-gray-950 rounded-xl p-4 text-sm text-cyan-300 overflow-x-auto border border-cyan-900/30">{
  "mcpServers": {
    "data-transform": {
      "url": "https://data-transform-mcp.yagami8095.workers.dev/mcp",
      "type": "http"
    }
  }
}</pre>
      <p class="text-gray-600 text-xs mt-3">MCP Protocol: 2025-03-26 &nbsp;|&nbsp; Streamable HTTP &nbsp;|&nbsp; JSON-RPC 2.0 &nbsp;|&nbsp; Batch support</p>
    </div>

    <!-- Tools -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">6 Free Tools</h2>
      <ul class="divide-y divide-cyan-900/30">
        ${toolsHtml}
      </ul>
    </div>

    <!-- Usage Examples -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">Example Tool Calls</h2>
      <div class="space-y-4">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">csv_to_json — Parse CSV with quoted fields</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "csv_to_json",
    "arguments": {
      "csv": "name,city,age\\n\\"Alice\\",\\"New York\\",30\\nBob,\\"San Francisco, CA\\",25"
    }
  }
}</pre>
        </div>
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">yaml_to_json — Nested YAML with lists</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "yaml_to_json",
    "arguments": {
      "yaml": "server:\\n  host: localhost\\n  port: 8080\\n  features:\\n    - auth\\n    - logging"
    }
  }
}</pre>
        </div>
      </div>
    </div>

    <!-- Rate Limits -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-3 text-white">Rate Limits</h2>
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-cyan-400">${RATE_LIMIT_MAX}</div>
          <div class="text-gray-400 mt-1">free calls / day</div>
          <div class="text-gray-600 text-xs mt-1">per IP, resets midnight UTC</div>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-orange-400">${PRO_RATE_LIMIT}</div>
          <div class="text-gray-400 mt-1">Pro calls / day</div>
          <div class="text-gray-600 text-xs mt-1">with Pro API key</div>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-teal-400">6</div>
          <div class="text-gray-400 mt-1">tools available</div>
          <div class="text-gray-600 text-xs mt-1">all free, no API key required</div>
        </div>
      </div>
    </div>

    <!-- Ecosystem -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">OpenClaw MCP Ecosystem</h2>
      <ul class="divide-y divide-cyan-900/30">
        ${ecosystemHtml}
      </ul>
      <div class="mt-4 pt-4 border-t border-cyan-900/30">
        <a href="${ECOSYSTEM.store}" class="text-orange-400 hover:underline text-sm font-medium">OpenClaw Store</a>
        <span class="text-gray-500 text-sm ml-2">— AI tools, prompts, and intelligence products</span>
      </div>
    </div>

    <!-- Health -->
    <div class="text-center">
      <a href="/health" class="text-gray-600 hover:text-cyan-400 text-sm transition-colors">Health Check /health</a>
      <span class="text-gray-800 mx-2">|</span>
      <a href="/mcp" class="text-gray-600 hover:text-cyan-400 text-sm transition-colors">MCP Endpoint /mcp</a>
    </div>

  </main>

  <footer class="border-t border-gray-900 mt-12 py-6 text-center text-gray-700 text-sm">
    Data Transform MCP v1.0.0 &nbsp;&bull;&nbsp; Powered by <span class="text-cyan-800">OpenClaw Intelligence</span> &nbsp;&bull;&nbsp; Cloudflare Workers
  </footer>

</body>
</html>`;
}

// ============================================================
// CORS Headers
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, X-Forwarded-For',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, X-RateLimit-Remaining, X-RateLimit-Limit',
};

function corsResponse(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, ...extra },
  });
}

function jsonResponse(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...extra },
  });
}

// ============================================================
// Edge Defense Layer — Anti-Freeloader + Honeypot + Fingerprint
// ============================================================

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];
const PAYLOAD_MAX_BYTES = 51200; // 50KB

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getRequestFingerprint(request) {
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const ct = request.headers.get('Content-Type') || '';
  const isSuspicious = (/^(curl|wget|python|httpie|go-http|java)/i.test(ua) && lang.length > 5);
  return { ua: ua.slice(0, 80), lang: lang.slice(0, 20), isSuspicious };
}

async function edgeDefense(request, env, serverPrefix) {
  const kv = env.KV;
  if (!kv) return { action: 'allow' };

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Short(ip + '-openclaw-defense');
  const today = new Date().toISOString().slice(0, 10);
  const defenseKey = `defense:${ipHash}:${today}`;
  const path = new URL(request.url).pathname;

  // 1. Honeypot check
  if (HONEYPOT_PATHS.includes(path.toLowerCase())) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch { /* non-fatal */ }
    return { action: 'honeypot', status: 404 };
  }

  // 2. Payload size check
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > PAYLOAD_MAX_BYTES) {
    return { action: 'reject', reason: 'Payload too large', status: 413 };
  }

  // 3. Check IP reputation
  try {
    const raw = await kv.get(defenseKey, { type: 'json' });
    if (raw && raw.score < 10) {
      return { action: 'block', reason: 'IP blocked due to suspicious activity', status: 403 };
    }
    if (raw && raw.score < 30) {
      return { action: 'throttle', delay: 200 };
    }
  } catch { /* KV failure — allow */ }

  // 4. Fingerprint anomaly
  const fp = getRequestFingerprint(request);
  if (fp.isSuspicious) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      if (!raw.flags.includes('suspicious-fp')) {
        raw.score = Math.max(0, raw.score - 10);
        raw.flags.push('suspicious-fp');
        await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
      }
    } catch { /* non-fatal */ }
  }

  return { action: 'allow' };
}

function sanitizeInput(str, maxLen = 2000) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.slice(0, maxLen).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
}

// ============================================================
// FinOps Circuit Breaker — Track daily usage, auto-degrade
// ============================================================

const FINOPS_DAILY_WARN = 50000;
const FINOPS_DAILY_SLOW = 80000;
const FINOPS_DAILY_STOP = 95000;

async function finopsTrack(env, serverName) {
  const kv = env.KV;
  if (!kv) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `finops:${today}`;
  try {
    const raw = await kv.get(key, { type: 'json' }) || { total: 0, by: {} };
    raw.total++;
    raw.by[serverName] = (raw.by[serverName] || 0) + 1;
    kv.put(key, JSON.stringify(raw), { expirationTtl: 172800 });
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow.', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// Attribution Tracking — ?ref= parameter
async function trackRef(request, env, serverName) {
  const kv = env.KV;
  if (!kv) return;
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) return;
  const source = ref.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!source) return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `ref:${source}:${serverName}:${today}`;
  try {
    const count = parseInt(await kv.get(key) || '0', 10);
    await kv.put(key, String(count + 1), { expirationTtl: 2592000 });
  } catch {}
}

// ============================================================
// Main Worker Export
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Preflight
    if (method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Edge Defense Layer
    const defense = await edgeDefense(request, env, 'dtx');
    if (defense.action === 'honeypot') {
      return new Response('Not Found', { status: 404 });
    }
    if (defense.action === 'reject' || defense.action === 'block') {
      return jsonResponse({ error: defense.reason }, defense.status);
    }
    if (defense.action === 'throttle' && defense.delay) {
      await new Promise(r => setTimeout(r, defense.delay));
    }

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'data-transform');
    if (!finops.ok) return jsonResponse({ error: finops.reason, retryAfter: 'tomorrow' }, finops.status);
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));

    // Attribution Tracking
    await trackRef(request, env, 'data-transform');

    // Landing page
    if ((path === '/' || path === '/index.html') && method === 'GET') {
      return new Response(buildLandingHtml(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // llms.txt for AI discoverability
    if (path === '/llms.txt' || path === '/.well-known/llms.txt') {
      const t = [
        "# OpenClaw MCP Servers",
        "> 10 free remote MCP servers with 55+ tools for AI agents.",
        "",
        "## Servers",
        "- Data Transform: https://data-transform-mcp.yagami8095.workers.dev/mcp",
        "- JSON Toolkit: https://json-toolkit-mcp.yagami8095.workers.dev/mcp",
        "- Regex Engine: https://regex-engine-mcp.yagami8095.workers.dev/mcp",
        "- Color Palette: https://color-palette-mcp.yagami8095.workers.dev/mcp",
        "- Timestamp Converter: https://timestamp-converter-mcp.yagami8095.workers.dev/mcp",
        "- Prompt Enhancer: https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp",
        "- OpenClaw Intel: https://openclaw-intel-mcp.yagami8095.workers.dev/mcp",
        "- Fortune: https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp",
        "- MoltBook Publisher: https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp",
        "- AgentForge Compare: https://agentforge-compare-mcp.yagami8095.workers.dev/mcp",
        "",
        "## Quick Start",
        'Add to MCP config: {"url": "https://data-transform-mcp.yagami8095.workers.dev/mcp"}',
        "",
        "## Pro: 9 USD, 1000 calls/day all servers",
        "https://product-store.yagami8095.workers.dev/products/ecosystem-pro",
      ];
      return new Response(t.join("\n"), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Health check
    if (path === '/health' && method === 'GET') {
      return jsonResponse({
        status: 'ok',
        server: SERVER_INFO.name,
        version: SERVER_INFO.version,
        vendor: VENDOR,
        protocol: MCP_PROTOCOL_VERSION,
        tools: TOOLS.map(t => t.name),
        rate_limit: { free_per_day: RATE_LIMIT_MAX, pro_per_day: PRO_RATE_LIMIT },
        timestamp: new Date().toISOString(),
      });
    }

    // MCP endpoint — GET returns server info
    if (path === '/mcp' && method === 'GET') {
      return jsonResponse({
        server: SERVER_INFO,
        vendor: VENDOR,
        protocol: MCP_PROTOCOL_VERSION,
        endpoint: '/mcp',
        method: 'POST',
        content_type: 'application/json',
        tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
        ecosystem: ECOSYSTEM,
      });
    }

    // MCP endpoint — POST handles JSON-RPC
    if (path === '/mcp' && method === 'POST') {
      const contentType = request.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) {
        return jsonResponse(
          jsonRpcError(null, -32700, 'Content-Type must be application/json'),
          400
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(jsonRpcError(null, -32700, 'Parse error: invalid JSON body'), 400);
      }

      // Get client IP for rate limiting
      const clientIp =
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
        'unknown';

      // Pro API Key validation
      const apiKey = request.headers.get('X-API-Key');
      const kv = env?.KV ?? null;
      let _proKeyInfo = null;
      if (apiKey && kv) {
        _proKeyInfo = await validateProKey(kv, apiKey);
      }

      const response = await handleMcpRequest(body, kv, clientIp, _proKeyInfo, apiKey);

      if (response === null) {
        return corsResponse('', 204);
      }

      // x402: Detect rate limit -> HTTP 402 with payment headers
      const first = Array.isArray(response) ? response[0] : response;
      const isRateLimited = first?.error?.code === -32029;
      const httpStatus = isRateLimited ? 402 : 200;
      const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
      if (isRateLimited) {
        headers['X-Payment-Required'] = 'true';
        headers['X-Payment-Network'] = 'base';
        headers['X-Payment-Currency'] = 'USDC';
        headers['X-Payment-Amount'] = '0.05';
        headers['X-Payment-Address'] = '0x72aa56DAe3819c75C545c57778cc404092d60731';
      }

      return new Response(JSON.stringify(response), { status: httpStatus, headers });
    }

    // MCP endpoint — DELETE (session termination, MCP spec)
    if (path === '/mcp' && method === 'DELETE') {
      return corsResponse('', 204);
    }

    // 404
    return jsonResponse(
      { error: 'Not found', hint: 'MCP endpoint: POST /mcp | Server info: GET /mcp | Health: GET /health' },
      404
    );
  },
};
