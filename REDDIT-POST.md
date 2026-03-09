# [Project] I built 49 AI tools as MCP servers on Cloudflare Workers — free tier, zero setup, paste URL and go

Hey everyone! I've been building MCP (Model Context Protocol) servers that run on Cloudflare Workers and wanted to share what I've learned.

## The Problem

Every time I switch between Claude Code, Cursor, and Windsurf, I need the same utility tools — JSON formatting, regex testing, color palettes, timestamp conversion. Installing npm packages per-project is tedious, and they break across different MCP clients.

## The Solution

I put 49 tools across 9 MCP servers on Cloudflare Workers. They use Streamable HTTP transport, so you just paste a URL into any MCP client config. No installation, no Docker, no API keys for free tier.

## Quick start (literally 10 seconds):

Add to your MCP config:
```json
{
  "json-toolkit": { "type": "streamable-http", "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp" },
  "regex-engine": { "type": "streamable-http", "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp" },
  "color-palette": { "type": "streamable-http", "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp" }
}
```

## 9 servers, 49 tools:

| Server | Tools | What it does |
|--------|-------|-------------|
| JSON Toolkit | 6 | Format, validate, diff, query, transform, schema |
| Regex Engine | 5 | Test, explain, build from English, replace, extract |
| Color Palette | 5 | Harmonies, WCAG contrast, CSS gradients, Tailwind |
| Timestamp | 5 | Unix/ISO convert, timezone, cron parse, duration |
| Prompt Enhancer | 6 | Optimize, score, convert format, system prompts |
| Market Intel | 6 | AI tool tracking, GitHub trends, ecosystem stats |
| Fortune | 3 | Horoscope + tarot (fun demo) |
| Content Publisher | 8 | MD to HTML, SEO, translation, outlines |
| AI Compare | 5 | Side-by-side AI tool comparison |

## Why Cloudflare Workers for MCP?

- Zero cold start (<100ms worldwide)
- Free tier is generous (100K req/day)
- No server to manage
- Streamable HTTP transport fits perfectly
- KV for rate limiting, D1 for state

## Pricing

- **Free**: 10-50 calls/day (enough for personal projects)
- **Pro**: $9 one-time for 1000 calls/day across everything
- **x402**: Pay-per-call with USDC (experimental)

GitHub: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers (MIT)

Works with Claude Code, Cursor, Windsurf, Cline, and any MCP-compatible client. Also published on Smithery and 8 other MCP directories.

Would love feedback on the tool selection and architecture! What tools would you want to see added?

---

**Best subreddits to post:**
- r/ClaudeAI
- r/MCP
- r/LocalLLaMA
- r/ChatGPTCoding
- r/SideProject
- r/webdev
