# JSON Toolkit MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/json-toolkit-mcp)](https://smithery.ai/server/@openclaw-ai/json-toolkit-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://json-toolkit-mcp.yagami8095.workers.dev/mcp)

> EN: Format, validate, diff, query, and transform JSON without leaving your AI assistant.
> 繁中: 不用離開 AI 助手就能格式化、驗證、比較、查詢和轉換 JSON。
> 日本語: AIアシスタントから離れずにJSONのフォーマット、検証、比較、クエリ、変換ができます。

## What is this? Why do I need it?

- **JSON is everywhere in programming.** API responses, config files, databases -- they all use JSON. But raw JSON is hard to read, and one missing comma breaks everything. This server formats messy JSON instantly and tells you exactly where errors are (line and column number).
- **Comparing two JSON files by hand is painful.** When your config changed and something broke, you need to know what is different. The diff tool shows you exactly which keys were added, removed, or changed -- no manual scanning required.
- **You need data from deeply nested JSON but do not want to write code.** The query tool lets you use simple path syntax like `$.users[*].name` to pull out exactly the data you need. And the schema generator creates a JSON Schema from any sample data automatically.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=json-toolkit&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vanNvbi10b29sa2l0LW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

Add to your MCP config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/json-toolkit-mcp
```

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `json_format` | Pretty-print or minify JSON with configurable indentation | "Format this JSON with 2-space indent: {\"name\":\"Alice\",\"age\":30}" |
| `json_validate` | Check if JSON is valid and show the exact error location | "Is this valid JSON? {key: value}" |
| `json_diff` | Compare two JSON objects and list all differences | "What changed between these two JSON configs?" |
| `json_query` | Search inside JSON using path syntax like `$.users[0].name` | "Get all the email addresses from this JSON array" |
| `json_transform` | Flatten, unflatten, pick, omit, or rename keys | "Flatten this nested JSON into a single level" |
| `json_schema_generate` | Auto-generate a JSON Schema from sample data | "Generate a JSON Schema from this API response" |

## Copy-Paste Examples

### Example 1: Fix and format a messy API response

Just say to your AI: "Format this JSON and check if it is valid: {\"users\":[{\"name\":\"Alice\",\"scores\":[98,87,95]},{\"name\":\"Bob\",\"scores\":[72,88]}]}"

### Example 2: Find what changed between two config versions

Just say to your AI: "Diff these two JSON objects and tell me what changed: A = {\"debug\": true, \"port\": 3000, \"host\": \"localhost\"} B = {\"debug\": false, \"port\": 8080, \"host\": \"localhost\"}"

### Example 3: Pull specific data from nested JSON

Just say to your AI: "Query $.users[*].email from this JSON and list all the email addresses"

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 20/day |
| Pro | $29/mo | 50,000/month |

## FAQ

**Q: Do I need to install anything?**
A: No. This is a cloud server running on Cloudflare Workers. You just add the URL to your AI client's MCP config and start using it immediately. No npm install, no Docker, no API keys.

**Q: What is the maximum JSON size it can handle?**
A: The server handles JSON payloads up to 1MB on the free tier. This covers the vast majority of API responses and config files. For larger files, consider the Pro plan.

**Q: Does it support JSONPath or jq syntax?**
A: The query tool uses JSONPath-like syntax (`$`, dot notation, wildcards, array slicing). It is not full jq, but it covers the most common query patterns developers need.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)

## License

MIT
