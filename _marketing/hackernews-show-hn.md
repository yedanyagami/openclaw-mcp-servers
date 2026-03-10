# Hacker News Post Draft — Show HN

**Title:** Show HN: 49 MCP tools on Cloudflare Workers – zero dependencies, zero hosting cost

**URL:** https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers

**Comment (post immediately after submitting):**

Hi HN. I built 9 MCP (Model Context Protocol) servers hosting 49 tools, all running on Cloudflare Workers free tier. Total hosting cost: $0/month.

**The problem I was solving:** Local MCP servers are fragile. They need Node.js, break on version updates, consume RAM, and aren't reachable from cloud-based AI clients. I wanted MCP servers that are always-on, globally distributed, and require zero client-side setup — just a URL.

**Architecture decisions:**

Each server is a single `worker.js` file with zero npm dependencies. No bundler, no build step. Pure JavaScript running on CF Workers runtime (V8 isolates).

- **Protocol:** MCP over Streamable HTTP — standard JSON-RPC 2.0 over HTTPS POST. Every MCP-compatible client (Claude Desktop, Claude Code, Cursor, Windsurf) can connect by adding a URL to config. No websockets, no SSE needed.

- **Storage:** Cloudflare D1 (SQLite at edge) for rate limiting and usage tracking. KV for caching deterministic tool results (JSON formatting, regex compilation, timestamp conversion). Cache hit rate is ~40% on the most-used tools, which keeps D1 reads low.

- **Rate limiting:** Dual-layer approach. In-memory per-isolate counter (fast path) + D1 persistent counter (accurate path). The in-memory counter handles burst protection; D1 is the source of truth checked on a sliding window. Free tier gets 3-20 calls/day per IP depending on tool compute cost.

- **Monetization:** Three tiers — free (rate-limited, no auth), Pro ($9/mo via Stripe, API key auth, 1000 calls/day), and x402 USDC micropayments (experimental, per-call pricing for AI agents that can pay autonomously). The x402 path is the most interesting technically — it uses HTTP 402 Payment Required with a crypto payment flow.

**What the tools do (selected):**

- JSON toolkit: format, validate, diff, JSONPath query, transform, schema generation
- Regex engine: build from natural language, test, explain, extract, replace
- Prompt enhancer: rewrite prompts, analyze quality, generate system prompts
- Timestamp converter: Unix/ISO/relative, timezone math, cron parser
- Color palette: generation, WCAG contrast checks, Tailwind mapping
- AI model comparison: head-to-head benchmarks, pricing breakdowns

**Trade-offs and things I'd do differently:**

1. Single-file workers are great for deployment simplicity but painful past ~800 LOC. I've been considering a minimal build step just for import merging.

2. D1 free tier (5M reads/day, 100K writes/day) is generous but the cold-start latency on first D1 query per isolate is noticeable (~15ms). KV is faster for reads.

3. No websocket/SSE streaming — every tool call is a single request/response. This is fine for the tools I've built but limits what's possible (no progress streaming for long-running operations).

4. CF Workers 10ms CPU limit on free tier means compute-heavy operations (large JSON diffing, complex regex) need careful optimization. I pre-compile and cache aggressively.

**Interesting finding:** The most popular tool by call volume is the fortune/tarot reader, not the developer tools. Make of that what you will.

**Setup (one server example):**

```json
{
  "mcpServers": {
    "json-tools": { "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp" }
  }
}
```

Source: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers

I'm curious what HN thinks about MCP as a protocol. It's essentially giving LLMs a standardized way to call external tools — an "API for AI." What would you build as an MCP server? And is the single-file-no-deps approach sustainable, or should I bite the bullet and add a build step?

---

**Post time:** Tuesday or Thursday 14:00-15:00 UTC
**Key:** Be technical. HN loves architecture details, trade-offs, and honest discussion of limitations. Engage deeply with technical questions. Don't mention pricing unless asked — it's in the repo README. The x402 micropayment angle is the most HN-interesting monetization detail.
