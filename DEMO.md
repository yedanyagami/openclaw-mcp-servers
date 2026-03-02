# OpenClaw MCP Servers -- Interactive Demo

**49 tools. 9 servers. Zero install. Copy, paste, go.**

This document is designed for AI agents and developers to start using OpenClaw MCP servers immediately. Every example below is a real, working curl command against live Cloudflare Workers endpoints.

## Protocol Overview

All servers use **MCP over Streamable HTTP** (JSON-RPC 2.0). Every request is a POST to the server's `/mcp` endpoint with `Content-Type: application/json`.

```
POST https://<server>.yagami8095.workers.dev/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": { ... }
  }
}
```

---

## Example 1: Validate and Format JSON (json-toolkit-mcp)

**Use case:** An AI agent receives user-pasted JSON and needs to check if it is valid before processing.

```bash
curl -s -X POST https://json-toolkit-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "json_validate",
      "arguments": {
        "json": "{\"name\": \"OpenClaw\", \"tools\": 49, \"active\": true}"
      }
    }
  }'
```

**Expected output:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"valid\":true,\"type\":\"object\",\"keys\":3,\"key_list\":[\"name\",\"tools\",\"active\"],\"size\":52}"
    }]
  }
}
```

---

## Example 2: Build a Regex from Natural Language (regex-engine-mcp)

**Use case:** An agent needs to extract email addresses from a document but does not know the regex syntax.

```bash
curl -s -X POST https://regex-engine-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "regex_build",
      "arguments": {
        "description": "email"
      }
    }
  }'
```

**Expected output:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"pattern\":\"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}\",\"flags\":\"g\",\"description\":\"Matches email addresses\",\"examples\":[\"user@example.com\",\"name+tag@domain.co.uk\"]}"
    }]
  }
}
```

---

## Example 3: Check WCAG Contrast Ratio (color-palette-mcp)

**Use case:** A design agent needs to verify that a button's text color meets accessibility standards against its background.

```bash
curl -s -X POST https://color-palette-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "contrast_check",
      "arguments": {
        "foreground": "#ffffff",
        "background": "#3b82f6"
      }
    }
  }'
```

**Expected output:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"foreground\":\"#ffffff\",\"background\":\"#3b82f6\",\"ratio\":4.68,\"AA\":{\"normal\":true,\"large\":true},\"AAA\":{\"normal\":false,\"large\":true}}"
    }]
  }
}
```

---

## Example 4: Get Daily Zodiac Fortune (fortune-mcp)

**Use case:** A chatbot integrates daily horoscope readings into its morning greeting workflow.

```bash
curl -s -X POST https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_daily_fortune",
      "arguments": {
        "sign": "aries"
      }
    }
  }'
```

**Expected output:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"sign\":\"aries\",\"date\":\"2026-03-03\",\"overall_score\":78,\"love_score\":82,\"work_score\":75,\"health_score\":80,\"lucky_color\":\"crimson\",\"lucky_number\":7,\"tarot\":{\"card\":\"The Emperor\",\"meaning\":\"Structure, authority, and stability guide your day\"},\"message\":\"Bold decisions made today will echo through the week.\"}"
    }]
  }
}
```

---

## Example 5: Convert Timestamps Across Timezones (timestamp-converter-mcp)

**Use case:** A scheduling agent needs to display a meeting time in multiple timezones for distributed team members.

```bash
curl -s -X POST https://timestamp-converter-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "timezone_convert",
      "arguments": {
        "datetime": "2026-03-03T09:00:00",
        "from_timezone": "America/New_York",
        "to_timezone": "Asia/Tokyo",
        "show_all": true
      }
    }
  }'
```

