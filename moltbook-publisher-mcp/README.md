# MoltBook Content Publisher MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/moltbook-publisher-mcp)](https://smithery.ai/server/@openclaw-ai/moltbook-publisher-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-5%2Fday%2Ftool-green)](https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp)

> 8 Japanese content publishing tools — Markdown, SEO, translation, outlines

Japanese content publishing toolkit for AI agents. Convert Markdown to HTML, optimize for SEO, translate EN to JP, generate article outlines, find trending topics, and cross-post to note.com, Zenn, and Qiita.

## Features

- **Japanese translation** — high-quality EN↔JA translation for content localization
- **SEO analysis** — keyword density, readability score, and optimization suggestions
- **Content generation** — blog posts, social media, and marketing copy
- **Markdown formatting** — clean output ready for publishing
- **Multi-platform** — optimized for blogs, social media, and documentation
- **AI-powered** — leverages LLM for natural, engaging content

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=moltbook-publisher&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "moltbook-publisher": {
      "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/moltbook-publisher-mcp
```

## Tools (8)

| Tool | Description |
|------|-------------|
| `convert_markdown_to_html` | Convert Markdown to platform-compatible HTML (note.com, Zenn, Qiita) |
| `optimize_for_seo` | SEO optimization for Japanese articles — title, meta, keywords, readability |
| `translate_en_to_jp` | Natural English to Japanese translation (not machine — native-sounding) |
| `generate_article_outline` | Generate structured article outlines with H2/H3, key points, word count |
| `get_trending_topics` | Find currently trending topics in the Japanese tech/AI community |
| `cross_post_format` | Format articles for cross-posting across multiple Japanese platforms |
| `analyze_article_performance` | Analyze article metrics and suggest improvements |
| `purchase_pro_key` | Get Pro API key for higher rate limits |

## Examples

### Translate to Japanese
```json
// Input
{"text": "Build amazing AI agents with MCP servers", "target_lang": "ja"}

// Output
{"translated": "MCPサーバーで素晴らしいAIエージェントを構築しよう", "source_lang": "en", "confidence": 0.95}
```

### SEO Analysis
```json
// Input
{"content": "How to use AI for productivity", "keywords": ["AI", "productivity", "tools"]}

// Output
{"seo_score": 72, "keyword_density": {"AI": 2.1, "productivity": 1.8}, "suggestions": ["Add more headers", "Include internal links", "Extend to 1500+ words"]}
```

### Generate Content
```json
// Input
{"topic": "MCP servers for AI agents", "format": "blog", "length": "medium"}

// Output
{"title": "Why Every AI Agent Needs MCP Servers in 2025", "content": "...", "word_count": 850, "reading_time": "4 min"}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 5/day/tool | $0 |
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
Endpoint: https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp
Transport: Streamable HTTP (POST)
Auth: None required (free tier) | X-API-Key header (Pro tier)
```

## Keywords

`Japanese`, `content`, `publishing`, `SEO`, `translation`, `note.com`, `Zenn`, `Qiita`

## License

MIT
