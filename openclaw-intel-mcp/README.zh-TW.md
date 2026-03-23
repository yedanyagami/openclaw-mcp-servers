# OpenClaw Market Intelligence MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/openclaw-intel-mcp)](https://smithery.ai/server/@openclaw-ai/openclaw-intel-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://openclaw-intel-mcp.yagami8095.workers.dev/mcp)

> 即時掌握 AI 市場情報 -- 產業報告、生態統計、趨勢分析，在 AI 助手裡一鍵取得。

## 這是什麼？為什麼需要它？

- **AI 產業每週都在變。** 新工具上線、公司拿到融資、市場版圖不斷重組。靠自己追蹤很累，也很容易漏掉重要消息。
- **這台伺服器把市場情報直接送進你的 AI 助手。** 問一句「AI 程式設計工具的市場現在怎麼樣？」就能拿到一份結構化的報告，包含數據、趨勢和分析 -- 不用開瀏覽器也不用 Google。
- **開發者、創辦人、分析師都用得到。** 不論你是在評估競爭者、寫市場概覽，還是單純想掌握產業動態，你拿到的是真實數據而不是猜測。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-intel&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctaW50ZWwtbWNwLnlhZ2FtaTgwOTUud29ya2Vycy5kZXYvbWNwIn0=)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/openclaw-intel-mcp
```

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `get_ai_market_report`（免費） | 取得任何 AI 主題的市場情報報告 | 對 AI 說：「給我一份 AI 程式設計助手的市場報告」 |
| `get_report_by_id`（Pro） | 用報告 ID 取得特定報告 | 對 AI 說：「調出報告 ID intel-2026-03-15」 |
| `list_reports`（免費） | 瀏覽所有可用的報告，含標題和日期 | 對 AI 說：「有哪些市場報告可以看？」 |
| `get_market_stats`（免費） | 即時生態系統統計：使用者數、報告數、資料更新時間 | 對 AI 說：「目前 AI 市場的統計數據是什麼？」 |
| `purchase_api_key` | 取得購買 Pro API 金鑰的說明 | 對 AI 說：「怎麼升級到 Pro？」 |
| `validate_api_key`（免費） | 檢查你的 API 金鑰是否有效並查看剩餘額度 | 對 AI 說：「檢查我的 API 金鑰狀態」 |

## 直接複製使用

### 範例 1：取得市場概覽

對 AI 說：「給我一份 AI 代理框架生態系統的市場報告，要詳細深度」

你會收到一份結構化報告，涵蓋市場規模、成長率、主要玩家、投資訊號和新興趨勢 -- 格式整齊，可以直接使用。

### 範例 2：看看有哪些報告

對 AI 說：「列出所有可用的市場情報報告」

你會看到一張報告清單，包含標題、日期，以及是免費還是 Pro 才能看。

### 範例 3：取得即時生態系統統計

對 AI 說：「目前的 AI 市場統計數據是什麼？」

會回傳即時數字：Pro 使用者總數、報告數量、資料最近更新時間。

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 10 次/天 |
| Pro | $29/月 | 50,000 次/月 |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這是架在 Cloudflare Workers 上的遠端 MCP 伺服器。把 URL 加到 MCP 客戶端設定就能馬上使用。

**Q: 市場報告裡有什麼資料？**
A: 報告包含市場規模估計、成長率、主要玩家、競爭定位、融資訊號、技術趨勢和前瞻分析。資料會定期從多個來源更新。

**Q: 免費和 Pro 的差別是什麼？**
A: 免費方案每天 10 次呼叫，可以看最新的市場報告、統計數據和報告清單。Pro 可以用 `get_report_by_id` 存取完整的報告資料庫，以及更高的呼叫額度。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
