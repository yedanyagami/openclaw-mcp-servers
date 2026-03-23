# Regex Engine MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/regex-engine-mcp)](https://smithery.ai/server/@openclaw-ai/regex-engine-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://regex-engine-mcp.yagami8095.workers.dev/mcp)

> 用中文描述你要什麼，AI 就幫你寫好正則表達式 -- 再也不用 Google 了。

## 這是什麼？為什麼需要它？

- **正則表達式很強大，但出了名的難寫。** 大多數開發者每次需要 regex 都要去 Google。這台伺服器讓你用自然語言描述需求 -- 像是「比對台灣手機號碼」-- 它就會幫你產生可用的正則表達式。
- **看別人寫的 regex 就像在解密碼。** explain 工具會把任何正則表達式拆解成一步一步的白話說明，不用再猜 `^(?:[a-z0-9]+(?:\.[a-z0-9]+)*)@` 到底在幹嘛。
- **切換到別的工具測試 regex 會打斷你的工作流程。** 不用再開 regex101.com，你可以直接在 AI 助手裡測試、擷取比對結果、做搜尋取代，邊做事邊用。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=regex-engine&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcmVnZXgtZW5naW5lLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "regex-engine": {
      "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/regex-engine-mcp
```

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `regex_test` | 用正則表達式測試文字，回傳所有比對結果及位置 | 對 AI 說：「測試這段文字裡有沒有合法的 email」 |
| `regex_explain` | 用白話一步步解釋正則表達式的意思 | 對 AI 說：「解釋這個 regex 在做什麼：^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$」 |
| `regex_build` | 根據自然語言描述產生正則表達式 | 對 AI 說：「幫我寫一個比對 YYYY-MM-DD 日期格式的 regex」 |
| `regex_replace` | 用正則表達式做搜尋取代，支援擷取群組 | 對 AI 說：「把這段文字裡所有日期從 MM/DD/YYYY 改成 YYYY-MM-DD」 |
| `regex_extract` | 從文字中擷取所有符合的子字串 | 對 AI 說：「把這段文字裡所有網址抓出來」 |

## 直接複製使用

### 範例 1：用描述建立正則表達式

對 AI 說：「幫我寫一個比對 email 的 regex，然後用這段文字測試：請聯繫 hello@example.com 或 support@company.co.uk」

### 範例 2：看懂程式碼裡的正則表達式

對 AI 說：「解釋我在程式碼裡看到的這個 regex：(?:(?:\r\n)?[ \t])*(?:(?:[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)」

### 範例 3：從非結構化文字擷取資料

對 AI 說：「從這段文字中抓出所有電話號碼：聯絡我們 (02) 2345-6789 或 0912-345-678。國際：+44 20 7946 0958」

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 20 次/天 |
| Pro | $29/月 | 50,000 次/月 |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這跑在 Cloudflare Workers 上，把 URL 加到 AI 客戶端的 MCP 設定就可以用了。不需要裝任何東西，也不需要 API 金鑰。

**Q: 用的是哪種正則表達式語法？**
A: JavaScript 正則（ECMAScript）。涵蓋 99% 網頁開發者和一般程式設計師的需求，包括具名擷取群組（named capture groups）、前瞻斷言（lookaheads）以及所有標準旗標（g、i、m、s、u）。

**Q: 能處理遞迴比對之類的複雜模式嗎？**
A: 只要 JavaScript regex 支援的都能處理。對於真正複雜的模式（像是平衡括號），build 工具會盡可能產生最接近的結果並說明限制。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
