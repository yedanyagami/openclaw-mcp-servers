# Ready to Post: r/ClaudeAI

**Subreddit:** r/ClaudeAI
**Flair:** [Project]
**Title:** I built 49 AI tools as MCP servers on Cloudflare Workers — $0/mo infra, paste a URL and go

---

Hey everyone! Solo developer here. I built 9 MCP servers with 49 specialized tools on Cloudflare Workers edge compute, and the total infrastructure cost is $0/month.

## The Problem

Using Claude Code, Cursor, and Windsurf daily — I kept needing the same utilities: JSON formatting, regex testing, color palettes, timestamp conversion. Installing npm packages per-project is tedious, they break across MCP clients, and they clutter every project.

## The Solution

49 tools across 9 MCP servers on Cloudflare Workers. Streamable HTTP transport means you paste ONE URL into your MCP client config. No npm install, no Docker, no API keys for free tier.

## Quick start (10 seconds):

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

## Pricing

| Tier | Price | What you get |
|------|-------|-------------|
| Free | $0 | 1,000 calls/month, 3 servers |
| Pro | $29/mo | 50,000 calls/month, all 9 servers |
| Enterprise | $99/mo | 500K calls/month + support |

## 🌍 Trilingual docs

Full documentation in English, 繁體中文, and 日本語.

GitHub: https://github.com/yedanyagami/openclaw-mcp-servers (MIT)

Works with Claude Code, Cursor, Windsurf, Cline, and any MCP-compatible client.

**What tools would you want to see added?**
