# AgentForge AI Tool Compare MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/agentforge-compare-mcp)](https://smithery.ai/server/@openclaw-ai/agentforge-compare-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://agentforge-compare-mcp.yagami8095.workers.dev/mcp)

> EN: Compare Claude Code, Cursor, Copilot, Devin, and more -- side-by-side features, pricing, and recommendations.
> 繁中: 比較 Claude Code、Cursor、Copilot、Devin 等 AI 工具 -- 功能對照、定價分析、選擇建議。
> 日本語: Claude Code・Cursor・Copilot・Devinなどを徹底比較 -- 機能対照、価格分析、おすすめ提案。

## What is this? Why do I need it?

- **There are too many AI coding tools and it is hard to tell them apart.** Claude Code, Cursor, GitHub Copilot, Windsurf, Devin, Aider, Cline -- each claims to be the best, and pricing models vary wildly.
- **This server gives your AI assistant the ability to compare tools on real data.** Ask "How does Cursor compare to Claude Code?" and get a structured breakdown of features, pricing, strengths, and weaknesses instead of vague opinions.
- **It helps you make informed decisions before committing to a subscription.** Whether you are a solo developer choosing your first AI tool or a team lead evaluating options, you get clear, comparable data.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=agentforge-compare&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vYWdlbnRmb3JnZS1jb21wYXJlLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

Add to your Claude Desktop MCP config (`claude_desktop_config.json`):

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

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `compare_ai_tools` | Side-by-side comparison of 2 or more AI tools (Free) | "Compare Claude Code vs Cursor vs Copilot" |
| `get_tool_profile` | Detailed profile with features, pricing, pros, and cons (Free) | "Give me the full profile of Devin" |
| `recommend_tool` | AI-powered recommendation based on your specific needs (Pro) | "Which AI coding tool is best for a Python backend developer?" |
| `get_pricing_comparison` | Pricing breakdown for all tracked AI coding tools (Free) | "Show me pricing for all AI coding assistants" |
| `purchase_pro_key` | Get instructions for purchasing a Pro API key | "How do I upgrade to Pro for recommendations?" |

## Copy-Paste Examples

### Example 1: Compare two tools before buying

Just say to your AI: "Compare Claude Code and Cursor side by side -- features, pricing, strengths, and weaknesses"

You will get a structured comparison table showing how each tool performs on speed, accuracy, cost, supported languages, and IDE integration, with a summary of which tool is better for what.

### Example 2: Get a detailed profile of a specific tool

Just say to your AI: "Tell me everything about Windsurf -- pricing, what it's good at, what it's bad at, and who should use it"

Returns a complete profile including pricing tiers, key features, known limitations, ideal use cases, and how it compares to alternatives.

### Example 3: See all pricing at a glance

Just say to your AI: "Show me a pricing comparison of all AI coding tools -- Copilot, Cursor, Claude Code, Devin, Aider, and Cline"

Returns a clean table with monthly costs, free tier details, and what each pricing tier includes.

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 10/day |
| Pro | $29/mo | 50,000/month |

## FAQ

**Q: Do I need to install anything on my computer?**
A: No. This is a remote MCP server hosted on Cloudflare Workers. Add the URL to your MCP client config and it works immediately. No downloads, no API keys for the free tier.

**Q: Which AI tools are tracked?**
A: Currently: Claude Code, Cursor, GitHub Copilot, Windsurf, Devin, Aider, Cline, and SWE-agent. More tools are added as they become relevant.

**Q: How current is the data?**
A: Tool profiles and pricing data are updated regularly. If a tool releases a major update or changes pricing, the data is refreshed to reflect it.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [Smithery listing](https://smithery.ai/server/@openclaw-ai/agentforge-compare-mcp)

## License

MIT
