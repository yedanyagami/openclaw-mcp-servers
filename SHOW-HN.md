# Show HN: 49 AI Tools as MCP Servers on Cloudflare Workers — $0 infra cost

I built 9 MCP servers with 49 specialized tools on Cloudflare Workers. Total infrastructure cost: $0/month. Zero setup for users — paste a URL into any MCP client and you're connected.

**Why I built this:** As a solo developer using Claude Code, Cursor, and Windsurf daily, I kept needing the same utilities — JSON validation, regex testing, color conversion, timestamp parsing. Instead of npm packages that break across MCP clients, I put everything on Cloudflare Workers with Streamable HTTP transport. One URL per server, works in any MCP client, globally distributed across 300+ edge locations.

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
- TypeScript/JavaScript

## Architecture choice: why Cloudflare Workers?

1. **Zero cold start** — Workers run at the edge, <100ms latency globally
2. **Free hosting** — Workers free tier is generous (100K requests/day)
3. **No server management** — No Docker, no VPS, no scaling concerns
4. **MCP-native** — Streamable HTTP is perfect for Workers' request/response model

## Pricing (validated against market):

- **Free**: 1,000 calls/month across 3 servers (no credit card needed)
- **Pro ($29/mo)**: 50,000 calls/month across all 9 servers — same price as Composio/Zapier, but 49 specialized tools instead of generic connectors
- **Credit Pack ($29 one-time)**: 5,000 credits, never expire
- **Enterprise ($99/mo)**: 500K calls/month + priority support

For context: Composio charges $29/mo for generic API connectors. Arcade.dev charges $25/mo for 1K calls. We offer 49 specialized AI tools for the same $29.

## Numbers (being transparent):

- Built over ~3 months as a solo developer
- $0 infrastructure cost (Cloudflare free tier + Oracle Cloud free tier)
- 7 historical orders ($172 total) before I restructured pricing
- Currently $0 MRR — this launch is the real start

## Links:

- GitHub: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
- Store: https://product-store.yagami8095.workers.dev
- All 9 server URLs in the README

MIT licensed. Happy to answer questions about building MCP servers on Cloudflare Workers, Streamable HTTP transport, or the economics of running AI tools at $0 infra cost.
