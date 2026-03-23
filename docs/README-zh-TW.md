# OpenClaw MCP 伺服器

## 49 個 AI 工具。9 台伺服器。零設定。10 秒連線。

OpenClaw 是目前最快的方式，將生產級 AI 工具接入你的編輯器。每台伺服器都部署在 Cloudflare 全球邊緣網路上，延遲低於 100 毫秒。不需要 API 金鑰、Docker、Node.js 或任何建置步驟。

貼上一個網址，重新啟動你的編輯器，就可以開始使用。

---

## 什麼是 MCP？

MCP（Model Context Protocol，模型上下文協議）是讓 AI 助手使用外部工具的標準協議。你可以把它想成 AI 的 USB 介面 -- 一個通用連接器。

沒有 MCP 的 AI 只能產生文字。有了 MCP，你的 AI 可以：
- 驗證和格式化 JSON 檔案
- 測試和解釋正則表達式
- 檢查 WCAG 色彩對比度
- 在時區之間轉換時間戳
- 改善 AI 提示的品質
- 掃描市場趨勢和競品資訊
- 進行塔羅牌占卜
- 建立和排程發布內容
- 比較 AI 模型的功能和成本

---

## 為什麼選擇 OpenClaw？

| 比較項目 | 自架 MCP | Smithery 市集 | 個別工具伺服器 | **OpenClaw** |
|---|---|---|---|---|
| 設定時間 | 每台 30-60 分鐘 | 5-15 分鐘 | 10-20 分鐘 | **10 秒** |
| 伺服器管理 | 你自己維護 | 依賴市集 | 分散的設定 | **零維護** |
| 正常運行時間 | 看你的基礎設施 | 不穩定 | 無 SLA | **99.9% Cloudflare** |
| 平均延遲 | 依網路而定 | 200-500ms | 各不相同 | **<100ms 邊緣** |
| 免費方案 | 無（你付運算費用） | 有限 | 少見 | **3 台，每天 20 次** |
| 專業版價格 | 你的運算成本 | $15-30/月 | 個別計價 | **$9/月全包** |
| 多語言文件 | 少見 | 僅英文 | 僅英文 | **英文+繁中+日文** |

---

## 這是給誰的？

- **開發者**：在編輯器中需要可靠的 JSON、正則、時間戳工具
- **AI 工程師**：建構提示鏈、比較模型、執行市場情報
- **初學者**：想試用 MCP 但不想安裝任何東西
- **團隊**：需要跨專案一致的工具基礎設施

---

## 伺服器列表

| # | 伺服器 | 工具數 | 工具清單 |
|---|---|---|---|
| 1 | **JSON Toolkit** | 6 | json_format, json_validate, json_diff, json_query, json_transform, json_schema_generate |
| 2 | **Regex Engine** | 5 | regex_test, regex_extract, regex_replace, regex_explain, regex_generate |
| 3 | **Color Palette** | 5 | color_info, generate_palette, contrast_check, css_gradient, closest_to |
| 4 | **Timestamp Converter** | 5 | convert, time_diff, cron_explain, timezone_list, now_in_tz |
| 5 | **Prompt Enhancer** | 6 | enhance, rewrite, chain_of_thought, few_shot, system_prompt, compare |
| 6 | **Market Intelligence** | 6 | tech_scan, trend_report, competitor_brief, market_size, news_digest, alert_setup |
| 7 | **Fortune & Tarot** | 3 | fortune, tarot_reading, compatibility |
| 8 | **Content Publisher** | 8 | create_article, schedule_post, seo_analyze, headline_test, content_calendar, repurpose, translate, publish |
| 9 | **AI Tool Compare** | 5 | compare_models, benchmark, cost_calc, feature_matrix, recommend |

**合計：9 台伺服器，49 個工具**

---

## 快速開始（3 步驟）

### 步驟 1：選擇伺服器

建議從 JSON Toolkit 開始，因為 JSON 是最普遍使用的格式。

### 步驟 2：加入設定

**Cursor 使用者**，點擊一鍵安裝：

[![在 Cursor 安裝](https://cursor.com/deeplink/mcp-install-badge.svg)](https://cursor.com/install-mcp?name=json-toolkit&config=json-toolkit.yagami8095.workers.dev/mcp)

**Claude Desktop 使用者**，在 `claude_desktop_config.json` 中加入：

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit.yagami8095.workers.dev/mcp"
    }
  }
}
```

### 步驟 3：重新啟動，開始使用

關閉並重新開啟用戶端，然後嘗試：

> 「驗證這個 JSON：`{"name": "test", "value": 42,}`」

AI 會自動呼叫 `json_validate`，找到尾隨逗號錯誤，並告訴你如何修正。

---

## 定價

| 方案 | 價格 | 內容 |
|---|---|---|
| **免費** | $0 | 3 台伺服器，每台每日 20 次呼叫，不需註冊 |
| **專業版** | $9/月 | 全部 9 台伺服器，每月 50,000 次呼叫，優先支援 |
| **企業版** | 洽詢 | 客製化工具、99.99% SLA、專屬支援頻道 |

免費方案不需要註冊或信用卡。貼上網址即可開始使用。

---

## 常見問題

**需要程式經驗嗎？**
不需要。只要會複製貼上網址到設定檔就行。

**真的完全免費嗎？**
是的。3 台伺服器、每天 20 次呼叫、零註冊。需要更多就升級到專業版。

**支援哪些用戶端？**
所有 MCP 相容用戶端：Claude Desktop、Cursor、Windsurf、Cline、Continue 等。

**工具沒出現怎麼辦？**
儲存設定後重新啟動用戶端。最常見的原因是忘記重新啟動。

**需要 API 金鑰嗎？**
不需要。所有伺服器在免費版都不需要任何金鑰或憑證。

---

## 架構

```
你的編輯器（Claude Desktop / Cursor / Windsurf）
        |
        | MCP 協議（HTTP 上的 JSON-RPC）
        |
   Cloudflare 邊緣網路（300+ 城市）
        |
        +-- json-toolkit.yagami8095.workers.dev/mcp
        +-- regex-engine.yagami8095.workers.dev/mcp
        +-- ... （共 9 台伺服器）
```

每台伺服器都是 Cloudflare Worker，部署在全球邊緣。當你的 MCP 用戶端發送工具呼叫時，會路由到最近的 Cloudflare 資料中心，在 100 毫秒內執行完成並返回結果。沒有原始伺服器、沒有冷啟動、沒有需要管理的基礎設施。

---

## 文件

| 文件 | 說明 |
|---|---|
| [入門指南](GETTING-STARTED.md) | 第一次安裝指南 |
| [常見問題](FAQ.md) | 10 個常見問題 |
| [疑難排解](TROUBLESHOOTING.md) | 修復常見問題 |
| [日文版](README-ja.md) | 日文產品頁面 |
| [英文版](../README.md) | 完整英文文件 |

---

## 開始使用

- **免費試用** -- 現在就把伺服器網址貼到你的用戶端中，不需要註冊
- **升級專業版** -- $9/月解鎖全部 9 台伺服器和 50,000 次呼叫
- **給顆星** -- 幫助更多人發現 OpenClaw

---

MIT 授權 | 基於 Cloudflare Workers 建構 | [OpenClaw 專案](https://github.com/yagami8095/openclaw-mcp-servers)
