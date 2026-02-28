# OpenClaw MCP Servers

AI-powered MCP tools for any agent or app. Connect in seconds via HTTPS -- no npm, no Docker, no setup.

All servers run on Cloudflare Workers with Streamable HTTP transport (MCP 2025-03-26 spec).

---

## MCP Servers (9)

### 1. OpenClaw Intel MCP -- AI Market Intelligence
Real-time data on Claude Code, Cursor, Devin, OpenHands, Windsurf.

**Endpoint:** `https://openclaw-intel-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `get_ai_market_report` | Latest AI agent market report |
| `get_report_by_id` | Specific report by ID |
| `list_reports` | List available reports |
| `get_market_stats` | Platform statistics |
| `purchase_api_key` | Get Pro API key |
| `validate_api_key` | Check API key status + quota |

### 2. Fortune MCP -- Daily Horoscope + Tarot
12 zodiac signs, tarot card readings, category scores, lucky items.

**Endpoint:** `https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `get_daily_fortune` | Daily horoscope + tarot for a zodiac sign |
| `get_fortune_ranking` | Zodiac ranking |
| `get_all_fortunes` | Complete data for all 12 signs |

### 3. AgentForge Compare MCP -- AI Tool Comparison Engine
Side-by-side comparisons of AI coding tools.

**Endpoint:** `https://agentforge-compare-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `compare_ai_tools` | Side-by-side comparison of 2+ tools |
| `get_tool_profile` | Detailed profile for a single tool |
| `recommend_tool` | AI-powered recommendation (Pro) |
| `get_pricing_comparison` | All tools pricing at a glance |
| `purchase_pro_key` | Machine-readable purchase flow |

### 4. MoltBook Publisher MCP -- Japanese Content Publishing
Markdown to HTML, SEO, EN-to-JP translation, cross-platform formatting.

**Endpoint:** `https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `markdown_to_html` | Convert Markdown to platform-ready HTML |
| `seo_optimize` | SEO optimization for Japanese content |
| `translate_to_japanese` | EN-to-JP translation |
| `get_trending_topics` | Trending topics on JP tech platforms |
| `format_for_platform` | Format for note.com / Zenn / Qiita |

### 5. Color Palette MCP -- Design Utility
Color palettes, WCAG contrast, format conversion, CSS gradients, Tailwind.

**Endpoint:** `https://color-palette-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `generate_palette` | Generate color palettes using color theory |
| `contrast_check` | WCAG 2.1 contrast ratio checker |
| `color_convert` | Convert between hex, RGB, HSL, CSS |
| `css_gradient` | Generate CSS gradient code |
| `tailwind_colors` | Lookup Tailwind CSS v3 colors |

### 6. JSON Toolkit MCP -- JSON Utility
Format, validate, diff, query, transform, and generate schemas.

**Endpoint:** `https://json-toolkit-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `json_format` | Pretty-print / minify JSON |
| `json_validate` | Validate JSON with detailed error info |
| `json_diff` | Compare two JSON objects |
| `json_query` | Query JSON with JSONPath-like syntax |
| `json_transform` | Flatten, unflatten, pick, omit, rename |
| `json_schema_generate` | Generate JSON Schema from sample |

### 7. Prompt Enhancer MCP -- Prompt Engineering
Enhance, analyze, convert, and generate system prompts.

**Endpoint:** `https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `enhance_prompt` | Improve prompt clarity and effectiveness |
| `analyze_prompt` | Score and critique a prompt |
| `convert_prompt_format` | Convert between prompt formats |
| `generate_system_prompt` | Generate system prompts |
| `prompt_template_library` | Browse prompt templates (Pro) |
| `purchase_pro_key` | Get Pro API key |

### 8. Regex Engine MCP -- Regular Expressions
Build, test, explain, and debug regular expressions.

**Endpoint:** `https://regex-engine-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `regex_build` | Build regex from natural language |
| `regex_test` | Test regex against input strings |
| `regex_explain` | Human-readable regex explanation |
| `regex_replace` | Find and replace using regex |
| `regex_extract` | Extract all matches/groups |

### 9. Timestamp Converter MCP -- Time Utilities
Time conversion, timezone math, cron parsing, duration formatting.

**Endpoint:** `https://timestamp-converter-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `convert_timestamp` | Unix, ISO 8601, human readable, relative |
| `timezone_convert` | Convert datetime between timezones |
| `parse_cron` | Parse cron expression with next 5 runs |
| `time_diff` | Difference between two datetimes |
| `format_duration` | Seconds, human-readable, ISO 8601 |

---

## Utility Workers (3)

These are REST API / web workers (not MCP servers).

### 10. Fortune API
REST API + landing page for daily zodiac fortune with tarot.

**URL:** `https://fortune-api.yagami8095.workers.dev`

### 11. OpenClaw Intel API
Hardened REST API for AI market intelligence.

**URL:** `https://openclaw-intel-api.yagami8095.workers.dev`

### 12. Product Store
Digital product store with PayPal + Stripe.

**URL:** `https://product-store.yagami8095.workers.dev`

---

## Quick Connect

### Claude Code / Cursor / Windsurf / Cline
```json
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    },
    "agentforge-compare": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
    },
    "moltbook-publisher": {
      "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp"
    },
    "color-palette": {
      "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp"
    },
    "json-toolkit": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
    },
    "prompt-enhancer": {
      "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp"
    },
    "regex-engine": {
      "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp"
    },
    "timestamp-converter": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

## Pro API Keys

- **Intel Pro**: Full market reports, 1000 API calls/day
- **AgentForge Pro**: Full comparisons, AI recommendations
- **Prompt Enhancer Pro**: Template library access

**Purchase:** https://product-store.yagami8095.workers.dev

## Architecture

All servers are built on Cloudflare Workers with:
- **MCP Protocol** 2025-03-26 (Streamable HTTP transport)
- **JSON-RPC 2.0** with batch support
- **KV rate limiting** (free tier per IP)
- **D1 databases** for persistent data
- **Cross-promotion ecosystem**

## License

MIT

---

Built by [OpenClaw Intelligence](https://product-store.yagami8095.workers.dev)
