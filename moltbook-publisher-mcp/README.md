# MoltBook Content Publisher MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/moltbook-publisher-mcp)](https://smithery.ai/server/@openclaw-ai/moltbook-publisher-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-5%2Fday%2Ftool-green)](https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp)

> EN: Publish to note.com, Zenn, and Qiita -- translate, SEO-optimize, and cross-post Japanese tech content from your AI assistant.
> 繁中: 在 note.com、Zenn、Qiita 上發布文章 -- 翻譯、SEO 優化、跨平台發文，全部在 AI 助手內完成。
> 日本語: note.com・Zenn・Qiitaへの記事公開 -- 翻訳、SEO最適化、クロスポストをAIアシスタントから直接実行。

## What is this? Why do I need it?

- **Publishing content on Japanese platforms is a pain.** Each platform (note.com, Zenn, Qiita) has its own formatting rules, and writing in natural-sounding Japanese is difficult if it is not your first language.
- **This server handles the entire publishing workflow.** Convert Markdown to platform-compatible HTML, translate English to natural Japanese, optimize for SEO, and format for cross-posting -- all through simple prompts to your AI assistant.
- **It saves hours of manual work for content creators and developers.** Instead of switching between translation tools, SEO checkers, and formatters, you do everything in one place inside Claude Desktop or Cursor.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=moltbook-publisher&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vbW9sdGJvb2stcHVibGlzaGVyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

Add to your Claude Desktop MCP config (`claude_desktop_config.json`):

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

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `convert_markdown_to_html` | Convert Markdown to platform-compatible HTML (Free) | "Convert this Markdown article to HTML for Zenn" |
| `optimize_for_seo` | Analyze and improve SEO for Japanese articles (Free) | "Check the SEO of this article about AI agents" |
| `translate_en_to_jp` | Translate English to natural-sounding Japanese (Free) | "Translate this blog post into Japanese" |
| `generate_article_outline` | Create a structured outline with headings and key points (Free) | "Generate an article outline about MCP servers for beginners" |
| `get_trending_topics` | Find what is trending in Japanese tech communities (Pro) | "What topics are trending on Zenn and Qiita right now?" |
| `cross_post_format` | Format one article for multiple Japanese platforms at once (Pro) | "Format this article for both note.com and Qiita" |
| `analyze_article_performance` | Get performance metrics and improvement suggestions (Pro) | "Analyze the performance of this published article" |
| `purchase_pro_key` | Get instructions for purchasing a Pro API key | "How do I get a Pro key for MoltBook?" |

## Copy-Paste Examples

### Example 1: Translate and publish a blog post

Just say to your AI: "Translate this English blog post about building AI agents into natural Japanese, then convert it to HTML formatted for note.com"

Your AI will first translate the content into native-sounding Japanese, then convert the Markdown into platform-compatible HTML ready to paste into note.com's editor.

### Example 2: SEO-check before publishing

Just say to your AI: "Analyze the SEO of this article about MCPサーバー and suggest improvements for better ranking on Japanese search engines"

You will get a score, keyword density analysis, and specific suggestions like adding headers, improving meta descriptions, or adjusting word count.

### Example 3: Generate an article from scratch

Just say to your AI: "Create an article outline about how to use MCP servers with Claude Desktop, targeting Japanese developers on Qiita"

Returns a structured outline with H2/H3 headings, key points for each section, and a recommended word count.

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 5/day |
| Pro | $29/mo | 50,000/month |

## FAQ

**Q: Do I need to install anything on my computer?**
A: No. This is a remote MCP server hosted on Cloudflare Workers. Just add the URL to your MCP client config and start using it immediately.

**Q: How good is the English-to-Japanese translation?**
A: The translation aims for natural, native-sounding Japanese rather than literal machine translation. It is suitable for blog posts, technical articles, and marketing content targeting Japanese readers.

**Q: Which platforms are supported for cross-posting?**
A: note.com, Zenn, and Qiita. The `cross_post_format` tool adjusts formatting, front matter, and HTML structure for each platform's requirements.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [Smithery listing](https://smithery.ai/server/@openclaw-ai/moltbook-publisher-mcp)

## License

MIT
