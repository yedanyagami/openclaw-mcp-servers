# AgentForge AI Tool Compare MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/agentforge-compare-mcp)](https://smithery.ai/server/@openclaw-ai/agentforge-compare-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://agentforge-compare-mcp.yagami8095.workers.dev/mcp)

> 5 AI coding tool comparison tools — Claude Code, Cursor, Devin, Copilot, and more

Compare AI coding tools side-by-side. Get detailed profiles, feature comparisons, pricing analysis, and AI-powered recommendations. Covers Claude Code, Cursor, Windsurf, Devin, SWE-agent, Copilot, Aider, and Cline.

## Features

- **Side-by-side comparison** — compare any AI coding tools on multiple criteria
- **Detailed profiles** — pricing, strengths, weaknesses, and use cases for each tool
- **Trend tracking** — see which AI tools are gaining or losing popularity
- **Category filtering** — compare within coding, writing, design, or general AI
- **Auto-generated reports** — markdown comparison reports ready to share
- **Always current** — data updated regularly to reflect the latest tool landscape

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=agentforge-compare&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "agentforge-compare": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/agentforge-compare-mcp
```

## Tools (5)

| Tool | Description |
|------|-------------|
| `compare_ai_tools` | Compare 2-8 AI coding tools side-by-side with feature matrix |
| `get_tool_profile` | Detailed profile: features, pricing, strengths/weaknesses, use cases |
| `recommend_tool` | AI-powered recommendation based on your requirements and use case |
| `get_pricing_comparison` | Side-by-side pricing breakdown for all AI coding tools |
| `purchase_pro_key` | Get Pro API key for full comparisons with recommendations |

## Examples

### Compare AI Tools
```json
// Input
{"tools": ["cursor", "claude-code"], "criteria": ["speed", "accuracy", "cost"]}

// Output
{
  "comparison": [
    {"tool": "Cursor", "speed": 8, "accuracy": 7, "cost": "$20/mo", "verdict": "Fast IDE integration"},
    {"tool": "Claude Code", "speed": 7, "accuracy": 9, "cost": "$20/mo", "verdict": "Best for complex tasks"}
  ],
  "recommendation": "Claude Code for accuracy, Cursor for speed"
}
```

### Get Tool Details
```json
// Input
{"tool": "devin"}

// Output
{"name": "Devin", "category": "Autonomous Agent", "pricing": "$500/mo", "strengths": ["Full autonomy", "Multi-file changes"], "weaknesses": ["Expensive", "Slow iteration"]}
```

### Trending AI Tools
```json
// Input
{"category": "coding", "limit": 5}

// Output
{"trending": ["Claude Code", "Cursor", "Windsurf", "Copilot", "Aider"], "period": "2024-Q4"}
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
Endpoint: https://agentforge-compare-mcp.yagami8095.workers.dev/mcp
Transport: Streamable HTTP (POST)
Auth: None required (free tier) | X-API-Key header (Pro tier)
```

## Keywords

`AI tools`, `comparison`, `Claude Code`, `Cursor`, `Copilot`, `Devin`, `coding`

## License

MIT
