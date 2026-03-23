# Regex Engine MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/regex-engine-mcp)](https://smithery.ai/server/@openclaw-ai/regex-engine-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://regex-engine-mcp.yagami8095.workers.dev/mcp)

> EN: Build, test, and understand regular expressions using plain language through your AI assistant.
> 繁中: 用自然語言透過 AI 助手來建立、測試和理解正規表達式。
> 日本語: AIアシスタントを通じて自然言語で正規表現の作成、テスト、理解ができます。

## What is this? Why do I need it?

- **Regular expressions are powerful but notoriously hard to write.** Most developers Google regex patterns every time they need one. This server lets you describe what you want in plain English -- like "match US phone numbers" -- and it builds a working regex for you.
- **Reading someone else's regex feels like decoding hieroglyphics.** The explain tool breaks down any regex into a step-by-step, human-readable explanation. No more guessing what `^(?:[a-z0-9]+(?:\.[a-z0-9]+)*)@` actually means.
- **Testing regex in a separate tool breaks your workflow.** Instead of switching to regex101.com, you can test patterns, extract matches, and do find-and-replace directly inside your AI assistant while you work.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=regex-engine&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcmVnZXgtZW5naW5lLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

Add to your MCP config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "regex-engine": {
      "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/regex-engine-mcp
```

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `regex_test` | Test a regex pattern against text and return all matches with positions | "Test if this string contains a valid email address" |
| `regex_explain` | Explain any regex pattern in plain English, step by step | "Explain what this regex does: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" |
| `regex_build` | Build a regex from a natural language description | "Build a regex that matches dates in YYYY-MM-DD format" |
| `regex_replace` | Find and replace using regex with capture group support | "Replace all dates from MM/DD/YYYY to YYYY-MM-DD in this text" |
| `regex_extract` | Extract all matching substrings from text | "Extract all URLs from this paragraph" |

## Copy-Paste Examples

### Example 1: Build a regex from a description

Just say to your AI: "Build me a regex that matches email addresses and test it against this text: Contact us at hello@example.com or support@company.co.uk for help."

### Example 2: Understand a regex you found in code

Just say to your AI: "Explain this regex I found in our codebase: (?:(?:\r\n)?[ \t])*(?:(?:[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)"

### Example 3: Extract data from unstructured text

Just say to your AI: "Extract all phone numbers from this text: Call us at (555) 123-4567 or 800-555-0199. International: +44 20 7946 0958"

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 20/day |
| Pro | $29/mo | 50,000/month |

## FAQ

**Q: Do I need to install anything?**
A: No. This runs on Cloudflare Workers. Add the URL to your AI client's MCP config and you are ready. No dependencies, no API keys, no setup.

**Q: Which regex flavor does it use?**
A: JavaScript regex (ECMAScript). This covers 99% of what web developers and general programmers need, including named capture groups, lookaheads, and all standard flags (g, i, m, s, u).

**Q: Can it handle complex patterns like recursive matching?**
A: It handles everything JavaScript regex supports. For truly complex patterns (like balanced parentheses), the build tool will generate the best possible approximation and explain any limitations.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)

## License

MIT
