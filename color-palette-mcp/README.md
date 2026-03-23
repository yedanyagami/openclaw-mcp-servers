# Color Palette MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/color-palette-mcp)](https://smithery.ai/server/@openclaw-ai/color-palette-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-25%2Fday-green)](https://color-palette-mcp.yagami8095.workers.dev/mcp)

> EN: Generate color palettes, check accessibility contrast, and create CSS gradients through your AI assistant.
> 繁中: 透過 AI 助手產生配色方案、檢查無障礙對比度、建立 CSS 漸層。
> 日本語: AIアシスタントでカラーパレット生成、アクセシビリティコントラスト確認、CSSグラデーション作成ができます。

## What is this? Why do I need it?

- **Choosing colors that look good together is harder than it sounds.** Color theory exists for a reason. This server generates harmonious palettes using real color theory (complementary, triadic, analogous, split-complementary) so your designs look professional without a design degree.
- **Accessibility is not optional anymore.** WCAG 2.1 requires minimum contrast ratios between text and background colors. The contrast checker instantly tells you if your color combination passes AA or AAA standards -- no need to visit a separate accessibility testing site.
- **Switching between hex, RGB, HSL, and Tailwind classes is tedious.** Designers give you hex codes, your CSS uses RGB, your framework uses Tailwind classes. This server converts between all formats instantly and finds the closest Tailwind utility class for any color.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=color-palette&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vY29sb3ItcGFsZXR0ZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

Add to your MCP config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "color-palette": {
      "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/color-palette-mcp
```

## Tools

| Tool | What it does | Example prompt |
|------|-------------|----------------|
| `generate_palette` | Create a harmonious color palette from a base color using color theory | "Generate a 5-color palette based on #3b82f6 using complementary harmony" |
| `contrast_check` | Check WCAG 2.1 contrast ratio between two colors (AA/AAA pass/fail) | "Is white text readable on a #3b82f6 blue background?" |
| `color_convert` | Convert between hex, RGB, HSL, and CSS named colors | "Convert #ff6b35 to RGB and HSL" |
| `css_gradient` | Generate ready-to-paste CSS gradient code (linear, radial, conic) | "Create a CSS gradient from ocean blue to sunset orange" |
| `tailwind_colors` | Find the closest Tailwind CSS utility class for any hex color | "What Tailwind class is closest to #3b82f6?" |

## Copy-Paste Examples

### Example 1: Generate a palette for a new project

Just say to your AI: "I'm building a SaaS dashboard. Generate a professional 5-color palette based on #3b82f6 with complementary harmony, and check if white text is accessible on each color."

### Example 2: Check if your design is accessible

Just say to your AI: "Check the WCAG contrast ratio between my text color #333333 and background color #f5f5f5. Does it pass AA and AAA?"

### Example 3: Get CSS gradient code

Just say to your AI: "Create a CSS linear gradient from #667eea to #764ba2 going left to right, ready to paste into my stylesheet"

## Plans

| Plan | Cost | Calls |
|------|------|-------|
| Free | $0 | 25/day |
| Pro | $29/mo | 50,000/month |

## FAQ

**Q: Do I need to install anything?**
A: No. This is a cloud service on Cloudflare Workers. Add the URL to your MCP config and start using it. No API key required for the free tier.

**Q: What color theory harmonies are supported?**
A: Complementary, triadic, analogous, split-complementary, and tetradic. These are the five most useful harmonies for real-world design work.

**Q: Does the contrast checker follow the latest WCAG standards?**
A: Yes. It checks against WCAG 2.1 criteria for both normal text (AA: 4.5:1, AAA: 7:1) and large text (AA: 3:1, AAA: 4.5:1). The exact contrast ratio is always included in the response.

## Links

- [Main repo](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [All 9 servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)

## License

MIT
