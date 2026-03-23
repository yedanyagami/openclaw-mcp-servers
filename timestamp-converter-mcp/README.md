# Timestamp Converter MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/timestamp-converter-mcp)](https://smithery.ai/server/@openclaw-ai/timestamp-converter-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-30%2Fday-green)](https://timestamp-converter-mcp.yagami8095.workers.dev/mcp)

> EN: Convert timestamps, handle timezone math, parse cron expressions, and calculate date differences through your AI assistant.
> 繁中: 透過 AI 助手轉換時間戳記、處理時區計算、解析 cron 表達式、計算日期差異。
> 日本語: AIアシスタントでタイムスタンプ変換、タイムゾーン計算、cron式解析、日付差分計算ができます。

## What is this? Why do I need it?

- **Working with dates and timezones is one of the most error-prone tasks in programming.** Is `1710000000` March 9 or March 10? Depends on the timezone. This server converts between Unix timestamps, ISO 8601, and human-readable formats instantly, so you always know exactly what time a timestamp represents.
- **Timezone math is confusing and easy to get wrong.** When your server is in UTC, your users are in Tokyo, and your logs say 14:30 -- what time is that locally? The timezone converter handles 400+ IANA timezones and shows you the offset so there is no ambiguity.
- **Cron expressions look like random numbers until you learn them.** Instead of memorizing that `*/15 9-17 * * 1-5` means "every 15 minutes during business hours on weekdays," the parser gives you a plain-English explanation and the next 5 scheduled run times.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=timestamp-converter&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vdGltZXN0YW1wLWNvbnZlcnRlci1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

Add to your MCP config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "timestamp-converter": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/timestamp-converter-mcp
```

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `convert_timestamp` | Convert between Unix epoch, ISO 8601, human-readable, and relative time | "Convert Unix timestamp 1710000000 to a human-readable date" |
| `timezone_convert` | Convert a datetime between any two IANA timezones | "What time is 2024-03-15 14:30 UTC in Tokyo and New York?" |
| `parse_cron` | Explain a cron expression in plain English and show next run times | "What does this cron do: */15 9-17 * * 1-5" |
| `time_diff` | Calculate the difference between two dates in multiple units | "How many days between January 1 and March 15, 2024?" |
| `format_duration` | Convert seconds or milliseconds to human-readable duration | "Format 90061 seconds as a readable duration" |

## Copy-Paste Examples

### Example 1: Debug a timestamp from your logs

Just say to your AI: "Convert this Unix timestamp to a human-readable date in my timezone (Asia/Taipei): 1710000000"

### Example 2: Figure out meeting times across timezones

Just say to your AI: "I have a meeting at 2024-03-20 10:00 AM in San Francisco. What time is that in Tokyo, London, and New York?"

### Example 3: Understand a cron schedule

Just say to your AI: "Explain this cron expression and tell me the next 5 run times: 0 2 * * 0"

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 30/day |
| Pro | $29/mo | 50,000/month |

## FAQ

**Q: Do I need to install anything?**
A: No. This runs on Cloudflare Workers. Add the URL to your MCP config and start converting timestamps immediately. No API key needed for the free tier.

**Q: Which timezones are supported?**
A: All 400+ IANA timezones (like `America/New_York`, `Asia/Tokyo`, `Europe/London`). These are the standard timezone identifiers used by every major programming language and operating system.

**Q: Does it handle daylight saving time correctly?**
A: Yes. The server uses IANA timezone data which includes all DST transition rules. When you convert across timezones, DST offsets are applied automatically based on the specific date.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)

## License

MIT
