# Show HN: 49 AI Tools as MCP Servers on Cloudflare Workers (Free Tier)

I built 9 MCP servers with 49 tools that run on Cloudflare Workers edge compute. Zero setup — paste a URL and you're connected.

**Why I built this:** I needed JSON validation, regex testing, color palette generation, and timestamp conversion across multiple AI coding tools (Claude Code, Cursor, Windsurf). Instead of installing npm packages for each, I put them on Cloudflare Workers with MCP's Streamable HTTP transport. One URL, works everywhere.

## What's included (all free tier):

- **JSON Toolkit** (6 tools): format, validate, diff, query, transform, schema generate
- **Regex Engine** (5 tools): test, explain, build from natural language, replace, extract
- **Color Palette** (5 tools): generate harmonies, WCAG contrast check, CSS gradients, Tailwind lookup
- **Timestamp Converter** (5 tools): Unix/ISO auto-detect, timezone convert, cron parser, duration format
- **Prompt Enhancer** (6 tools): optimize structure, quality scoring, format conversion, system prompt generator
- **Market Intelligence** (6 tools): AI tool adoption tracking, GitHub stars/growth trends
- **Fortune & Tarot** (3 tools): daily horoscope, zodiac rankings (fun MCP demo)
- **Content Publisher** (8 tools): markdown to HTML, SEO analysis, EN-JP translation
- **AI Tool Compare** (5 tools): side-by-side comparison of AI coding tools

## How to connect (10 seconds):

**Claude Desktop / Cursor / any MCP client:**
```json
{
  "openclaw-json": { "type": "streamable-http", "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp" }
}
```

That's it. No npm install, no Docker, no API keys for free tier.

## Tech stack:

- Cloudflare Workers (free tier, 300+ PoPs worldwide)
- Streamable HTTP transport (MCP spec 2025-03-26)
- Rate limiting via Cloudflare KV
- x402 micropayment protocol (optional USDC on Base L2)
- TypeScript/JavaScript

## Architecture choice: why Cloudflare Workers?

1. **Zero cold start** — Workers run at the edge, <100ms latency globally
2. **Free hosting** — Workers free tier is generous (100K requests/day)
3. **No server management** — No Docker, no VPS, no scaling concerns
4. **MCP-native** — Streamable HTTP is perfect for Workers' request/response model

## Free vs Pro:

- **Free**: 10-50 calls/day per server (enough for personal use)
- **Pro ($9 one-time)**: 1000 calls/day across all 9 servers
- **x402**: $0.05/call auto-pay with USDC (for AI agents)

## Links:

- GitHub: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
- Store: https://product-store.yagami8095.workers.dev
- Smithery: https://smithery.ai/server/openclaw-ai/json-toolkit

MIT licensed. Happy to answer questions about building MCP servers on Cloudflare Workers.
