# OpenClaw Fortune & Tarot MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/fortune-mcp)](https://smithery.ai/server/@openclaw-ai/fortune-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-50%2Fday-green)](https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp)

> 每日星座運勢、塔羅牌占卜、十二星座排行 -- 讓你的 AI 聊天更有趣。

## 這是什麼？為什麼需要它？

- **大家都愛看每日運勢。** 如果你在做聊天機器人、內容推送或每日電子報，運勢內容能提升使用者的黏著度，讓人每天都想回來看。
- **這台伺服器讓你的 AI 助手擁有占卜功能。** 問任何星座今天的運勢，就能拿到愛情、工作、健康和財運的評分，加上塔羅牌解讀和幸運數字。
- **完全免費，零設定。** 每天 50 次免費呼叫、不需要 API 金鑰，Claude Desktop、Cursor 或任何 MCP 相容的客戶端都能直接使用。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=fortune&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctZm9ydHVuZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/fortune-mcp
```

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `get_daily_fortune` | 取得特定星座今天的運勢和塔羅牌 | 對 AI 說：「我是牡羊座，今天運勢怎麼樣？」 |
| `get_fortune_ranking` | 查看今天哪個星座最幸運，1 到 12 排名 | 對 AI 說：「今天哪個星座運氣最好？」 |
| `get_all_fortunes` | 一次取得十二星座的完整運勢資料 | 對 AI 說：「給我看今天所有星座的運勢」 |

## 直接複製使用

### 範例 1：查看你的每日運勢

對 AI 說：「我是獅子座，今天運勢怎麼樣？包含塔羅牌解讀和幸運數字」

你會拿到一份完整的運勢報告，包含愛情、工作、健康和財運的評分，一張塔羅牌和它的解讀，以及今天的幸運數字。

### 範例 2：找出今天最幸運的星座

對 AI 說：「把十二星座按照今天的運勢排名 -- 誰最幸運？」

會回傳 1 到 12 的排名清單和總分，讓你一眼看出哪些星座今天運勢最旺。

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 50 次/天 |
| Pro | $29/月 | 50,000 次/月 |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這是架在 Cloudflare Workers 上的遠端 MCP 伺服器。把 URL 加到 MCP 客戶端設定就能馬上使用，不用下載任何東西。

**Q: 支援哪些星座？**
A: 全部十二星座：牡羊座、金牛座、雙子座、巨蟹座、獅子座、處女座、天秤座、天蠍座、射手座、摩羯座、水瓶座、雙魚座。直接說星座名稱就可以了。

**Q: 可以用在聊天機器人或應用程式上嗎？**
A: 當然可以。每天 50 次免費呼叫足夠個人聊天機器人和小型專案使用。流量更大的應用可以升級到 Pro。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
