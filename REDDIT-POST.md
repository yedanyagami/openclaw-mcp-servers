# [Project] I built 49 AI tools as MCP servers on Cloudflare Workers — $0/mo infra, paste a URL and go

Hey everyone! Solo developer here. I built 9 MCP servers with 49 specialized tools on Cloudflare Workers edge compute, and the total infrastructure cost is $0/month. Wanted to share the project and what I learned.

## The Problem

Using Claude Code (71% of AI agent users btw), Cursor, and Windsurf daily — I kept needing the same utilities: JSON formatting, regex testing, color palettes, timestamp conversion. Installing npm packages per-project is tedious, they break across MCP clients, and they clutter every project.

## The Solution

49 tools across 9 MCP servers on Cloudflare Workers. Streamable HTTP transport means you paste ONE URL into your MCP client config. No npm install, no Docker, no API keys for free tier. Works globally with <100ms latency (300+ edge PoPs).

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

## Pricing (market-validated)

| Tier | Price | What you get |
|------|-------|-------------|
| Free | $0 | 1,000 calls/month, 3 servers |
| Pro | $29/mo | 50,000 calls/month, all 9 servers |
| Credit Pack | $29 one-time | 5,000 credits (never expire) |
| Enterprise | $99/mo | 500K calls/month + support |

For comparison: Composio charges $29/mo for generic connectors. We charge $29/mo for 49 specialized AI tools.

## Being transparent about numbers

- Built over ~3 months solo
- $0 infrastructure cost
- 7 historical orders, $172 total revenue
- Currently rebuilding from $0 MRR after payment restructuring

GitHub: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers (MIT)
Store: https://product-store.yagami8095.workers.dev

Works with Claude Code, Cursor, Windsurf, Cline, and any MCP-compatible client.

**What tools would you want to see added?** I'm looking for the utilities you reach for most often when coding with AI assistants.

---

**Best subreddits to post:**
- r/ClaudeAI (primary — 71% of AI agent users use Claude Code)
- r/MCP
- r/LocalLLaMA
- r/ChatGPTCoding
- r/SideProject
- r/webdev
- r/indiehackers
