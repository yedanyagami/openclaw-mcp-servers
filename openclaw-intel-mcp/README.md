# OpenClaw Market Intelligence MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/openclaw-intel-mcp)](https://smithery.ai/server/@openclaw-ai/openclaw-intel-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://openclaw-intel-mcp.yagami8095.workers.dev/mcp)

> 6 AI market intelligence tools — trends, reports, stats for AI agents

AI-native market intelligence. Track GitHub stars, releases, growth trends for AI coding tools. Get reports, stats, and competitor analysis — designed for AI agents as the primary customer.

## Features

- **Market intelligence** — AI industry trends, market size, and growth data
- **Competitor analysis** — strengths, weaknesses, and threat assessment
- **Trend reports** — emerging technologies and market shifts
- **Investment signals** — funding rounds, acquisitions, and partnerships
- **Custom depth** — quick summaries or detailed research reports
- **Always current** — data refreshed regularly from multiple sources

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-intel&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/openclaw-intel-mcp
```

## Tools (6)

| Tool | Description |
|------|-------------|
| `get_ai_market_report` | Latest AI agent market intelligence report with ROI signals |
| `get_report_by_id` | Get a specific market report by ID |
| `list_reports` | List available reports with titles, dates, and content tier |
| `get_market_stats` | Real-time ecosystem stats: Pro users, report count, data freshness |
| `purchase_api_key` | Machine-readable payment instructions for Pro API key |
| `validate_api_key` | Check API key validity and remaining daily quota |

## Examples

### Get Market Report
```json
// Input
{"topic": "AI coding assistants", "depth": "detailed"}

// Output
{
  "topic": "AI Coding Assistants",
  "market_size": "$5.2B (2024)",
  "growth_rate": "42% CAGR",
  "key_players": ["GitHub Copilot", "Cursor", "Claude Code", "Windsurf"],
  "trends": ["MCP adoption", "Agent-first development", "Multi-model routing"],
  "analysis": "The market is shifting from simple code completion to autonomous agents..."
}
```

### Competitor Analysis
```json
// Input
{"company": "Anthropic", "competitors": ["OpenAI", "Google"]}

// Output
{
  "company": "Anthropic",
  "strengths": ["Safety focus", "Claude quality", "MCP ecosystem"],
  "competitors": [
    {"name": "OpenAI", "threat_level": "high", "differentiator": "GPT ecosystem"},
    {"name": "Google", "threat_level": "medium", "differentiator": "Search integration"}
  ]
}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 10/day | $0 |
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
Endpoint: https://openclaw-intel-mcp.yagami8095.workers.dev/mcp
Transport: Streamable HTTP (POST)
Auth: None required (free tier) | X-API-Key header (Pro tier)
```

## Keywords

`market intelligence`, `AI trends`, `GitHub stats`, `competitor analysis`, `reports`

## License

MIT
