/**
 * Markdown Converter MCP Server
 * Convert between Markdown, HTML, plain text, and other formats.
 *
 * Tools (6 free tools, 15 req/day per IP via KV rate limiting):
 *   1. markdown_to_html    — Convert Markdown to clean HTML with syntax highlighting
 *   2. html_to_markdown    — Convert HTML back to Markdown (handles tables, lists, code)
 *   3. markdown_lint       — Lint Markdown for style issues, broken links, accessibility
 *   4. markdown_toc        — Generate table of contents from headings
 *   5. markdown_format     — Prettify/standardize Markdown formatting
 *   6. markdown_slides     — Convert Markdown to slide deck format (Marp-compatible)
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'markdown-converter', version: '1.0.0' };
const VENDOR = 'OpenClaw Intelligence';
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

const RATE_LIMIT_MAX = 15;           // requests per day
const RATE_LIMIT_WINDOW = 86400;     // 24 hours in seconds

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
  markdown:     'https://markdown-converter-mcp.yagami8095.workers.dev/mcp',
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

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `rl:markdown:${ip}:${today}`;

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
// Tool: markdown_to_html — Full Markdown parser
// ============================================================

function markdownToHtml(markdown, options = {}) {
  if (!markdown || typeof markdown !== 'string') {
    return { error: 'markdown parameter is required and must be a string' };
  }

  const syntaxHighlight = options.syntax_highlight !== false;
  const wrapHtml = options.full_document || false;

  let html = parseMarkdown(markdown, syntaxHighlight);

  if (wrapHtml) {
    html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; }\n    pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }\n    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }\n    pre code { background: none; padding: 0; }\n    blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1rem; color: #666; }\n    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }\n    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }\n    th { background: #f4f4f4; }\n    img { max-width: 100%; height: auto; }\n    hr { border: none; border-top: 2px solid #eee; margin: 2rem 0; }\n  </style>\n</head>\n<body>\n${html}\n</body>\n</html>`;
  }

  return {
    html,
    char_count: html.length,
    full_document: wrapHtml,
    syntax_highlight: syntaxHighlight,
    ecosystem: ECOSYSTEM,
  };
}

function parseMarkdown(md, syntaxHighlight) {
  const lines = md.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks (``` or ~~~)
    const fenceMatch = line.match(/^(`{3,}|~{3,})\s*(\w*)\s*$/);
    if (fenceMatch) {
      const fence = fenceMatch[1][0];
      const fenceLen = fenceMatch[1].length;
      const lang = fenceMatch[2] || '';
      const codeLines = [];
      i++;
      while (i < lines.length) {
        const closeFence = lines[i].match(new RegExp(`^${fence === '`' ? '`' : '~'}{${fenceLen},}\\s*$`));
        if (closeFence) { i++; break; }
        codeLines.push(lines[i]);
        i++;
      }
      const escaped = escapeHtml(codeLines.join('\n'));
      const langAttr = lang ? ` class="language-${lang}"` : '';
      const highlighted = syntaxHighlight && lang ? applySyntaxHighlight(escaped, lang) : escaped;
      result.push(`<pre><code${langAttr}>${highlighted}</code></pre>`);
      continue;
    }

    // Horizontal rules
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      result.push('<hr>');
      i++;
      continue;
    }

    // Headings (ATX)
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = parseInline(headingMatch[2]);
      const id = headingMatch[2].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      result.push(`<h${level} id="${id}">${text}</h${level}>`);
      i++;
      continue;
    }

    // Blockquotes
    if (line.match(/^>\s?/)) {
      const quoteLines = [];
      while (i < lines.length && (lines[i].match(/^>\s?/) || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].match(/^#|^```|^---/)))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const inner = parseMarkdown(quoteLines.join('\n'), syntaxHighlight);
      result.push(`<blockquote>\n${inner}\n</blockquote>`);
      continue;
    }

    // Tables
    if (i + 1 < lines.length && lines[i + 1] && lines[i + 1].match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/)) {
      const tableResult = parseTable(lines, i);
      if (tableResult) {
        result.push(tableResult.html);
        i = tableResult.nextIndex;
        continue;
      }
    }

    // Unordered lists
    if (line.match(/^(\s*)([-*+])\s+/)) {
      const listResult = parseList(lines, i, 'ul');
      result.push(listResult.html);
      i = listResult.nextIndex;
      continue;
    }

    // Ordered lists
    if (line.match(/^(\s*)\d+[.)]\s+/)) {
      const listResult = parseList(lines, i, 'ol');
      result.push(listResult.html);
      i = listResult.nextIndex;
      continue;
    }

    // Task lists (checkbox) — treat as unordered list
    if (line.match(/^(\s*)[-*+]\s+\[[ xX]\]\s+/)) {
      const listResult = parseList(lines, i, 'ul');
      result.push(listResult.html);
      i = listResult.nextIndex;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect contiguous non-empty lines that aren't other block elements
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' &&
           !lines[i].match(/^#{1,6}\s/) &&
           !lines[i].match(/^(`{3,}|~{3,})/) &&
           !lines[i].match(/^>\s?/) &&
           !lines[i].match(/^(\s*)([-*+])\s+/) &&
           !lines[i].match(/^(\s*)\d+[.)]\s+/) &&
           !lines[i].match(/^(\*{3,}|-{3,}|_{3,})\s*$/)) {
      // Setext heading check
      if (i + 1 < lines.length && lines[i + 1] && lines[i + 1].match(/^(={3,}|-{3,})\s*$/) && paraLines.length === 0) {
        const level = lines[i + 1].trim()[0] === '=' ? 1 : 2;
        const text = parseInline(lines[i]);
        const id = lines[i].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        result.push(`<h${level} id="${id}">${text}</h${level}>`);
        i += 2;
        break;
      }
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      result.push(`<p>${parseInline(paraLines.join('\n'))}</p>`);
    }
  }

  return result.join('\n');
}

function parseTable(lines, startIndex) {
  let i = startIndex;
  const headerLine = lines[i].trim();
  const separatorLine = lines[i + 1].trim();

  // Parse alignment from separator
  const sepCells = separatorLine.split('|').filter(c => c.trim() !== '');
  const alignments = sepCells.map(cell => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
    if (trimmed.endsWith(':')) return 'right';
    return 'left';
  });

  // Parse header cells
  const headerCells = splitTableRow(headerLine);
  if (headerCells.length === 0) return null;

  let html = '<table>\n<thead>\n<tr>\n';
  headerCells.forEach((cell, idx) => {
    const align = alignments[idx] || 'left';
    html += `  <th style="text-align: ${align}">${parseInline(cell.trim())}</th>\n`;
  });
  html += '</tr>\n</thead>\n<tbody>\n';

  i += 2; // skip header and separator

  while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
    const cells = splitTableRow(lines[i]);
    html += '<tr>\n';
    cells.forEach((cell, idx) => {
      const align = alignments[idx] || 'left';
      html += `  <td style="text-align: ${align}">${parseInline(cell.trim())}</td>\n`;
    });
    // Fill remaining columns if row is shorter
    for (let j = cells.length; j < headerCells.length; j++) {
      html += `  <td></td>\n`;
    }
    html += '</tr>\n';
    i++;
  }

  html += '</tbody>\n</table>';
  return { html, nextIndex: i };
}

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|');
}

function parseList(lines, startIndex, type) {
  const items = [];
  let i = startIndex;
  const listPattern = type === 'ul' ? /^(\s*)([-*+])\s+(.*)$/ : /^(\s*)\d+[.)]\s+(.*)$/;
  const baseIndent = (lines[i].match(/^(\s*)/)[1] || '').length;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(listPattern);

    if (match) {
      const indent = (match[1] || '').length;
      if (indent < baseIndent) break;
      if (indent > baseIndent) {
        // Nested list — parse recursively
        const nestedResult = parseList(lines, i, line.match(/^\s*\d+[.)]\s+/) ? 'ol' : 'ul');
        if (items.length > 0) {
          items[items.length - 1].nested = nestedResult.html;
        }
        i = nestedResult.nextIndex;
        continue;
      }
      const text = type === 'ul' ? match[3] : match[2];
      // Check for task list
      const taskMatch = text.match(/^\[( |x|X)\]\s+(.*)/);
      if (taskMatch) {
        const checked = taskMatch[1] !== ' ';
        items.push({ text: taskMatch[2], checked, nested: '' });
      } else {
        items.push({ text, nested: '' });
      }
      i++;
    } else if (line.trim() === '') {
      i++;
      // Check if next line is still part of this list
      if (i < lines.length && lines[i].match(listPattern)) {
        const nextIndent = (lines[i].match(/^(\s*)/)[1] || '').length;
        if (nextIndent >= baseIndent) continue;
      }
      break;
    } else {
      // Continuation of previous item or break
      const indent = (line.match(/^(\s*)/)[1] || '').length;
      if (indent > baseIndent && items.length > 0) {
        items[items.length - 1].text += '\n' + line.trim();
        i++;
      } else {
        break;
      }
    }
  }

  let html = `<${type}>\n`;
  for (const item of items) {
    if ('checked' in item) {
      const checkbox = item.checked
        ? '<input type="checkbox" checked disabled> '
        : '<input type="checkbox" disabled> ';
      html += `  <li>${checkbox}${parseInline(item.text)}${item.nested ? '\n' + item.nested : ''}</li>\n`;
    } else {
      html += `  <li>${parseInline(item.text)}${item.nested ? '\n' + item.nested : ''}</li>\n`;
    }
  }
  html += `</${type}>`;
  return { html, nextIndex: i };
}

function parseInline(text) {
  if (!text) return '';

  // Images (before links so ![...](...) isn't caught as link)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr}>`;
  });

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g, (_, linkText, href, title) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a href="${escapeHtml(href)}"${titleAttr}>${linkText}</a>`;
  });

  // Autolinks
  text = text.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1">$1</a>');
  text = text.replace(/<([^>]+@[^>]+\.[^>]+)>/g, '<a href="mailto:$1">$1</a>');

  // Inline code (backticks) — process before bold/italic to avoid conflicts
  text = text.replace(/``(.+?)``/g, (_, code) => `<code>${escapeHtml(code)}</code>`);
  text = text.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);

  // Bold + italic (***text*** or ___text___)
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

  // Bold (**text** or __text__)
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');

  // Strikethrough (~~text~~)
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Line breaks (two trailing spaces or backslash)
  text = text.replace(/  \n/g, '<br>\n');
  text = text.replace(/\\\n/g, '<br>\n');

  return text;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function applySyntaxHighlight(code, lang) {
  // Basic keyword highlighting for common languages
  const keywords = {
    javascript: ['const','let','var','function','return','if','else','for','while','class','import','export','default','from','async','await','new','this','try','catch','throw','switch','case','break','continue','typeof','instanceof','in','of','null','undefined','true','false'],
    typescript: ['const','let','var','function','return','if','else','for','while','class','import','export','default','from','async','await','new','this','try','catch','throw','switch','case','break','continue','typeof','instanceof','in','of','null','undefined','true','false','interface','type','enum','implements','extends','public','private','protected','readonly','abstract','as','is','keyof','never','void','any','unknown','declare','namespace','module'],
    python: ['def','class','return','if','elif','else','for','while','import','from','as','try','except','finally','raise','with','yield','lambda','pass','break','continue','and','or','not','in','is','True','False','None','self','async','await','print','global','nonlocal'],
    java: ['public','private','protected','class','interface','extends','implements','return','if','else','for','while','new','this','try','catch','throw','throws','finally','static','final','abstract','void','int','String','boolean','long','double','float','char','null','true','false','import','package','super','switch','case','break','continue','instanceof'],
    rust: ['fn','let','mut','const','if','else','for','while','loop','match','return','use','mod','pub','struct','enum','impl','trait','self','Self','async','await','move','ref','where','type','true','false','Some','None','Ok','Err','Box','Vec','String','Option','Result'],
    go: ['func','var','const','if','else','for','range','return','type','struct','interface','package','import','defer','go','chan','select','case','default','break','continue','map','nil','true','false','make','append','len','cap','string','int','bool','error'],
    html: ['html','head','body','div','span','p','a','img','table','tr','td','th','ul','ol','li','h1','h2','h3','h4','h5','h6','form','input','button','script','style','link','meta','title','section','article','nav','header','footer','main'],
    css: ['color','background','margin','padding','border','font','display','position','width','height','flex','grid','align','justify','text','overflow','opacity','transition','transform','animation','z-index','box-shadow','cursor','float','clear','content'],
    sql: ['SELECT','FROM','WHERE','INSERT','UPDATE','DELETE','CREATE','ALTER','DROP','TABLE','INDEX','JOIN','LEFT','RIGHT','INNER','OUTER','ON','AND','OR','NOT','IN','BETWEEN','LIKE','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','AS','DISTINCT','COUNT','SUM','AVG','MAX','MIN','NULL','IS','SET','INTO','VALUES'],
    bash: ['echo','if','then','else','fi','for','while','do','done','case','esac','function','return','exit','export','source','cd','ls','grep','sed','awk','cat','chmod','chown','mkdir','rm','cp','mv','find','xargs','pipe','sudo','apt','brew','npm','yarn','git'],
    json: [],
  };

  const langKeys = keywords[lang.toLowerCase()] || keywords[lang] || [];
  if (langKeys.length === 0) return code;

  // Highlight strings first (to avoid keyword matching inside strings)
  let highlighted = code;

  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#ae81ff">$1</span>');

  // Highlight keywords
  for (const kw of langKeys) {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span style="color:#f92672">$1</span>');
  }

  // Highlight single-line comments
  highlighted = highlighted.replace(/(\/\/.*?)$/gm, '<span style="color:#75715e">$1</span>');
  highlighted = highlighted.replace(/(#[^&].*?)$/gm, '<span style="color:#75715e">$1</span>');

  return highlighted;
}

// ============================================================
// Tool: html_to_markdown — Reverse conversion
// ============================================================

function htmlToMarkdown(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return { error: 'html parameter is required and must be a string' };
  }

  const preserveLinks = options.preserve_links !== false;
  const preserveImages = options.preserve_images !== false;

  let md = convertHtmlToMarkdown(html, preserveLinks, preserveImages);

  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return {
    markdown: md,
    char_count: md.length,
    ecosystem: ECOSYSTEM,
  };
}

function convertHtmlToMarkdown(html, preserveLinks, preserveImages) {
  let md = html;

  // Remove full document wrapper if present
  md = md.replace(/<!DOCTYPE[^>]*>/gi, '');
  md = md.replace(/<html[^>]*>/gi, '');
  md = md.replace(/<\/html>/gi, '');
  md = md.replace(/<head>[\s\S]*?<\/head>/gi, '');
  md = md.replace(/<body[^>]*>/gi, '');
  md = md.replace(/<\/body>/gi, '');

  // Pre/code blocks — extract before other processing
  md = md.replace(/<pre[^>]*><code(?:\s+class="language-(\w+)")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, lang, code) => {
    const unescaped = unescapeHtml(code);
    return `\n\`\`\`${lang || ''}\n${unescaped}\n\`\`\`\n`;
  });
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    return `\n\`\`\`\n${unescapeHtml(code)}\n\`\`\`\n`;
  });

  // Inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => `\`${unescapeHtml(code)}\``);

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n# ${stripTags(text).trim()}\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n## ${stripTags(text).trim()}\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n### ${stripTags(text).trim()}\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `\n#### ${stripTags(text).trim()}\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, text) => `\n##### ${stripTags(text).trim()}\n`);
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, text) => `\n###### ${stripTags(text).trim()}\n`);

  // Bold
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');

  // Italic
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // Strikethrough
  md = md.replace(/<(del|s|strike)[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~');

  // Images (before links)
  if (preserveImages) {
    md = md.replace(/<img[^>]*\bsrc="([^"]*)"[^>]*\balt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
    md = md.replace(/<img[^>]*\balt="([^"]*)"[^>]*\bsrc="([^"]*)"[^>]*\/?>/gi, '![$1]($2)');
    md = md.replace(/<img[^>]*\bsrc="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  } else {
    md = md.replace(/<img[^>]*\/?>/gi, '');
  }

  // Links
  if (preserveLinks) {
    md = md.replace(/<a[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  } else {
    md = md.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  }

  // Horizontal rules
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const inner = convertHtmlToMarkdown(content, preserveLinks, preserveImages).trim();
    return '\n' + inner.split('\n').map(l => `> ${l}`).join('\n') + '\n';
  });

  // Tables
  md = convertTableToMarkdown(md);

  // Lists
  md = convertListToMarkdown(md);

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '  \n');

  // Divs and spans — just extract content
  md = md.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');
  md = md.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

  // Remove remaining HTML tags
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<[^>]+>/g, '');

  // Unescape HTML entities
  md = unescapeHtml(md);

  return md;
}

function convertTableToMarkdown(html) {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows = [];
    const headerMatch = tableContent.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    const bodyMatch = tableContent.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);

    const parseRows = (content) => {
      const rowMatches = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      return rowMatches.map(row => {
        const cells = [];
        const cellPattern = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
        let cellMatch;
        while ((cellMatch = cellPattern.exec(row)) !== null) {
          cells.push(stripTags(cellMatch[2]).trim());
        }
        return cells;
      });
    };

    if (headerMatch) {
      const headerRows = parseRows(headerMatch[1]);
      if (headerRows.length > 0) {
        rows.push(headerRows[0]);
        rows.push(headerRows[0].map(() => '---'));
      }
    }

    const bodyContent = bodyMatch ? bodyMatch[1] : tableContent;
    const bodyRows = parseRows(bodyContent);

    // If no header was found, use first row as header
    if (rows.length === 0 && bodyRows.length > 0) {
      rows.push(bodyRows.shift());
      rows.push(rows[0].map(() => '---'));
    }

    rows.push(...bodyRows);

    if (rows.length === 0) return '';
    return '\n' + rows.map(row => `| ${row.join(' | ')} |`).join('\n') + '\n';
  });
}

function convertListToMarkdown(html) {
  function processLists(content, depth = 0) {
    const indent = '  '.repeat(depth);

    // Ordered lists
    content = content.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, listContent) => {
      let idx = 0;
      const items = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, itemContent) => {
        idx++;
        const inner = processLists(itemContent, depth + 1);
        return `${indent}${idx}. ${stripTags(inner).trim()}\n`;
      });
      return '\n' + items;
    });

    // Unordered lists
    content = content.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, listContent) => {
      const items = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, itemContent) => {
        // Check for checkbox (task list)
        const checkedMatch = itemContent.match(/<input[^>]*type="checkbox"[^>]*checked[^>]*>/i);
        const uncheckedMatch = itemContent.match(/<input[^>]*type="checkbox"[^>]*/i);
        let prefix = `${indent}- `;
        if (checkedMatch) prefix = `${indent}- [x] `;
        else if (uncheckedMatch) prefix = `${indent}- [ ] `;

        const cleanedContent = itemContent.replace(/<input[^>]*>/gi, '');
        const inner = processLists(cleanedContent, depth + 1);
        return `${prefix}${stripTags(inner).trim()}\n`;
      });
      return '\n' + items;
    });

    return content;
  }

  return processLists(html);
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

function unescapeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// ============================================================
// Tool: markdown_lint — Lint Markdown for style issues
// ============================================================

function markdownLint(markdown, options = {}) {
  if (!markdown || typeof markdown !== 'string') {
    return { error: 'markdown parameter is required and must be a string' };
  }

  const issues = [];
  const lines = markdown.split('\n');
  const checkLinks = options.check_links !== false;
  const checkAccessibility = options.check_accessibility !== false;

  // Rule: MD001 — Heading levels should increment by one
  let lastHeadingLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s/);
    if (match) {
      const level = match[1].length;
      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        issues.push({
          line: i + 1,
          rule: 'MD001',
          severity: 'warning',
          message: `Heading level jumped from h${lastHeadingLevel} to h${level}. Headings should increment by one level.`,
        });
      }
      lastHeadingLevel = level;
    }
  }

  // Rule: MD003 — Consistent heading style
  const atxHeadings = lines.filter(l => l.match(/^#{1,6}\s/));
  const setextHeadings = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].match(/^(={3,}|-{3,})\s*$/) && lines[i - 1].trim() !== '') {
      setextHeadings.push(i);
    }
  }
  if (atxHeadings.length > 0 && setextHeadings.length > 0) {
    issues.push({
      line: setextHeadings[0] + 1,
      rule: 'MD003',
      severity: 'warning',
      message: 'Mixed heading styles detected. Use either ATX (# Heading) or Setext (underline) consistently.',
    });
  }

  // Rule: MD009 — Trailing spaces
  for (let i = 0; i < lines.length; i++) {
    const trailing = lines[i].match(/( +)$/);
    if (trailing && trailing[1].length !== 2) { // 2 spaces = intentional line break
      issues.push({
        line: i + 1,
        rule: 'MD009',
        severity: 'info',
        message: `Trailing spaces detected (${trailing[1].length} spaces). Use 2 spaces for line break or remove.`,
      });
    }
  }

  // Rule: MD010 — Hard tabs
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('\t')) {
      issues.push({
        line: i + 1,
        rule: 'MD010',
        severity: 'warning',
        message: 'Hard tab character found. Use spaces instead of tabs for indentation.',
      });
    }
  }

  // Rule: MD012 — Multiple consecutive blank lines
  let blankCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      blankCount++;
      if (blankCount > 1) {
        issues.push({
          line: i + 1,
          rule: 'MD012',
          severity: 'info',
          message: 'Multiple consecutive blank lines. Use a single blank line between blocks.',
        });
      }
    } else {
      blankCount = 0;
    }
  }

  // Rule: MD018 — No space after hash on ATX heading
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#{1,6}[^ #\n]/)) {
      issues.push({
        line: i + 1,
        rule: 'MD018',
        severity: 'error',
        message: 'No space after heading hash. Add a space: "# Heading" not "#Heading".',
      });
    }
  }

  // Rule: MD022 — Headings should be surrounded by blank lines
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#{1,6}\s/)) {
      if (i > 0 && lines[i - 1].trim() !== '') {
        issues.push({
          line: i + 1,
          rule: 'MD022',
          severity: 'info',
          message: 'Heading should have a blank line before it.',
        });
      }
      if (i < lines.length - 1 && lines[i + 1].trim() !== '') {
        issues.push({
          line: i + 1,
          rule: 'MD022',
          severity: 'info',
          message: 'Heading should have a blank line after it.',
        });
      }
    }
  }

  // Rule: MD023 — Headings must start at the beginning of the line
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s+#{1,6}\s/)) {
      issues.push({
        line: i + 1,
        rule: 'MD023',
        severity: 'warning',
        message: 'Heading is indented. Headings should start at the beginning of the line.',
      });
    }
  }

  // Rule: MD032 — Lists should be surrounded by blank lines
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s*[-*+]\s+/) || lines[i].match(/^\s*\d+[.)]\s+/)) {
      if (i > 0 && lines[i - 1].trim() !== '' && !lines[i - 1].match(/^\s*[-*+]\s+/) && !lines[i - 1].match(/^\s*\d+[.)]\s+/)) {
        issues.push({
          line: i + 1,
          rule: 'MD032',
          severity: 'info',
          message: 'List should have a blank line before it.',
        });
      }
    }
  }

  // Rule: MD034 — Bare URLs
  for (let i = 0; i < lines.length; i++) {
    // Skip code blocks
    if (lines[i].match(/^```/) || lines[i].match(/^~~~/) || lines[i].match(/^\s{4}/)) continue;
    const bareUrl = lines[i].match(/(?<!\(|<|\[)https?:\/\/[^\s)>\]]+(?!\))/g);
    if (bareUrl) {
      for (const url of bareUrl) {
        // Make sure it's not already in a link/image
        const lineCheck = lines[i];
        if (!lineCheck.includes(`(${url})`) && !lineCheck.includes(`<${url}>`)) {
          issues.push({
            line: i + 1,
            rule: 'MD034',
            severity: 'info',
            message: `Bare URL found: "${url.slice(0, 60)}". Wrap in angle brackets <URL> or [text](URL).`,
          });
        }
      }
    }
  }

  // Rule: MD037 — Spaces inside emphasis markers
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/\*\s+.*?\s+\*/) && !lines[i].match(/\*\*/)) {
      issues.push({
        line: i + 1,
        rule: 'MD037',
        severity: 'warning',
        message: 'Spaces inside emphasis markers. Use "*text*" not "* text *".',
      });
    }
  }

  // Rule: MD041 — First line should be a top-level heading
  const firstNonEmpty = lines.findIndex(l => l.trim() !== '');
  if (firstNonEmpty >= 0 && !lines[firstNonEmpty].match(/^#\s/)) {
    issues.push({
      line: firstNonEmpty + 1,
      rule: 'MD041',
      severity: 'info',
      message: 'First line should be a top-level heading (# Title).',
    });
  }

  // Check links (broken link patterns)
  if (checkLinks) {
    for (let i = 0; i < lines.length; i++) {
      // Empty link targets
      const emptyLinks = lines[i].match(/\[([^\]]+)\]\(\s*\)/g);
      if (emptyLinks) {
        issues.push({
          line: i + 1,
          rule: 'LINK001',
          severity: 'error',
          message: 'Empty link target found. Add a URL to the link.',
        });
      }
      // Broken reference links [text][ref] without definition
      const refLinks = lines[i].match(/\[([^\]]+)\]\[([^\]]*)\]/g);
      if (refLinks) {
        for (const ref of refLinks) {
          const refMatch = ref.match(/\[([^\]]+)\]\[([^\]]*)\]/);
          if (refMatch) {
            const refId = refMatch[2] || refMatch[1];
            const defPattern = new RegExp(`^\\[${refId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]:\\s`, 'im');
            if (!defPattern.test(markdown)) {
              issues.push({
                line: i + 1,
                rule: 'LINK002',
                severity: 'error',
                message: `Broken reference link: [${refId}] has no definition.`,
              });
            }
          }
        }
      }
    }
  }

  // Accessibility checks
  if (checkAccessibility) {
    for (let i = 0; i < lines.length; i++) {
      // Images without alt text
      if (lines[i].match(/!\[\]\(/)) {
        issues.push({
          line: i + 1,
          rule: 'A11Y001',
          severity: 'warning',
          message: 'Image without alt text. Add descriptive alt text for accessibility: ![description](url).',
        });
      }
      // Links with "click here" or "here" text
      if (lines[i].match(/\[(click here|here|link|this)\]\(/i)) {
        issues.push({
          line: i + 1,
          rule: 'A11Y002',
          severity: 'warning',
          message: 'Non-descriptive link text ("click here", "here"). Use meaningful link text that describes the destination.',
        });
      }
    }
  }

  // Check line length (120 chars)
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^```/) || lines[i].match(/^~~~/)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (!inCodeBlock && lines[i].length > 120) {
      // Skip table rows and URLs
      if (!lines[i].includes('|') && !lines[i].match(/https?:\/\//)) {
        issues.push({
          line: i + 1,
          rule: 'MD013',
          severity: 'info',
          message: `Line length is ${lines[i].length} characters. Consider wrapping at 120 characters.`,
        });
      }
    }
  }

  const summary = {
    total_issues: issues.length,
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    lines_checked: lines.length,
  };

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    summary,
    issues: issues.slice(0, 50), // Cap at 50 issues
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// Tool: markdown_toc — Generate table of contents
// ============================================================

function markdownToc(markdown, options = {}) {
  if (!markdown || typeof markdown !== 'string') {
    return { error: 'markdown parameter is required and must be a string' };
  }

  const maxDepth = options.max_depth || 6;
  const minDepth = options.min_depth || 1;
  const ordered = options.ordered || false;
  const includeLinks = options.links !== false;

  const lines = markdown.split('\n');
  const headings = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track code blocks
    if (line.match(/^(`{3,}|~{3,})/)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // ATX headings
    const atxMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/);
    if (atxMatch) {
      const level = atxMatch[1].length;
      if (level >= minDepth && level <= maxDepth) {
        const text = atxMatch[2].replace(/\*\*|__|~~|`/g, ''); // Strip inline formatting
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ level, text, id, line: i + 1 });
      }
    }

    // Setext headings
    if (i + 1 < lines.length && lines[i + 1] && lines[i + 1].match(/^(={3,}|-{3,})\s*$/)) {
      const level = lines[i + 1].trim()[0] === '=' ? 1 : 2;
      if (level >= minDepth && level <= maxDepth) {
        const text = line.trim().replace(/\*\*|__|~~|`/g, '');
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ level, text, id, line: i + 1 });
      }
    }
  }

  // Generate TOC markdown
  const tocLines = [];
  let counter = {};

  for (const h of headings) {
    const indent = '  '.repeat(h.level - minDepth);
    const prefix = ordered ? `${(counter[h.level] = (counter[h.level] || 0) + 1)}.` : '-';

    if (includeLinks) {
      tocLines.push(`${indent}${prefix} [${h.text}](#${h.id})`);
    } else {
      tocLines.push(`${indent}${prefix} ${h.text}`);
    }
  }

  const toc = tocLines.join('\n');

  return {
    toc,
    headings,
    heading_count: headings.length,
    depth_range: { min: Math.min(...headings.map(h => h.level), maxDepth), max: Math.max(...headings.map(h => h.level), minDepth) },
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// Tool: markdown_format — Prettify/standardize Markdown
// ============================================================

function markdownFormat(markdown, options = {}) {
  if (!markdown || typeof markdown !== 'string') {
    return { error: 'markdown parameter is required and must be a string' };
  }

  const indent = options.indent || 2;
  const bulletChar = options.bullet || '-';
  const strongChar = options.strong || '**';
  const emphChar = options.emphasis || '*';
  const lineWidth = options.line_width || 0; // 0 = no wrapping

  const lines = markdown.split('\n');
  const result = [];
  let inCodeBlock = false;
  let prevLineBlank = true;
  let prevLineHeading = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code blocks — pass through unchanged
    if (line.match(/^(`{3,}|~{3,})/)) {
      // Ensure blank line before code block
      if (!inCodeBlock && result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('');
      }
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    // Remove trailing whitespace (except intentional line breaks)
    if (!line.match(/  $/)) {
      line = line.trimEnd();
    }

    // Normalize headings: ensure space after #
    const headingMatch = line.match(/^(#{1,6})(\s*)(.+?)(\s*#*)$/);
    if (headingMatch) {
      const level = headingMatch[1];
      const text = headingMatch[3].trim();
      // Ensure blank line before heading
      if (result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('');
      }
      result.push(`${level} ${text}`);
      prevLineHeading = true;
      prevLineBlank = false;
      continue;
    }

    // Normalize unordered list markers
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)/);
    if (ulMatch) {
      const listIndent = ' '.repeat(Math.round(ulMatch[1].length / indent) * indent);
      const text = ulMatch[3];
      // Ensure blank line before list start
      if (!prevLineBlank && result.length > 0 && !result[result.length - 1].match(/^\s*[-*+]\s/) && !result[result.length - 1].match(/^\s*\d+[.)]\s/)) {
        result.push('');
      }
      result.push(`${listIndent}${bulletChar} ${text}`);
      prevLineBlank = false;
      prevLineHeading = false;
      continue;
    }

    // Normalize ordered list markers
    const olMatch = line.match(/^(\s*)\d+([.)]\s+)(.*)/);
    if (olMatch) {
      const listIndent = ' '.repeat(Math.round(olMatch[1].length / indent) * indent);
      result.push(`${listIndent}1${olMatch[2]}${olMatch[3]}`);
      prevLineBlank = false;
      prevLineHeading = false;
      continue;
    }

    // Normalize emphasis markers
    if (strongChar === '**') {
      line = line.replace(/__(.+?)__/g, '**$1**');
    } else {
      line = line.replace(/\*\*(.+?)\*\*/g, '__$1__');
    }
    if (emphChar === '*') {
      line = line.replace(/(?<!\w)_(.+?)_(?!\w)/g, '*$1*');
    } else {
      line = line.replace(/\*(.+?)\*/g, '_$1_');
    }

    // Collapse multiple blank lines
    if (line.trim() === '') {
      if (prevLineBlank) continue; // Skip consecutive blank lines
      // Add blank line after heading
      if (prevLineHeading) {
        result.push('');
        prevLineBlank = true;
        prevLineHeading = false;
        continue;
      }
      result.push('');
      prevLineBlank = true;
      prevLineHeading = false;
      continue;
    }

    // Line wrapping
    if (lineWidth > 0 && line.length > lineWidth && !line.match(/^\|/) && !line.match(/^\s*[-*+]\s/) && !line.match(/^\s*\d+[.)]\s/)) {
      const wrapped = wordWrap(line, lineWidth);
      result.push(...wrapped.split('\n'));
    } else {
      result.push(line);
    }

    prevLineBlank = false;
    prevLineHeading = false;
  }

  // Ensure file ends with newline
  let formatted = result.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

  return {
    formatted,
    char_count: formatted.length,
    line_count: formatted.split('\n').length,
    changes: countChanges(markdown, formatted),
    ecosystem: ECOSYSTEM,
  };
}

function wordWrap(text, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 > width && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

function countChanges(original, formatted) {
  const origLines = original.split('\n');
  const fmtLines = formatted.split('\n');
  let changed = 0;
  const maxLen = Math.max(origLines.length, fmtLines.length);
  for (let i = 0; i < maxLen; i++) {
    if ((origLines[i] || '') !== (fmtLines[i] || '')) changed++;
  }
  return { lines_changed: changed, original_lines: origLines.length, formatted_lines: fmtLines.length };
}

// ============================================================
// Tool: markdown_slides — Convert to Marp-compatible slides
// ============================================================

function markdownSlides(markdown, options = {}) {
  if (!markdown || typeof markdown !== 'string') {
    return { error: 'markdown parameter is required and must be a string' };
  }

  const theme = options.theme || 'default';
  const paginate = options.paginate !== false;
  const splitLevel = options.split_level || 2; // Split on h1 and h2 by default
  const header = options.header || '';
  const footer = options.footer || '';
  const size = options.size || '16:9';

  // Build Marp front matter
  const frontMatter = [
    '---',
    'marp: true',
    `theme: ${theme}`,
    `paginate: ${paginate}`,
    `size: ${size}`,
  ];
  if (header) frontMatter.push(`header: "${header}"`);
  if (footer) frontMatter.push(`footer: "${footer}"`);
  frontMatter.push('---');

  // Split markdown into slides based on heading level
  const lines = markdown.split('\n');
  const slides = [];
  let currentSlide = [];
  let inCodeBlock = false;
  let slideCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track code blocks
    if (line.match(/^(`{3,}|~{3,})/)) {
      inCodeBlock = !inCodeBlock;
      currentSlide.push(line);
      continue;
    }
    if (inCodeBlock) {
      currentSlide.push(line);
      continue;
    }

    // Check for existing slide separators (---)
    if (line.match(/^---\s*$/) && currentSlide.length > 0) {
      slides.push(currentSlide.join('\n').trim());
      currentSlide = [];
      slideCount++;
      continue;
    }

    // Split on headings at or above split level
    const headingMatch = line.match(/^(#{1,6})\s/);
    if (headingMatch && headingMatch[1].length <= splitLevel && currentSlide.length > 0) {
      // Check if current slide has content
      if (currentSlide.join('').trim() !== '') {
        slides.push(currentSlide.join('\n').trim());
        slideCount++;
      }
      currentSlide = [line];
      continue;
    }

    currentSlide.push(line);
  }

  // Don't forget the last slide
  if (currentSlide.join('').trim() !== '') {
    slides.push(currentSlide.join('\n').trim());
    slideCount++;
  }

  // Handle title slide: if first slide starts with h1, style it
  if (slides.length > 0 && slides[0].match(/^#\s/)) {
    slides[0] = `<!-- _class: lead -->\n\n${slides[0]}`;
  }

  // Join with Marp slide separator
  const slideDeck = frontMatter.join('\n') + '\n\n' + slides.join('\n\n---\n\n');

  // Generate speaker notes hint
  const speakerNotesHint = slides.map((slide, idx) => {
    const firstLine = slide.split('\n').find(l => l.trim() !== '' && !l.startsWith('<!--'));
    return `Slide ${idx + 1}: ${(firstLine || '(empty)').slice(0, 60)}`;
  }).join('\n');

  return {
    slides: slideDeck,
    slide_count: slides.length,
    theme,
    size,
    paginate,
    outline: speakerNotesHint,
    marp_compatible: true,
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// MCP Tools Definitions
// ============================================================

const TOOLS = [
  {
    name: 'markdown_to_html',
    description: 'Convert Markdown to clean HTML with syntax highlighting. Supports headings, bold, italic, strikethrough, code blocks, tables, lists (including task lists), blockquotes, images, links, and horizontal rules.',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'The Markdown string to convert to HTML' },
        syntax_highlight: { type: 'boolean', description: 'Enable syntax highlighting for code blocks (default true)', default: true },
        full_document: { type: 'boolean', description: 'Wrap output in a full HTML document with CSS (default false)', default: false },
      },
      required: ['markdown'],
    },
  },
  {
    name: 'html_to_markdown',
    description: 'Convert HTML back to clean Markdown. Handles tables, lists (ordered, unordered, task lists), code blocks, headings, bold, italic, strikethrough, links, images, blockquotes, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'The HTML string to convert to Markdown' },
        preserve_links: { type: 'boolean', description: 'Preserve hyperlinks in output (default true)', default: true },
        preserve_images: { type: 'boolean', description: 'Preserve images in output (default true)', default: true },
      },
      required: ['html'],
    },
  },
  {
    name: 'markdown_lint',
    description: 'Lint Markdown for style issues, broken links, and accessibility problems. Checks heading levels, trailing spaces, tabs, blank lines, bare URLs, emphasis spacing, link targets, image alt text, and more. Returns issues with line numbers, severity, and rule IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'The Markdown string to lint' },
        check_links: { type: 'boolean', description: 'Check for broken/empty link targets (default true)', default: true },
        check_accessibility: { type: 'boolean', description: 'Check for accessibility issues like missing alt text (default true)', default: true },
      },
      required: ['markdown'],
    },
  },
  {
    name: 'markdown_toc',
    description: 'Generate a table of contents from Markdown headings. Returns TOC as Markdown with anchor links, plus a structured list of headings with levels, text, and IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'The Markdown string to extract headings from' },
        max_depth: { type: 'integer', description: 'Maximum heading depth to include (1-6, default 6)', default: 6, minimum: 1, maximum: 6 },
        min_depth: { type: 'integer', description: 'Minimum heading depth to include (1-6, default 1)', default: 1, minimum: 1, maximum: 6 },
        ordered: { type: 'boolean', description: 'Use ordered (numbered) list instead of unordered (default false)', default: false },
        links: { type: 'boolean', description: 'Include anchor links in TOC entries (default true)', default: true },
      },
      required: ['markdown'],
    },
  },
  {
    name: 'markdown_format',
    description: 'Prettify and standardize Markdown formatting. Normalizes heading spacing, list markers, emphasis markers, blank lines, trailing whitespace, and optionally wraps long lines.',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'The Markdown string to format' },
        indent: { type: 'integer', description: 'Indentation size for nested lists (default 2)', default: 2, minimum: 1, maximum: 8 },
        bullet: { type: 'string', description: 'Bullet character for unordered lists: "-", "*", or "+" (default "-")', default: '-', enum: ['-', '*', '+'] },
        strong: { type: 'string', description: 'Strong/bold marker: "**" or "__" (default "**")', default: '**', enum: ['**', '__'] },
        emphasis: { type: 'string', description: 'Emphasis/italic marker: "*" or "_" (default "*")', default: '*', enum: ['*', '_'] },
        line_width: { type: 'integer', description: 'Max line width for wrapping (0 = no wrapping, default 0)', default: 0 },
      },
      required: ['markdown'],
    },
  },
  {
    name: 'markdown_slides',
    description: 'Convert Markdown to a Marp-compatible slide deck. Splits content into slides based on heading levels, adds Marp front matter with theme/pagination/size options, and generates a slide outline.',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'The Markdown content to convert to slides' },
        theme: { type: 'string', description: 'Marp theme: "default", "gaia", or "uncover" (default "default")', default: 'default', enum: ['default', 'gaia', 'uncover'] },
        paginate: { type: 'boolean', description: 'Show page numbers (default true)', default: true },
        split_level: { type: 'integer', description: 'Heading level to split slides on (1-3, default 2: split on h1 and h2)', default: 2, minimum: 1, maximum: 3 },
        header: { type: 'string', description: 'Header text for all slides (optional)', default: '' },
        footer: { type: 'string', description: 'Footer text for all slides (optional)', default: '' },
        size: { type: 'string', description: 'Slide size: "16:9", "4:3", or "16:10" (default "16:9")', default: '16:9', enum: ['16:9', '4:3', '16:10'] },
      },
      required: ['markdown'],
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
      case 'markdown_to_html':
        result = markdownToHtml(args?.markdown ?? '', { syntax_highlight: args?.syntax_highlight, full_document: args?.full_document });
        break;
      case 'html_to_markdown':
        result = htmlToMarkdown(args?.html ?? '', { preserve_links: args?.preserve_links, preserve_images: args?.preserve_images });
        break;
      case 'markdown_lint':
        result = markdownLint(args?.markdown ?? '', { check_links: args?.check_links, check_accessibility: args?.check_accessibility });
        break;
      case 'markdown_toc':
        result = markdownToc(args?.markdown ?? '', { max_depth: args?.max_depth, min_depth: args?.min_depth, ordered: args?.ordered, links: args?.links });
        break;
      case 'markdown_format':
        result = markdownFormat(args?.markdown ?? '', { indent: args?.indent, bullet: args?.bullet, strong: args?.strong, emphasis: args?.emphasis, line_width: args?.line_width });
        break;
      case 'markdown_slides':
        result = markdownSlides(args?.markdown ?? '', { theme: args?.theme, paginate: args?.paginate, split_level: args?.split_level, header: args?.header, footer: args?.footer, size: args?.size });
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
    msg = `\n\n⚡ ${remaining} call${remaining === 1 ? '' : 's'} left today. Pro $9: paypal.me/Yagami8095/9 (PayPal) | https://product-store.yagami8095.workers.dev/products/ecosystem-pro (Card/Stripe)`;
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
        `Rate limit exceeded (${RATE_LIMIT_MAX}/day). FREE 7-day trial (100 calls/day): https://product-store.yagami8095.workers.dev/auth/login\n\nPro ($9, 1000/day): https://paypal.me/Yagami8095/9 (PayPal) | https://product-store.yagami8095.workers.dev/products/ecosystem-pro (Card/Stripe) | x402: $0.05/call USDC on Base`
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

        // Semantic cache check — all markdown-converter tools are deterministic
        const cached = await getCached(kv, 'markdown', toolName, toolArgs);
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
          await setCache(kv, 'markdown', toolName, toolArgs, toolResp.result);
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
    { name: 'markdown_to_html',  desc: 'Convert Markdown to clean HTML with syntax highlighting for code blocks' },
    { name: 'html_to_markdown',  desc: 'Convert HTML back to Markdown — handles tables, lists, code, links, images' },
    { name: 'markdown_lint',     desc: 'Lint Markdown for style issues, broken links, and accessibility problems' },
    { name: 'markdown_toc',      desc: 'Generate table of contents from headings with anchor links' },
    { name: 'markdown_format',   desc: 'Prettify and standardize Markdown formatting — headings, lists, emphasis, whitespace' },
    { name: 'markdown_slides',   desc: 'Convert Markdown to Marp-compatible slide deck with themes and pagination' },
  ];

  const toolsHtml = tools.map(t => `
        <li class="py-3 border-b border-cyan-900/50 last:border-0">
          <code class="text-cyan-400 font-semibold">${t.name}</code>
          <span class="text-gray-400 text-sm ml-2">— ${t.desc}</span>
        </li>`).join('');

  const ecosystemHtml = Object.entries({
    'json-toolkit-mcp':       { url: ECOSYSTEM.json_toolkit, desc: 'JSON format, validate, diff, query with JSONPath, transform, generate schemas' },
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
  <title>Markdown Converter MCP — OpenClaw Intelligence</title>
  <meta name="description" content="Free MCP server with 6 Markdown tools for AI agents: convert Markdown to HTML, HTML to Markdown, lint, generate TOC, format, and create slide decks. Works with Claude Code, Cursor, Windsurf.">
  <meta name="keywords" content="Markdown converter, HTML converter, Markdown linter, Markdown TOC, Marp slides, MCP server, AI tools, Claude Code">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://markdown-converter-mcp.yagami8095.workers.dev">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Markdown Converter MCP Server - Convert, Lint, Format & Slides | OpenClaw">
  <meta property="og:description" content="Free MCP server with 6 Markdown tools for AI agents: convert Markdown to HTML, HTML to Markdown, lint, generate TOC, format, and create slide decks. Works with Claude Code, Cursor, Windsurf.">
  <meta property="og:url" content="https://markdown-converter-mcp.yagami8095.workers.dev">
  <meta property="og:site_name" content="OpenClaw Intelligence">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Markdown Converter MCP Server - Convert, Lint, Format & Slides | OpenClaw">
  <meta name="twitter:description" content="Free MCP server with 6 Markdown tools for AI agents: convert Markdown to HTML, HTML to Markdown, lint, generate TOC, format, and create slide decks. Works with Claude Code, Cursor, Windsurf.">
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
  "name": "Markdown Converter MCP Server",
  "description": "Free MCP server with 6 Markdown tools for AI agents: convert Markdown to HTML, HTML to Markdown, lint, generate TOC, format, and create slide decks. Works with Claude Code, Cursor, Windsurf.",
  "url": "https://markdown-converter-mcp.yagami8095.workers.dev",
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
        <div class="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">Md</div>
        <span class="font-bold text-lg text-white">Markdown Converter MCP</span>
        <span class="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">v1.0.0</span>
      </div>
      <span class="text-xs text-gray-500">by OpenClaw Intelligence</span>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12">

    <!-- Hero -->
    <div class="mb-12 text-center">
      <div class="inline-block bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-800/50 rounded-2xl px-6 py-2 mb-6">
        <span class="text-cyan-400 text-sm font-medium">Free Tier: 15 requests/day per IP | Pro: 150/day</span>
      </div>
      <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
        Markdown Converter MCP Server
      </h1>
      <p class="text-gray-400 text-lg max-w-2xl mx-auto">
        6 powerful Markdown tools for AI agents — convert between Markdown, HTML, lint for issues, generate TOC, format, and create slide decks.
      </p>
    </div>

    <!-- Quick Connect -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40 shadow-lg shadow-cyan-950/20">
      <h2 class="text-lg font-bold mb-1 text-white">Quick Connect</h2>
      <p class="text-gray-500 text-sm mb-4">Add to your Claude Code / Cursor / Windsurf / Cline MCP config:</p>
      <pre class="bg-gray-950 rounded-xl p-4 text-sm text-cyan-300 overflow-x-auto border border-cyan-900/30">{
  "mcpServers": {
    "markdown-converter": {
      "url": "https://markdown-converter-mcp.yagami8095.workers.dev/mcp",
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
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">markdown_to_html — Convert Markdown to HTML</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "markdown_to_html",
    "arguments": {
      "markdown": "# Hello World\\n\\nThis is **bold** and *italic*.\\n\\n\`\`\`js\\nconsole.log('hi');\\n\`\`\`"
    }
  }
}</pre>
        </div>
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">markdown_lint — Lint for style issues</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "markdown_lint",
    "arguments": {
      "markdown": "##No space after hash\\n\\nSome text with a bare URL https://example.com\\n\\n![](image.png)"
    }
  }
}</pre>
        </div>
      </div>
    </div>

    <!-- Rate Limits -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-3 text-white">Rate Limits</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-cyan-400">15</div>
          <div class="text-gray-400 mt-1">tool calls / day (free)</div>
          <div class="text-gray-600 text-xs mt-1">per IP address, resets midnight UTC</div>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-teal-400">150</div>
          <div class="text-gray-400 mt-1">tool calls / day (Pro)</div>
          <div class="text-gray-600 text-xs mt-1">$9 via PayPal or Stripe</div>
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
    Markdown Converter MCP v1.0.0 &nbsp;&bull;&nbsp; Powered by <span class="text-cyan-800">OpenClaw Intelligence</span> &nbsp;&bull;&nbsp; Cloudflare Workers
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
// Main Worker Export
// ============================================================

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
  // Suspicious: curl/wget UA with browser-like Accept-Language
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
      // Slow down suspicious IPs
      return { action: 'throttle', delay: 200 };
    }
  } catch { /* KV failure — allow */ }

  // 4. Fingerprint anomaly (light check, just flag)
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
  return str.slice(0, maxLen);
}

