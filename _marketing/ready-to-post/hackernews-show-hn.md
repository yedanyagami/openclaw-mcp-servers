# Ready to Post: Hacker News Show HN

**URL to submit:** https://github.com/yedanyagami/openclaw-mcp-servers
**Title:** Show HN: 49 AI Tools as MCP Servers on Cloudflare Workers – $0 Infra Cost

---

**Comment to post after submission:**

I built 9 MCP servers with 49 specialized tools on Cloudflare Workers. Total infrastructure cost: $0/month. Zero setup for users — paste a URL into any MCP client and you're connected.

Why I built this: As a solo developer using Claude Code, Cursor, and Windsurf daily, I kept needing the same utilities — JSON validation, regex testing, color conversion, timestamp parsing. Instead of npm packages that break across MCP clients, I put everything on Cloudflare Workers with Streamable HTTP transport.

What's included (all have free tier):
- JSON Toolkit (6 tools), Regex Engine (5), Color Palette (5), Timestamp Converter (5), Prompt Enhancer (6), Market Intelligence (6), Fortune & Tarot (3), Content Publisher (8), AI Tool Compare (5)

Quick start:
```json
{ "json-toolkit": { "type": "streamable-http", "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp" } }
```

No npm install, no Docker, no API keys for free tier. Pro is $29/mo for all 9 servers.

Tech: Cloudflare Workers free tier, Streamable HTTP (MCP spec 2025-03-26), KV for rate limiting. <100ms latency globally via 300+ edge locations.

MIT licensed. Full trilingual docs (EN/繁中/JP). Happy to answer questions about building MCP servers on Cloudflare Workers.
