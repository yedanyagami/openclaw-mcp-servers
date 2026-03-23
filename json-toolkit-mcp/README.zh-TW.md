# JSON Toolkit MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/json-toolkit-mcp)](https://smithery.ai/server/@openclaw-ai/json-toolkit-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://json-toolkit-mcp.yagami8095.workers.dev/mcp)

> 不用離開 AI 助手就能格式化、驗證、比對、查詢和轉換 JSON -- 開發者的 JSON 瑞士刀。

## 這是什麼？為什麼需要它？

- **JSON 無處不在。** API 回應、設定檔、資料庫匯出全都是 JSON。但原始 JSON 難以閱讀，少一個逗號就整個壞掉。這台伺服器可以即時格式化雜亂的 JSON，並精確告訴你錯誤在哪一行哪一欄。
- **手動比對兩個 JSON 檔案非常痛苦。** 設定改了之後出了問題，你需要知道到底差在哪裡。diff 工具會告訴你哪些 key 新增、刪除或修改了，不用再一行一行自己看。
- **你想從巢狀很深的 JSON 裡撈資料，但不想寫程式。** 查詢工具讓你用簡單的路徑語法（像 `$.users[*].name`）直接取出你要的資料。Schema 產生器還能從任何範例資料自動建立 JSON Schema。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=json-toolkit&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vanNvbi10b29sa2l0LW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/json-toolkit-mcp
```

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `json_format` | 美化列印或壓縮 JSON，可設定縮排 | 對 AI 說：「幫我把這段 JSON 用 2 格縮排格式化」 |
| `json_validate` | 檢查 JSON 是否合法，並標示錯誤位置 | 對 AI 說：「這段 JSON 有沒有問題？{key: value}」 |
| `json_diff` | 比較兩個 JSON 物件，列出所有差異 | 對 AI 說：「這兩個 JSON 設定檔差在哪裡？」 |
| `json_query` | 用路徑語法（如 `$.users[0].name`）搜尋 JSON 內容 | 對 AI 說：「從這個 JSON 陣列裡取出所有 email」 |
| `json_transform` | 攤平、還原巢狀、挑選、排除或重新命名 key | 對 AI 說：「把這個巢狀 JSON 攤平成一層」 |
| `json_schema_generate` | 從範例資料自動產生 JSON Schema | 對 AI 說：「根據這個 API 回應產生 JSON Schema」 |

## 直接複製使用

### 範例 1：修正並格式化雜亂的 API 回應

對 AI 說：「格式化這段 JSON 並檢查是否合法：{"users":[{"name":"Alice","scores":[98,87,95]},{"name":"Bob","scores":[72,88]}]}」

### 範例 2：找出兩個設定檔的差異

對 AI 說：「比較這兩個 JSON 物件，告訴我改了什麼：A = {"debug": true, "port": 3000, "host": "localhost"} B = {"debug": false, "port": 8080, "host": "localhost"}」

### 範例 3：從巢狀 JSON 撈出特定資料

對 AI 說：「用 $.users[*].email 查詢這段 JSON，列出所有電子郵件地址」

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 20 次/天 |
| Pro | $29/月 | 50,000 次/月 |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這是跑在 Cloudflare Workers 上的雲端伺服器。你只要把 URL 加到 AI 客戶端的 MCP 設定就能馬上使用，不需要 npm install、不需要 Docker、不需要 API 金鑰。

**Q: 最大能處理多大的 JSON？**
A: 免費方案可處理最大 1MB 的 JSON。這已經涵蓋絕大多數的 API 回應和設定檔。更大的檔案可以考慮 Pro 方案。

**Q: 支援 JSONPath 還是 jq 語法？**
A: 查詢工具使用類似 JSONPath 的語法（`$`、點記法、萬用字元、陣列切片）。雖然不是完整的 jq，但已涵蓋開發者最常用的查詢模式。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
