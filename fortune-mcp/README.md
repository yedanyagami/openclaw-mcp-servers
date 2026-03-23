# OpenClaw Fortune & Tarot MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/fortune-mcp)](https://smithery.ai/server/@openclaw-ai/fortune-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-50%2Fday-green)](https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp)

> EN: Daily horoscopes, tarot readings, and zodiac rankings for all 12 signs -- add fun to any AI chat.
> 繁中: 每日星座運勢、塔羅牌解讀、十二星座排行 -- 讓你的 AI 聊天更有趣。
> 日本語: 12星座の毎日の占い、タロットリーディング、星座ランキング -- AIチャットに楽しさをプラス。

## What is this? Why do I need it?

- **People love daily horoscopes.** If you are building a chatbot, content feed, or daily newsletter, fortune content drives engagement and gives users a reason to come back every day.
- **This server gives your AI assistant fortune-telling abilities.** Ask for any zodiac sign's daily reading and get scores for love, work, health, and money, plus a tarot card interpretation and lucky numbers.
- **It is completely free and requires zero setup.** 50 free calls per day, no API key needed, and it works with Claude Desktop, Cursor, or any MCP-compatible client out of the box.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=fortune&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctZm9ydHVuZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

Add to your Claude Desktop MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/fortune-mcp
```

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `get_daily_fortune` | Get today's horoscope + tarot card for a specific zodiac sign | "What's my horoscope for Aries today?" |
| `get_fortune_ranking` | See which zodiac signs are luckiest today, ranked 1-12 | "Which zodiac sign has the best luck today?" |
| `get_all_fortunes` | Get the full fortune data for all 12 signs at once | "Show me today's horoscope for every zodiac sign" |

## Copy-Paste Examples

### Example 1: Check your daily fortune

Just say to your AI: "What's today's fortune for Leo? Include the tarot card reading and lucky numbers"

You will get a complete reading with scores for love, work, health, and money, a tarot card with its interpretation, and your lucky numbers for the day.

### Example 2: Find the luckiest sign today

Just say to your AI: "Rank all 12 zodiac signs by today's fortune -- who's the luckiest?"

Returns a ranked list from 1 to 12 with overall scores, so you can see which signs are having the best day.

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 50/day |
| Pro | $29/mo | 50,000/month |

## FAQ

**Q: Do I need to install anything on my computer?**
A: No. This is a remote MCP server hosted on Cloudflare Workers. You just add the URL to your MCP client config and it works immediately. No downloads, no dependencies.

**Q: Which zodiac signs are supported?**
A: All 12: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, and Pisces. Just ask by name.

**Q: Can I use this for a chatbot or app?**
A: Absolutely. The 50 free calls per day are enough for personal chatbots and small projects. For higher-traffic applications, upgrade to Pro.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [Smithery listing](https://smithery.ai/server/@openclaw-ai/fortune-mcp)

## License

MIT