// ============================================================
// FinOps Circuit Breaker — Track daily usage, auto-degrade
// ============================================================

const FINOPS_DAILY_WARN = 50000;   // requests across all workers
const FINOPS_DAILY_SLOW = 80000;   // start adding delay
const FINOPS_DAILY_STOP = 95000;   // hard stop (return 503)

async function finopsTrack(env, serverName) {
  const kv = env.KV;
  if (!kv) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `finops:${today}`;
  try {
    const raw = await kv.get(key, { type: 'json' }) || { total: 0, by: {} };
    raw.total++;
    raw.by[serverName] = (raw.by[serverName] || 0) + 1;
    // Don't await write — fire and forget for speed
    kv.put(key, JSON.stringify(raw), { expirationTtl: 172800 });
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow.', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true }; // KV failure → allow
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
    await kv.put(key, String(count + 1), { expirationTtl: 2592000 }); // 30 days
  } catch {}
}

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
    const defense = await edgeDefense(request, env, 'markdown');
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
    const finops = await finopsTrack(env, 'markdown-converter');
    if (!finops.ok) return jsonResponse({ error: finops.reason, retryAfter: 'tomorrow' }, finops.status);
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));

    // Attribution Tracking
    await trackRef(request, env, 'markdown-converter');

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
        "- Markdown Converter: https://markdown-converter-mcp.yagami8095.workers.dev/mcp",
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
        'Add to MCP config: {"url": "https://markdown-converter-mcp.yagami8095.workers.dev/mcp"}',
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
        rate_limit: { max_per_day_free: RATE_LIMIT_MAX, max_per_day_pro: 150 },
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

      // x402: Detect rate limit → HTTP 402 with payment headers
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
