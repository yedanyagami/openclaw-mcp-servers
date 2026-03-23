# Color Palette MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/color-palette-mcp)](https://smithery.ai/server/@openclaw-ai/color-palette-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-25%2Fday-green)](https://color-palette-mcp.yagami8095.workers.dev/mcp)

> 透過 AI 助手產生配色方案、檢查無障礙對比度、建立 CSS 漸層 -- 設計師和前端工程師的配色幫手。

## 這是什麼？為什麼需要它？

- **選出好看又搭配的顏色比想像中難。** 色彩理論存在是有原因的。這台伺服器用真正的色彩理論（互補色、三等分、類似色、分裂互補）來產生和諧的配色方案，不需要設計學位也能做出專業的配色。
- **無障礙設計不再是選項，而是必要。** WCAG 2.1 規定文字和背景顏色之間要有最低對比度。對比度檢查工具會立即告訴你色彩組合是否通過 AA 或 AAA 標準，不用再另外開無障礙測試網站。
- **在 hex、RGB、HSL 和 Tailwind class 之間切換很麻煩。** 設計師給你 hex 色碼，CSS 用 RGB，框架用 Tailwind class。這台伺服器可以即時在所有格式之間轉換，還能找出任何顏色最接近的 Tailwind 工具類別。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=color-palette&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vY29sb3ItcGFsZXR0ZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

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

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `generate_palette` | 根據基礎色用色彩理論產生和諧配色方案 | 對 AI 說：「用 #3b82f6 當基礎色，產生 5 色互補配色」 |
| `contrast_check` | 檢查兩個顏色之間的 WCAG 2.1 對比度（AA/AAA 是否通過） | 對 AI 說：「白色文字放在 #3b82f6 藍色背景上看得清楚嗎？」 |
| `color_convert` | 在 hex、RGB、HSL 和 CSS 色名之間轉換 | 對 AI 說：「把 #ff6b35 轉成 RGB 和 HSL」 |
| `css_gradient` | 產生可直接貼上的 CSS 漸層程式碼（線性、放射、錐形） | 對 AI 說：「建立一個從海洋藍到夕陽橘的 CSS 漸層」 |
| `tailwind_colors` | 找出任何 hex 色碼最接近的 Tailwind CSS 工具類別 | 對 AI 說：「#3b82f6 最接近哪個 Tailwind class？」 |

## 直接複製使用

### 範例 1：為新專案產生配色方案

對 AI 說：「我在做一個 SaaS 後台，用 #3b82f6 當基礎色產生 5 色互補配色，順便檢查白色文字放在每個顏色上是否符合無障礙標準」

### 範例 2：檢查你的設計是否符合無障礙標準

對 AI 說：「檢查文字色 #333333 和背景色 #f5f5f5 的 WCAG 對比度，有沒有通過 AA 和 AAA？」

### 範例 3：取得 CSS 漸層程式碼

對 AI 說：「建立一個從 #667eea 到 #764ba2 的 CSS 線性漸層，由左到右，可以直接貼進樣式表」

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 25 次/天 |
| Pro | $29/月 | 50,000 次/月 |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這是跑在 Cloudflare Workers 上的雲端服務，把 URL 加到 MCP 設定就能使用。免費方案不需要 API 金鑰。

**Q: 支援哪些色彩理論的配色模式？**
A: 互補色（complementary）、三等分（triadic）、類似色（analogous）、分裂互補（split-complementary）和四角（tetradic）。這五種是實務設計中最實用的配色模式。

**Q: 對比度檢查是依照最新的 WCAG 標準嗎？**
A: 是的。依照 WCAG 2.1 標準檢查一般文字（AA: 4.5:1、AAA: 7:1）和大型文字（AA: 3:1、AAA: 4.5:1）。回應中會包含精確的對比度數值。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
