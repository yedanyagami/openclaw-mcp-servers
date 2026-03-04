# JSON Toolkit MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/json-toolkit-mcp)](https://smithery.ai/server/@openclaw-ai/json-toolkit-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://json-toolkit-mcp.yagami8095.workers.dev/mcp)

> 6 free JSON tools for AI agents on Cloudflare Workers

A utility MCP server for AI agents that work with JSON data daily. Format, validate, diff, query, transform, and generate schemas — all in one server.

## Features

- **Zero config** — works out of the box with Streamable HTTP, no API key needed
- **6 essential tools** — format, validate, diff, query, transform, schema generation
- **JSONPath queries** — `$.users[*].name`, dot notation, wildcards, array slicing
- **Detailed error info** — line number, column, and context for validation errors
- **Schema generation** — auto-generate JSON Schema from sample data
- **Production-ready** — runs on Cloudflare Workers with global edge deployment

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=json-toolkit&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/json-toolkit-mcp
```

## Tools (6)

| Tool | Description |
|------|-------------|
| `json_format` | Pretty-print or minify JSON with configurable indent |
| `json_validate` | Validate JSON with detailed error info (line, column, context) |
| `json_diff` | Compare two JSON objects — shows added, removed, changed paths |
| `json_query` | Query JSON with JSONPath-like syntax ($, dot notation, wildcards) |
| `json_transform` | Flatten, unflatten, pick, omit, rename keys in JSON |
| `json_schema_generate` | Generate JSON Schema from a sample JSON object |

## Examples

### Format JSON
```json
// Input
{"json": "{\"name\":\"Alice\",\"scores\":[98,87,95]}", "indent": 2}

// Output
{
  "name": "Alice",
  "scores": [98, 87, 95]
}
```

### Validate JSON
```json
// Input
{"json": "{\"key\": value}"}

// Output
{"valid": false, "error": "Unexpected token 'v' at line 1 col 9", "line": 1, "column": 9}
```

### Diff Two JSON Objects
```json
// Input
{"json_a": "{\"x\": 1, \"y\": 2}", "json_b": "{\"x\": 1, \"z\": 3}"}

// Output
{"added": ["z"], "removed": ["y"], "changed": [], "unchanged": ["x"]}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 20/day | $0 |
| Pro | 1000/day | $9 one-time |
| x402 | Pay-per-call | $0.05 USDC |

Get a free 7-day Pro trial: [Start Trial](https://product-store.yagami8095.workers.dev/auth/login)

## Part of OpenClaw MCP Ecosystem

This server is one of **9 MCP servers** with **49 tools** total. All run on Cloudflare Workers with Streamable HTTP transport.

| Server | Tools | Description |
|--------|-------|-------------|
| [JSON Toolkit](https://json-toolkit-mcp.yagami8095.workers.dev/mcp) | 6 | Format, validate, diff, query, transform JSON |
| [Regex Engine](https://regex-engine-mcp.yagami8095.workers.dev/mcp) | 5 | Test, explain, build, replace, extract with regex |
| [Color Palette](https://color-palette-mcp.yagami8095.workers.dev/mcp) | 5 | Palettes, WCAG contrast, CSS gradients |
| [Timestamp Converter](https://timestamp-converter-mcp.yagami8095.workers.dev/mcp) | 5 | Timezone math, cron parsing, duration formatting |
| [Prompt Enhancer](https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp) | 6 | Optimize prompts, 30+ templates, quality scoring |
| [Market Intelligence](https://openclaw-intel-mcp.yagami8095.workers.dev/mcp) | 6 | AI market trends, reports, competitor analysis |
| [Fortune & Tarot](https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp) | 3 | Daily zodiac horoscopes + tarot readings |
| [Content Publisher](https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp) | 8 | Japanese content tools, SEO, translation |
| [AI Tool Compare](https://agentforge-compare-mcp.yagami8095.workers.dev/mcp) | 5 | Compare Claude Code, Cursor, Copilot, Devin |

## Transport

This server uses **Streamable HTTP** transport (MCP 2025-03-26 spec). No WebSocket, no stdio — just a single HTTPS endpoint. Works with any MCP client that supports HTTP transport.

```
Endpoint: https://json-toolkit-mcp.yagami8095.workers.dev/mcp
Transport: Streamable HTTP (POST)
Auth: None required (free tier) | X-API-Key header (Pro tier)
```

## Keywords

`json`, `format`, `validate`, `diff`, `query`, `transform`, `schema`, `utility`

## License

MIT