**Expected output:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"input\":\"2026-03-03T09:00:00\",\"from\":\"America/New_York\",\"to\":\"Asia/Tokyo\",\"converted\":\"2026-03-03T23:00:00+09:00\",\"all_zones\":{\"UTC\":\"2026-03-03T14:00:00Z\",\"America/New_York\":\"2026-03-03T09:00:00-05:00\",\"America/Los_Angeles\":\"2026-03-03T06:00:00-08:00\",\"Europe/London\":\"2026-03-03T14:00:00+00:00\",\"Europe/Berlin\":\"2026-03-03T15:00:00+01:00\",\"Asia/Tokyo\":\"2026-03-03T23:00:00+09:00\",\"Australia/Sydney\":\"2026-03-04T01:00:00+11:00\"}}"
    }]
  }
}
```

---

## Try It Now

### For Claude Code, Cursor, Windsurf, or any MCP client

Copy this JSON into your MCP client configuration file:

```json
{
  "mcpServers": {
    "openclaw-json": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-regex": {
      "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-colors": {
      "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-timestamp": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-prompt": {
      "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-moltbook": {
      "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-agentforge": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Configuration file locations

| Client | File path |
|--------|-----------|
| Claude Code | `~/.claude.json` or project `.mcp.json` |
| Cursor | `.cursor/mcp.json` |
| Windsurf | `.windsurf/mcp.json` |
| Cline | VS Code MCP settings panel |
| Custom client | Any Streamable HTTP MCP transport |

### With Pro API Key (1000 calls/day)

Add the `X-API-Key` header to unlock higher rate limits:

```json
{
  "mcpServers": {
    "openclaw-json": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp",
      "headers": {
        "X-API-Key": "your-pro-key-here"
      }
    }
  }
}
```

Get a free 7-day trial key (100 calls/day, no credit card):
**[Start Free Trial](https://product-store.yagami8095.workers.dev/auth/login)**

---

## Quick Reference: All 49 Tools

| Server | Tools | Endpoint |
|--------|-------|----------|
| json-toolkit | `json_format` `json_validate` `json_diff` `json_query` `json_transform` `json_schema_generate` | `json-toolkit-mcp.yagami8095.workers.dev/mcp` |
| regex-engine | `regex_test` `regex_explain` `regex_build` `regex_replace` `regex_extract` | `regex-engine-mcp.yagami8095.workers.dev/mcp` |
| color-palette | `generate_palette` `contrast_check` `color_convert` `css_gradient` `tailwind_colors` | `color-palette-mcp.yagami8095.workers.dev/mcp` |
| timestamp-converter | `convert_timestamp` `timezone_convert` `parse_cron` `time_diff` `format_duration` | `timestamp-converter-mcp.yagami8095.workers.dev/mcp` |
| prompt-enhancer | `enhance_prompt` `analyze_prompt` `convert_prompt_format` `generate_system_prompt` `prompt_template_library` `purchase_pro_key` | `prompt-enhancer-mcp.yagami8095.workers.dev/mcp` |
| intel | `get_ai_market_report` `get_report_by_id` `list_reports` `get_market_stats` `purchase_api_key` `validate_api_key` | `openclaw-intel-mcp.yagami8095.workers.dev/mcp` |
| fortune | `get_daily_fortune` `get_fortune_ranking` `get_all_fortunes` | `openclaw-fortune-mcp.yagami8095.workers.dev/mcp` |
| moltbook | `convert_markdown_to_html` `optimize_for_seo` `translate_en_to_jp` `generate_article_outline` `get_trending_topics` `cross_post_format` `analyze_article_performance` `purchase_pro_key` | `moltbook-publisher-mcp.yagami8095.workers.dev/mcp` |
| agentforge | `compare_ai_tools` `get_tool_profile` `recommend_tool` `get_pricing_comparison` `purchase_pro_key` | `agentforge-compare-mcp.yagami8095.workers.dev/mcp` |

---

## Pricing

| Tier | Cost | Daily Limit | How to get |
|------|------|-------------|------------|
| Free | $0 | 3-50 calls/tool/day per IP | Just use it |
| x402 | $0.05/call | Unlimited | Automatic USDC on Base L2 |
| Trial | $0 | 100 calls/day (7 days) | [GitHub sign-in](https://product-store.yagami8095.workers.dev/auth/login) |
| Pro | $9 one-time | 1000 calls/day | [Purchase](https://product-store.yagami8095.workers.dev/buy/pro) |

---

Built by [OpenClaw Intelligence](https://product-store.yagami8095.workers.dev) | [GitHub](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
