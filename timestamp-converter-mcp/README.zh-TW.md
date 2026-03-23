# Timestamp Converter MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/timestamp-converter-mcp)](https://smithery.ai/server/@openclaw-ai/timestamp-converter-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-30%2Fday-green)](https://timestamp-converter-mcp.yagami8095.workers.dev/mcp)

> 轉換時間戳記、計算時區、解析 Cron 表達式 -- 開發者最常遇到的時間問題，一次搞定。

## 這是什麼？為什麼需要它？

- **處理日期和時區是程式設計中最容易出錯的事之一。** `1710000000` 是 3 月 9 號還是 3 月 10 號？取決於時區。這台伺服器可以在 Unix 時間戳記、ISO 8601 和人類看得懂的格式之間即時轉換，讓你永遠清楚知道一個時間戳記代表什麼時候。
- **時區計算很容易搞混。** 伺服器用 UTC，使用者在東京，log 寫 14:30 -- 那到底是台灣時間幾點？時區轉換器支援 400 多個 IANA 時區，並顯示時差讓你不會搞錯。
- **Cron 表達式看起來像一堆隨機數字。** 與其死背 `*/15 9-17 * * 1-5` 代表「平日上班時間每 15 分鐘執行一次」，解析器會給你白話的說明和接下來 5 次的排程時間。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=timestamp-converter&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vdGltZXN0YW1wLWNvbnZlcnRlci1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "timestamp-converter": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/timestamp-converter-mcp
```

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `convert_timestamp` | 在 Unix epoch、ISO 8601、人類可讀格式和相對時間之間轉換 | 對 AI 說：「把 Unix 時間戳記 1710000000 轉成看得懂的日期」 |
| `timezone_convert` | 在任意兩個 IANA 時區之間轉換日期時間 | 對 AI 說：「2024-03-15 14:30 UTC 在台北和紐約是幾點？」 |
| `parse_cron` | 用白話解釋 Cron 表達式，並顯示接下來的執行時間 | 對 AI 說：「這個 cron 是什麼意思：*/15 9-17 * * 1-5」 |
| `time_diff` | 計算兩個日期之間的差距，用多種單位表示 | 對 AI 說：「2024 年 1 月 1 日到 3 月 15 日相隔幾天？」 |
| `format_duration` | 把秒數或毫秒數轉成人類可讀的時間長度 | 對 AI 說：「90061 秒換算成好讀的時間是多久？」 |

## 直接複製使用

### 範例 1：除錯 log 裡的時間戳記

對 AI 說：「把這個 Unix 時間戳記轉成台北時區（Asia/Taipei）的人類可讀日期：1710000000」

### 範例 2：算出跨時區的會議時間

對 AI 說：「我有一個會議在 2024-03-20 早上 10:00 舊金山時間，換算成東京、倫敦和紐約是幾點？」

### 範例 3：看懂 Cron 排程

對 AI 說：「解釋這個 cron 表達式，告訴我接下來 5 次的執行時間：0 2 * * 0」

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 30 次/天 |
| Pro | $29/月 | 50,000 次/月 |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這跑在 Cloudflare Workers 上，把 URL 加到 MCP 設定就能馬上開始轉換時間。免費方案不需要 API 金鑰。

**Q: 支援哪些時區？**
A: 全部 400 多個 IANA 時區（像 `Asia/Taipei`、`America/New_York`、`Asia/Tokyo`、`Europe/London`）。這些是所有主流程式語言和作業系統使用的標準時區識別碼。

**Q: 有正確處理日光節約時間嗎？**
A: 有。伺服器使用 IANA 時區資料，包含所有日光節約時間的切換規則。跨時區轉換時會根據特定日期自動套用 DST 時差。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
