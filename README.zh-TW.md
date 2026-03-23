<p align="center">
  <h1 align="center">OpenClaw MCP 伺服器</h1>
  <p align="center"><strong>49 個 AI 工具 · 9 台伺服器 · 免費開始 · 30 秒完成連接</strong></p>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Streamable_HTTP-blue" alt="MCP"></a>
  <a href="https://workers.cloudflare.com"><img src="https://img.shields.io/badge/Cloudflare-Workers-orange" alt="CF"></a>
  <a href="#可用的-mcp-伺服器"><img src="https://img.shields.io/badge/伺服器-9-green" alt="9"></a>
  <a href="#可用的-mcp-伺服器"><img src="https://img.shields.io/badge/工具-49-green" alt="49"></a>
</p>

<p align="center">
  <a href="#快速開始">快速開始</a> &bull;
  <a href="#可用的-mcp-伺服器">全部 49 個工具</a> &bull;
  <a href="#方案--使用方式">方案與價格</a> &bull;
  <a href="#常見問題">常見問題</a> &bull;
  <a href="README.md">English</a> &bull;
  <a href="README.ja.md">日本語</a>
</p>

---

## OpenClaw 是什麼？

OpenClaw 是一套 **9 個可以直接使用的 AI 工具伺服器**，只要你的 AI 助手支援 [MCP（Model Context Protocol）](https://modelcontextprotocol.io)，就能馬上連接使用。

- **不需要安裝任何東西。** 每台伺服器都跑在 Cloudflare 的全球邊緣網路上，你只需要把一個網址貼到 AI 工具的設定裡就好。
- **免費就能開始。** 每台伺服器都有免費額度，不需要信用卡、不需要 API 金鑰、不需要註冊帳號。
- **49 個實用工具**，涵蓋日常需求：格式化 JSON、建立正則表達式、產生配色方案、轉換時間戳記、優化提示詞等等。

簡單來說，就像幫你的 AI 助手裝上新技能——連接之後直接問就好。

---

## 為什麼選擇 OpenClaw？

| | OpenClaw | 一般 MCP 伺服器 |
|--|----------|---------------|
| **設定時間** | 貼上網址（30 秒） | 安裝套件、設定、重新啟動 |
| **主機管理** | Cloudflare 邊緣運算（全球 300+ 節點） | 自己架設或用 Docker |
| **穩定性** | 全球 CDN，自動容錯 | 看你的基礎設施 |
| **延遲** | <100ms（邊緣運算） | 200-500ms（集中式） |
| **免費方案** | 有，不用註冊 | 大多需要 API 金鑰 |
| **升級方案** | 月付 $29 就能用全部 9 台 | 按伺服器各別收費 |

---

## 適合誰？

- **AI 新手** — 想要好用的工具但不想搞複雜設定
- **開發者** — 需要 JSON、正則、配色、時間戳記等工具整合進 AI 工作流程
- **內容創作者** — 需要提示詞優化、SEO 分析、多語言發布工具
- **團隊** — 想要一套穩定、有管理的 MCP 伺服器，價格透明

基本使用不需要寫程式。

---

## 你可以用它做什麼？

連接之後，直接用中文或英文對 AI 助手說：

| 用途 | 範例提示詞 |
|------|-----------|
| 整理雜亂的 JSON | *「幫我格式化這段 JSON，顯示錯誤位置」* |
| 建立正則表達式 | *「建一個能匹配 Email 地址的正則表達式」* |
| 檢查顏色對比度 | *「白色文字在這個藍色背景上，符合 WCAG AA 標準嗎？」* |
| 轉換時區 | *「東京下午 3 點，紐約和倫敦分別是幾點？」* |
| 改善提示詞 | *「幫我評分這個提示詞，並建議改善方向」* |

---

## 可用的 MCP 伺服器

### 在 Cursor 中一鍵安裝

| 伺服器 | 安裝 | 工具數 | 免費/天 |
|--------|------|--------|--------|
| JSON Toolkit | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=json-toolkit&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vanNvbi10b29sa2l0LW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 6 | 20 |
| Regex Engine | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=regex-engine&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcmVnZXgtZW5naW5lLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 5 | 20 |
| Color Palette | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=color-palette&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vY29sb3ItcGFsZXR0ZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==) | 5 | 25 |
| Timestamp Converter | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=timestamp-converter&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vdGltZXN0YW1wLWNvbnZlcnRlci1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==) | 5 | 30 |
| Prompt Enhancer | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-enhancer&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcHJvbXB0LWVuaGFuY2VyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 6 | 10 |
| Market Intelligence | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-intel&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctaW50ZWwtbWNwLnlhZ2FtaTgwOTUud29ya2Vycy5kZXYvbWNwIn0=) | 6 | 10 |
| Fortune & Tarot | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-fortune&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctZm9ydHVuZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==) | 3 | 50 |
| Content Publisher | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=moltbook-publisher&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vbW9sdGJvb2stcHVibGlzaGVyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 8 | 5 |
| AI Tool Compare | [![安裝](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=agentforge-compare&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vYWdlbnRmb3JnZS1jb21wYXJlLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 5 | 10 |

---

## 快速開始

### 方法 A：Cursor（一鍵安裝）

點擊上面表格中任何一個 **安裝** 按鈕就完成了。

### 方法 B：Claude Desktop

把以下內容加到你的 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "openclaw-json": { "type": "streamable-http", "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-regex": { "type": "streamable-http", "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-colors": { "type": "streamable-http", "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-timestamp": { "type": "streamable-http", "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-prompt": { "type": "streamable-http", "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-intel": { "type": "streamable-http", "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-fortune": { "type": "streamable-http", "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-moltbook": { "type": "streamable-http", "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-agentforge": { "type": "streamable-http", "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp" }
  }
}
```

### 方法 C：任何 MCP 客戶端

使用上面任何一個伺服器網址，透過 Streamable HTTP 傳輸協定連接。支援 Claude Code、Windsurf、Cline 等所有相容 MCP 的工具。

---

## Product Store（產品頁）

瀏覽所有數位產品、指南和 API 存取方式：

**[product-store.yagami8095.workers.dev](https://product-store.yagami8095.workers.dev)**

包含提示詞集、自動化指南、入門套件和 Pro API 金鑰。

---

## 方案 / 使用方式

<table>
<tr><th>方案</th><th>費用</th><th>內容</th></tr>
<tr><td><strong>免費</strong></td><td>$0</td><td>每月 1,000 次呼叫，涵蓋 3 台伺服器——不需要帳號</td></tr>
<tr><td><strong>Pro</strong></td><td><strong>$29/月</strong></td><td>每月 50,000 次呼叫，涵蓋全部 9 台伺服器 + Pro 專屬工具</td></tr>
<tr><td><strong>Enterprise</strong></td><td><strong>$99/月</strong></td><td>每月 500,000 次呼叫 + 優先處理 + 24 小時支援</td></tr>
<tr><td><strong>Credit Pack</strong></td><td>$29（一次性）</td><td>5,000 點數（永不過期）</td></tr>
</table>

### 取得 Pro 金鑰

| 方式 | 連結 |
|------|------|
| **Product Store** | [product-store.yagami8095.workers.dev](https://product-store.yagami8095.workers.dev) |
| **PayPal** | [paypal.me/Yagami8095/29](https://paypal.me/Yagami8095/29) |

付款後，Pro API 金鑰會立即產生。有問題請寄信到 **yagami8095@gmail.com**。

---

## 語言支援

本專案提供三種語言版本：

- **[English](README.md)** — 英文版
- **繁體中文** — 你正在閱讀的版本
- **[日本語](README.ja.md)** — 日文版

---

## 常見問題

**Q：需要安裝什麼嗎？**
A：不用。OpenClaw 的伺服器跑在雲端，你只需要在 AI 工具的設定裡貼上網址就好。

**Q：需要帳號或 API 金鑰才能開始嗎？**
A：不用。免費方案完全不需要帳號，連接就能用。

**Q：什麼是 MCP？**
A：MCP（Model Context Protocol）是一個開放標準，讓 AI 助手可以使用外部工具。你可以把它想成是 AI 界的 USB——一種通用的擴充介面。

**Q：哪些 AI 工具可以搭配使用？**
A：任何支援 MCP 的工具都可以，包括 Cursor、Claude Desktop、Claude Code、Windsurf 和 Cline。

**Q：免費額度用完會怎樣？**
A：伺服器會回傳限流訊息。你可以等額度重置，或升級到 Pro 取得更高額度。

---

## 疑難排解

**「連線被拒」或「找不到伺服器」**
- 確認你使用的是完整網址，結尾要有 `/mcp`（例如 `https://json-toolkit-mcp.yagami8095.workers.dev/mcp`）
- 確認你的 AI 工具支援 Streamable HTTP 傳輸協定

**「超過使用限制」**
- 免費方案每台伺服器有每日上限（請參考上面的表格）
- 等待每日重置，或升級到 Pro

**設定後工具沒出現**
- 新增伺服器設定後，重新啟動你的 AI 工具
- 確認 JSON 設定沒有語法錯誤

---

## 文件 / 下一步

- **[架構說明](ARCHITECTURE.md)** — OpenClaw 的技術架構
- **[貢獻指南](CONTRIBUTING.md)** — 如何新增工具或改善伺服器
- **[安全政策](SECURITY.md)** — 安全政策與回報方式
- **[使用範例](DEMO.md)** — 更多使用範例

---

## 支持 OpenClaw

你的支持能讓這些伺服器持續運作，並繼續提供免費服務。

[![在 GitHub 贊助](https://img.shields.io/badge/Sponsor-%E2%9D%A4-red)](https://github.com/sponsors/yedanyagamiai-cmd)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-支持-blue)](https://ko-fi.com/openclaw)
[![PayPal](https://img.shields.io/badge/PayPal-贊助-blue)](https://paypal.me/Yagami8095)
[![Pro 金鑰](https://img.shields.io/badge/Pro_金鑰-%2429%2F月-green)](https://product-store.yagami8095.workers.dev/products/ecosystem-pro)

---

## 信任說明

- **開源** — MIT 授權，完整原始碼在這個 repo 裡
- **不綁定** — 標準 MCP 協定，隨時可以切換
- **邊緣託管** — Cloudflare Workers，全球 300+ 節點
- **無追蹤** — 伺服器只處理請求並回傳結果，不做其他事
- **符合 MCP 規範** — 使用 Streamable HTTP 傳輸協定

---

<p align="center">
  <a href="README.md">English</a> &bull;
  <a href="README.ja.md">日本語版</a>
</p>

<p align="center">
  由 <a href="https://product-store.yagami8095.workers.dev">OpenClaw</a> 打造 — 9 台伺服器、49 個工具、開放原始碼
</p>
