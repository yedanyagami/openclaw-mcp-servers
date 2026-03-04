# Prompt Enhancer MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/prompt-enhancer-mcp)](https://smithery.ai/server/@openclaw-ai/prompt-enhancer-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday free, 100 Pro-green)](https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp)

> 6 prompt engineering tools — enhance, analyze, convert, generate, 30+ templates

Optimize prompts for AI models. Enhance basic prompts, analyze quality scores, convert between formats, generate system prompts, and browse 30+ curated templates.

## Features

- **Prompt scoring** — rate prompt quality 0-100 with specific improvement suggestions
- **One-click enhance** — transform vague prompts into detailed, effective instructions
- **Format conversion** — switch between plain text, XML, markdown, and JSON prompt formats
- **System prompt generator** — create role-specific system prompts for any use case
- **30+ templates** — production-ready prompt templates organized by category
- **Before/after scores** — see exactly how much your prompt improved

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-enhancer&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "prompt-enhancer": {
      "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/prompt-enhancer-mcp
```

## Tools (6)

| Tool | Description |
|------|-------------|
| `enhance_prompt` | Optimize a basic prompt with clearer instructions and better structure |
| `analyze_prompt` | Score prompt quality (0-100): clarity, specificity, issues, improvements |
| `convert_prompt_format` | Convert prompts between plain, XML, markdown, and JSON formats |
| `generate_system_prompt` | Generate high-quality system prompts for any role and task |
| `prompt_template_library` | Browse 30+ production-ready templates by category |
| `purchase_pro_key` | Get Pro API key for higher rate limits |

## Examples

### Enhance a Prompt
```json
// Input
{"prompt": "Write a blog post about AI", "style": "structured"}

// Output
{
  "enhanced": "Write a comprehensive 1500-word blog post about artificial intelligence...",
  "improvements": ["Added specific word count", "Defined target audience", "Structured with sections", "Added tone guidance"],
  "score_before": 25,
  "score_after": 82
}
```

### Analyze Prompt Quality
```json
// Input
{"prompt": "Tell me about dogs"}

// Output
{"score": 18, "clarity": 30, "specificity": 10, "issues": ["Too vague", "No context", "No format specified"], "suggestions": ["Specify breed or topic", "Add desired length", "Define target audience"]}
```

### Generate System Prompt
```json
// Input
{"role": "customer support agent", "task": "Handle refund requests", "tone": "professional"}

// Output
{"system_prompt": "You are a professional customer support agent specialized in handling refund requests...", "tokens": 156}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 10/day free, 100 Pro | $0 |
| Pro | 1000/day | $9 one-time |
| x402 | Pay-per-call | $0.05 USDC |

Get a free 7-day Pro trial: [Start Trial](https://product-store.yagami8095.workers.dev/auth/login)

## Part of OpenClaw MCP Ecosystem

This server is one of **9 MCP servers** with **49 tools** total. All run on Cloudflare Workers with Streamable HTTP transport.

| Server | Tools | Description |
|--------|-------|-------------|
| [JSON Toolkit](https://json-toolkit-mcp.yagami8095.workers.dev/mcp) | 6 | Format, validate, diff, query, transform JSON |
| [Regex Engine](https://regex-engine-mcp.yagami8095.workers.dev/mcp) | 5 | Test, explain, build, replace, extract with regex |
| [Color Palette](https://color-palette-mcp.yagami8095.workers.dev/mcp) | 5 | Palettes, WCAG contrast, CSS gradients |
| [Timestamp Converter](https://timestamp-converter-mcp.yagami8095.workers.dev/mcp) | 5 | Timezone math, cron parsing, duration formatting |
| [Prompt Enhancer](https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp) | 6 | Optimize prompts, 30+ templates, quality scoring |
| [Market Intelligence](https://openclaw-intel-mcp.yagami8095.workers.dev/mcp) | 6 | AI market trends, reports, competitor analysis |
| [Fortune & Tarot](https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp) | 3 | Daily zodiac horoscopes + tarot readings |
| [Content Publisher](https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp) | 8 | Japanese content tools, SEO, translation |
| [AI Tool Compare](https://agentforge-compare-mcp.yagami8095.workers.dev/mcp) | 5 | Compare Claude Code, Cursor, Copilot, Devin |

## Transport

This server uses **Streamable HTTP** transport (MCP 2025-03-26 spec). No WebSocket, no stdio — just a single HTTPS endpoint. Works with any MCP client that supports HTTP transport.

```
Endpoint: https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp
Transport: Streamable HTTP (POST)
Auth: None required (free tier) | X-API-Key header (Pro tier)
```

## Keywords

`prompt`, `engineering`, `enhance`, `optimize`, `template`, `system prompt`, `AI`

## License

MIT
