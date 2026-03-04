# Color Palette MCP Server

[![Smithery](https://smithery.ai/badge/@openclaw-ai/color-palette-mcp)](https://smithery.ai/server/@openclaw-ai/color-palette-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-25%2Fday-green)](https://color-palette-mcp.yagami8095.workers.dev/mcp)

> 5 color & design tools for AI agents — palettes, WCAG, CSS gradients

Generate harmonious color palettes, check WCAG accessibility contrast, convert between color formats, create CSS gradients, and get Tailwind color mappings.

## Features

- **Color theory palettes** — complementary, triadic, analogous, split-complementary, tetradic
- **WCAG 2.1 contrast** — instant AA/AAA pass/fail for accessibility compliance
- **Format conversion** — hex, RGB, HSL, CSS named colors, all interchangeable
- **CSS gradients** — generate linear, radial, and conic gradient code ready to paste
- **Tailwind mapping** — find the nearest Tailwind CSS utility class for any color
- **Designer-friendly** — human-readable color names included in results

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=color-palette&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

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

## Tools (5)

| Tool | Description |
|------|-------------|
| `generate_palette` | Generate harmonious palettes using color theory (complementary, triadic, analogous, etc.) |
| `contrast_check` | WCAG 2.1 accessibility contrast ratio checker — AA/AAA pass/fail |
| `color_convert` | Convert colors between hex, RGB, HSL, and CSS named colors |
| `css_gradient` | Generate ready-to-use CSS gradient code (linear, radial, conic) |
| `tailwind_colors` | Map any hex color to the nearest Tailwind CSS color class |

## Examples

### Generate a Palette
```json
// Input
{"base_color": "#3b82f6", "harmony": "complementary", "count": 5}

// Output
{
  "palette": ["#3b82f6", "#f6a93b", "#3bf6d4", "#f63b82", "#82f63b"],
  "harmony": "complementary",
  "names": ["Royal Blue", "Amber", "Turquoise", "Hot Pink", "Lime"]
}
```

### Check WCAG Contrast
```json
// Input
{"foreground": "#ffffff", "background": "#3b82f6"}

// Output
{"ratio": 3.44, "AA_normal": false, "AA_large": true, "AAA_normal": false, "AAA_large": false}
```

### Convert Colors
```json
// Input
{"color": "#ff6b35", "to_format": "hsl"}

// Output
{"hex": "#ff6b35", "rgb": "rgb(255, 107, 53)", "hsl": "hsl(16, 100%, 60%)"}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 25/day | $0 |
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
Endpoint: https://color-palette-mcp.yagami8095.workers.dev/mcp
Transport: Streamable HTTP (POST)
Auth: None required (free tier) | X-API-Key header (Pro tier)
```

## Keywords

`color`, `palette`, `design`, `WCAG`, `accessibility`, `CSS`, `gradient`, `tailwind`

## License

MIT
