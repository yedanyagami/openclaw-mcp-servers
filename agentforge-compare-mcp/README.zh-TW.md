# AgentForge AI Tool Compare MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/agentforge-compare-mcp)](https://smithery.ai/server/@openclaw-ai/agentforge-compare-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://agentforge-compare-mcp.yagami8095.workers.dev/mcp)

> 比較 Claude Code、Cursor、Copilot、Devin 等 AI 工具 -- 功能對照、定價分析、選擇建議，幫你做出明智決定。

## 這是什麼？為什麼需要它？

- **AI 程式設計工具太多了，很難分辨差異。** Claude Code、Cursor、GitHub Copilot、Windsurf、Devin、Aider、Cline -- 每個都說自己最好，收費模式也各不相同。
- **這台伺服器讓你的 AI 助手能用真實數據比較工具。** 問一句「Cursor 和 Claude Code 比起來怎樣？」就能拿到功能、定價、優缺點的結構化比較，不是空泛的意見。
- **在訂閱之前做出明智的決定。** 不論你是選擇第一個 AI 工具的獨立開發者，還是在幫團隊評估方案的技術主管，你拿到的是清楚、可比較的數據。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=agentforge-compare&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vYWdlbnRmb3JnZS1jb21wYXJlLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "agentforge-compare": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/agentforge-compare-mcp
```

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `compare_ai_tools`（免費） | 兩個以上 AI 工具的並排比較 | 對 AI 說：「比較 Claude Code、Cursor 和 Copilot」 |
| `get_tool_profile`（免費） | 詳細的工具介紹，含功能、定價、優缺點 | 對 AI 說：「給我 Devin 的完整介紹」 |
| `recommend_tool`（Pro） | 根據你的具體需求用 AI 推薦最適合的工具 | 對 AI 說：「哪個 AI 程式設計工具最適合 Python 後端開發者？」 |
| `get_pricing_comparison`（免費） | 所有追蹤中 AI 程式設計工具的定價對照 | 對 AI 說：「給我看所有 AI 程式設計助手的定價」 |
| `purchase_pro_key` | 取得購買 Pro API 金鑰的說明 | 對 AI 說：「怎麼升級到 Pro 來取得推薦功能？」 |

## 直接複製使用

### 範例 1：購買前比較兩個工具

對 AI 說：「把 Claude Code 和 Cursor 並排比較 -- 功能、定價、優點和缺點」

你會拿到一張結構化的比較表，顯示每個工具在速度、準確度、成本、支援語言和 IDE 整合上的表現，附上摘要說明哪個工具更適合什麼情境。

### 範例 2：取得特定工具的詳細介紹

對 AI 說：「告訴我 Windsurf 的所有資訊 -- 定價、擅長什麼、不擅長什麼、適合誰用」

會回傳完整的工具介紹，包括各級定價方案、主要功能、已知限制、理想使用情境，以及和其他替代方案的比較。

### 範例 3：一覽所有定價

對 AI 說：「給我看所有 AI 程式設計工具的定價比較 -- Copilot、Cursor、Claude Code、Devin、Aider 和 Cline」

會回傳一張清楚的表格，包含月費、免費方案內容、以及每個定價等級包含什麼。

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 10 次/天 |
| Pro | $29/月 | 50,000 次/月 |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這是架在 Cloudflare Workers 上的遠端 MCP 伺服器。把 URL 加到 MCP 客戶端設定就能馬上使用，不用下載任何東西，免費方案也不需要 API 金鑰。

**Q: 追蹤了哪些 AI 工具？**
A: 目前追蹤：Claude Code、Cursor、GitHub Copilot、Windsurf、Devin、Aider、Cline 和 SWE-agent。有新的重要工具出現時會持續新增。

**Q: 資料有多新？**
A: 工具介紹和定價資料會定期更新。如果某個工具有重大更新或變更定價，資料會及時反映。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
