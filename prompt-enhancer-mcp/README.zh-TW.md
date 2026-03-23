# Prompt Enhancer MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/prompt-enhancer-mcp)](https://smithery.ai/server/@openclaw-ai/prompt-enhancer-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday%20free%2C%20100%20Pro-green)](https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp)

> 評分、改善、產生 AI 提示詞 -- 你的 AI 溝通寫作教練。

## 這是什麼？為什麼需要它？

- **好的提示詞能讓 AI 產出品質天差地別。**「寫一篇關於 AI 的文章」和一個結構完善的提示詞之間，輸出品質可以差到 10 倍。這台伺服器會分析你的提示詞、給 0-100 的評分，並告訴你具體該怎麼改 -- 就像隨時有個提示詞工程專家在旁邊。
- **從零開始寫系統提示詞（system prompt）很花時間。** 不論你需要客服機器人、程式碼審查員還是創意寫手，系統提示詞產生器可以在幾秒內建立針對你的角色和任務量身定做的正式提示詞。
- **不同 AI 工具和框架的提示詞格式不一樣。** 有的用 XML 標籤，有的用 Markdown 標題，有的用 JSON。格式轉換器可以在純文字、XML、Markdown 和 JSON 之間切換，讓你的提示詞可以在不同 AI 平台重複使用。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-enhancer&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcHJvbXB0LWVuaGFuY2VyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "prompt-enhancer": {
      "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/prompt-enhancer-mcp
```

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `enhance_prompt`（免費） | 把模糊的提示詞改寫成清晰、詳細、有效的版本 | 對 AI 說：「優化這個提示詞：寫一篇關於 AI 的部落格文章」 |
| `analyze_prompt`（免費） | 為提示詞品質評分 0-100，並給出具體改善建議 | 對 AI 說：「分析並評分這個提示詞：跟我說關於狗的事」 |
| `convert_prompt_format`（免費） | 在純文字、XML、Markdown 和 JSON 格式之間轉換提示詞 | 對 AI 說：「把這個提示詞轉成 XML 格式給 Claude 用」 |
| `generate_system_prompt`（免費） | 產生針對特定角色的系統提示詞 | 對 AI 說：「產生一個資深程式碼審查員的系統提示詞」 |
| `prompt_template_library`（Pro） | 瀏覽 30 多個依類別分類的正式提示詞範本 | 對 AI 說：「給我看所有內容寫作的提示詞範本」 |
| `purchase_pro_key` | 取得 Pro API 金鑰以獲得更高額度和範本庫存取 | 對 AI 說：「怎麼升級到 Pro？」 |

## 直接複製使用

### 範例 1：改善一個寫得不好的提示詞

對 AI 說：「先分析再優化這個提示詞：幫我的部落格寫一些關於機器學習的東西」

### 範例 2：為新的 AI 代理產生系統提示詞

對 AI 說：「產生一個專業客服人員的系統提示詞，要能處理退款請求，語氣友善但堅定」

### 範例 3：轉換提示詞格式給不同的 AI 工具

對 AI 說：「把這個純文字提示詞轉成 XML 格式讓 Claude 使用：你是一個有幫助的程式設計助手。永遠一步步解釋你的推理過程。盡量用範例說明。」

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 10 次/天（4 個工具） |
| Pro | $29/月 | 50,000 次/月（全部 6 個工具） |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這跑在 Cloudflare Workers 上，把 URL 加到 MCP 設定就能開始優化你的提示詞。免費方案不需要 API 金鑰，馬上就能用。

**Q: 提示詞怎樣會得高分？怎樣會得低分？**
A: 分析器會評估清晰度（是否明確不模糊？）、具體性（有沒有定義範圍、格式、長度？）、結構（有沒有脈絡和限制條件？）和完整性（有沒有考慮到邊界情況？）。80 分以上代表提示詞已經達到正式使用的品質。

**Q: 哪 4 個工具是免費的？哪些需要 Pro？**
A: `enhance_prompt`、`analyze_prompt`、`convert_prompt_format` 和 `generate_system_prompt` 完全免費（每天 10 次）。包含 30 多個精選範本的 `prompt_template_library` 需要 Pro 金鑰。`purchase_pro_key` 可以幫你升級。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
