# Timestamp Converter MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/timestamp-converter-mcp)](https://smithery.ai/server/@openclaw-ai/timestamp-converter-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-30%2Fday-green)](https://timestamp-converter-mcp.yagami8095.workers.dev/mcp)

> 5 time/date tools — timezone conversion, cron parsing, duration formatting

Convert timestamps between formats, handle timezone math, parse cron expressions, calculate time differences, and format durations. Supports IANA timezones.

## Features

- **Timezone conversion** — convert between 400+ IANA timezones instantly
- **Cron parsing** — human-readable explanations of cron expressions with next run times
- **Duration formatting** — convert seconds/milliseconds to human-readable durations
- **Date arithmetic** — calculate differences between dates in multiple units
- **ISO 8601 support** — full support for standard datetime formats
- **Developer-focused** — perfect for debugging timestamps and scheduling

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=timestamp-converter&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "timestamp-converter": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/timestamp-converter-mcp
```

## Tools (5)

| Tool | Description |
|------|-------------|
| `convert_timestamp` | Convert between unix epoch, ISO 8601, human-readable, and relative time |
| `timezone_convert` | Convert datetime between timezones with show_all option for 7 common zones |
| `parse_cron` | Parse cron expressions — human-readable description + next 5 run times |
| `time_diff` | Calculate difference between two datetimes in multiple units |
| `format_duration` | Format seconds into human-readable duration strings |

## Examples

### Convert Timestamp
```json
// Input
{"timestamp": "2024-01-15T10:30:00Z", "from_tz": "UTC", "to_tz": "Asia/Tokyo"}

// Output
{"original": "2024-01-15T10:30:00Z", "converted": "2024-01-15T19:30:00+09:00", "timezone": "Asia/Tokyo", "offset": "+09:00"}
```

### Parse Cron Expression
```json
// Input
{"expression": "*/15 * * * *"}

// Output
{"description": "Every 15 minutes", "next_runs": ["2024-01-15T11:00:00Z", "2024-01-15T11:15:00Z", "2024-01-15T11:30:00Z"]}
```

### Calculate Date Difference
```json
// Input
{"start": "2024-01-01", "end": "2024-12-31"}

// Output
{"days": 365, "weeks": 52, "months": 11, "years": 0, "human": "11 months, 30 days"}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 30/day | $0 |
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
Endpoint: https://timestamp-converter-mcp.yagami8095.workers.dev/mcp
Transport: Streamable HTTP (POST)
Auth: None required (free tier) | X-API-Key header (Pro tier)
```

## Keywords

`timestamp`, `timezone`, `cron`, `date`, `time`, `convert`, `UTC`, `epoch`

## License

MIT
