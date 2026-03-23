# OpenClaw Market Intelligence MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/openclaw-intel-mcp)](https://smithery.ai/server/@openclaw-ai/openclaw-intel-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://openclaw-intel-mcp.yagami8095.workers.dev/mcp)

> EN: Stay ahead of the AI market with on-demand intelligence reports, ecosystem stats, and trend analysis.
> 繁中: 即時掌握 AI 市場情報 -- 產業報告、生態統計、趨勢分析，一鍵取得。
> 日本語: AI市場の最新動向をオンデマンドで取得 -- 業界レポート、エコシステム統計、トレンド分析。

## What is this? Why do I need it?

- **The AI industry changes every week.** New tools launch, companies raise funding, and market dynamics shift constantly. Keeping up manually is exhausting and easy to fall behind on.
- **This server delivers market intelligence directly inside your AI assistant.** Ask a question like "What's happening in the AI coding tools market?" and get a structured report with data, trends, and analysis -- no browser tabs or Google searches needed.
- **It works for developers, founders, and analysts.** Whether you are evaluating competitors, writing a market overview, or just staying informed, you get real data instead of guesswork.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-intel&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctaW50ZWwtbWNwLnlhZ2FtaTgwOTUud29ya2Vycy5kZXYvbWNwIn0=)

### Claude Desktop

Add to your Claude Desktop MCP config (`claude_desktop_config.json`):

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

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `get_ai_market_report` | Get a market intelligence report on any AI topic (Free) | "Give me a market report on AI coding assistants" |
| `get_report_by_id` | Retrieve a specific report by its ID (Pro) | "Pull up report ID intel-2026-03-15" |
| `list_reports` | Browse all available reports with titles and dates (Free) | "What market reports are available?" |
| `get_market_stats` | Live ecosystem stats: users, report count, data freshness (Free) | "Show me the current AI market stats" |
| `purchase_api_key` | Get instructions for purchasing a Pro API key | "How do I upgrade to Pro?" |
| `validate_api_key` | Check if your API key is valid and see remaining quota (Free) | "Check my API key status" |

## Copy-Paste Examples

### Example 1: Get a market overview

Just say to your AI: "Get me an AI market report on the agent framework ecosystem, with detailed depth"

You will receive a structured report covering market size, growth rate, key players, investment signals, and emerging trends -- all formatted and ready to use.

### Example 2: Check what reports exist

Just say to your AI: "List all available market intelligence reports"

You will see a table of reports with titles, dates, and whether they require Free or Pro access.

### Example 3: Get live ecosystem stats

Just say to your AI: "What are the current AI market statistics?"

Returns real-time numbers: total Pro users, number of reports, and how recently the data was updated.

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 10/day |
| Pro | $29/mo | 50,000/month |

## FAQ

**Q: Do I need to install anything on my computer?**
A: No. This is a remote MCP server hosted on Cloudflare Workers. You just add the URL to your MCP client config and it works immediately.

**Q: What kind of data is in the market reports?**
A: Reports include market size estimates, growth rates, key players, competitive positioning, funding signals, technology trends, and forward-looking analysis. Data is refreshed regularly from multiple sources.

**Q: What is the difference between Free and Pro?**
A: Free gives you 10 calls per day and access to the latest market report, stats, and report listing. Pro unlocks access to the full report archive via `get_report_by_id` and higher rate limits.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [Smithery listing](https://smithery.ai/server/@openclaw-ai/openclaw-intel-mcp)

## License

MIT
