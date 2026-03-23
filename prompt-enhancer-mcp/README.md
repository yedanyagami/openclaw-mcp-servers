# Prompt Enhancer MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/prompt-enhancer-mcp)](https://smithery.ai/server/@openclaw-ai/prompt-enhancer-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday free, 100 Pro-green)](https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp)

> EN: Score, improve, and generate AI prompts -- a writing coach for human-to-AI communication.
> 繁中: 評分、改善、產生 AI 提示詞 -- 人類與 AI 溝通的寫作教練。
> 日本語: AIプロンプトの採点、改善、生成 -- 人間とAIのコミュニケーションのための文章コーチ。

## What is this? Why do I need it?

- **Better prompts get dramatically better AI results.** The difference between "write about AI" and a well-structured prompt can be a 10x improvement in output quality. This server analyzes your prompts, scores them 0-100, and tells you exactly what to improve -- like having a prompt engineering expert on call.
- **Writing system prompts from scratch is time-consuming.** Whether you need a customer support agent, code reviewer, or creative writer, the system prompt generator creates production-ready prompts tailored to your specific role and task in seconds.
- **Prompt formats vary between AI tools and frameworks.** Some use XML tags, some use markdown headers, some use JSON. The format converter switches between plain text, XML, markdown, and JSON so you can reuse your prompts across different AI platforms.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-enhancer&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcHJvbXB0LWVuaGFuY2VyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

Add to your MCP config file (`claude_desktop_config.json`):

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

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `enhance_prompt` (Free) | Rewrite a vague prompt into a clear, detailed, effective one | "Enhance this prompt: Write a blog post about AI" |
| `analyze_prompt` (Free) | Score prompt quality 0-100 with specific improvement suggestions | "Analyze and score this prompt: Tell me about dogs" |
| `convert_prompt_format` (Free) | Convert prompts between plain text, XML, markdown, and JSON | "Convert this prompt to XML format for Claude" |
| `generate_system_prompt` (Free) | Generate a role-specific system prompt for any use case | "Generate a system prompt for a senior code reviewer" |
| `prompt_template_library` (Pro) | Browse 30+ production-ready prompt templates by category | "Show me all prompt templates for content writing" |
| `purchase_pro_key` | Get a Pro API key for higher rate limits and template access | "How do I upgrade to Pro?" |

## Copy-Paste Examples

### Example 1: Improve a weak prompt

Just say to your AI: "Analyze this prompt and then enhance it: Write something about machine learning for my blog"

### Example 2: Generate a system prompt for a new AI agent

Just say to your AI: "Generate a system prompt for a professional customer support agent that handles refund requests with a friendly but firm tone"

### Example 3: Convert a prompt for a different AI tool

Just say to your AI: "Convert this plain text prompt to XML format so I can use it with Claude: You are a helpful coding assistant. Always explain your reasoning step by step. Use examples when possible."

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 10/day (4 tools) |
| Pro | $29/mo | 50,000/month (all 6 tools) |

## FAQ

**Q: Do I need to install anything?**
A: No. This runs on Cloudflare Workers. Add the URL to your MCP config and start improving your prompts. The free tier works immediately with no API key.

**Q: What makes a prompt score high vs. low?**
A: The analyzer evaluates clarity (is it unambiguous?), specificity (does it define scope, format, length?), structure (does it have context and constraints?), and completeness (does it cover edge cases?). A score of 80+ means the prompt is production-quality.

**Q: Which 4 tools are free and which require Pro?**
A: `enhance_prompt`, `analyze_prompt`, `convert_prompt_format`, and `generate_system_prompt` are completely free (10 calls/day). The `prompt_template_library` with 30+ curated templates requires a Pro key. `purchase_pro_key` helps you upgrade.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)

## License

MIT
