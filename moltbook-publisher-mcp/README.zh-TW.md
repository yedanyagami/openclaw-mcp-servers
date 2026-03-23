# MoltBook Content Publisher MCP 伺服器

[![Smithery](https://smithery.ai/badge/@openclaw-ai/moltbook-publisher-mcp)](https://smithery.ai/server/@openclaw-ai/moltbook-publisher-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-5%2Fday%2Ftool-green)](https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp)

> 在 note.com、Zenn、Qiita 上發布文章 -- 翻譯、SEO 優化、跨平台發文，全部在 AI 助手內完成。

## 這是什麼？為什麼需要它？

- **在日本平台發布內容很麻煩。** 每個平台（note.com、Zenn、Qiita）都有自己的格式規範，而且用非母語寫出自然的日文很困難。
- **這台伺服器處理完整的發布流程。** 把 Markdown 轉成平台相容的 HTML、英文翻譯成自然的日文、SEO 優化、跨平台格式調整 -- 全部透過簡單的 AI 指令完成。
- **幫內容創作者和開發者省下大量時間。** 不用再在翻譯工具、SEO 檢查器和格式轉換器之間切換，在 Claude Desktop 或 Cursor 裡一站搞定。

## 快速安裝

### Cursor（一鍵安裝）

[![安裝到 Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=moltbook-publisher&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vbW9sdGJvb2stcHVibGlzaGVyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

加到你的 MCP 設定檔（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "moltbook-publisher": {
      "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/moltbook-publisher-mcp
```

## 工具一覽

| 工具 | 功能 | 使用範例 |
|------|------|----------|
| `convert_markdown_to_html`（免費） | 把 Markdown 轉成平台相容的 HTML | 對 AI 說：「把這篇 Markdown 文章轉成 Zenn 用的 HTML」 |
| `optimize_for_seo`（免費） | 分析並改善日文文章的 SEO | 對 AI 說：「檢查這篇 AI 代理文章的 SEO」 |
| `translate_en_to_jp`（免費） | 將英文翻譯成自然道地的日文 | 對 AI 說：「把這篇部落格文章翻譯成日文」 |
| `generate_article_outline`（免費） | 建立包含標題和重點的結構化大綱 | 對 AI 說：「產生一篇 MCP 伺服器入門文章的大綱」 |
| `get_trending_topics`（Pro） | 查看日本技術社群正在流行什麼 | 對 AI 說：「Zenn 和 Qiita 現在有什麼熱門話題？」 |
| `cross_post_format`（Pro） | 將一篇文章同時格式化成多個日本平台的格式 | 對 AI 說：「把這篇文章同時格式化成 note.com 和 Qiita 的版本」 |
| `analyze_article_performance`（Pro） | 取得文章表現指標和改善建議 | 對 AI 說：「分析這篇已發布文章的表現」 |
| `purchase_pro_key` | 取得購買 Pro API 金鑰的說明 | 對 AI 說：「怎麼取得 MoltBook 的 Pro 金鑰？」 |

## 直接複製使用

### 範例 1：翻譯並發布部落格文章

對 AI 說：「把這篇關於建立 AI 代理的英文部落格文章翻譯成自然的日文，然後轉成 note.com 格式的 HTML」

AI 會先把內容翻譯成道地的日文，再把 Markdown 轉成平台相容的 HTML，可以直接貼到 note.com 的編輯器裡。

### 範例 2：發布前的 SEO 檢查

對 AI 說：「分析這篇關於 MCP 伺服器的文章的 SEO，建議怎麼改才能在日本搜尋引擎排名更好」

你會拿到評分、關鍵字密度分析，以及具體建議，例如新增標題、改善 meta description 或調整字數。

### 範例 3：從零開始產生文章

對 AI 說：「建立一篇教 Qiita 上的日本開發者如何使用 MCP 伺服器搭配 Claude Desktop 的文章大綱」

會回傳結構化的大綱，包含 H2/H3 標題、每個段落的重點和建議字數。

## 方案

| 方案 | 費用 | 額度 |
|------|------|------|
| 免費 | $0 | 5 次/天 |
| Pro | $29/月 | 50,000 次/月 |

## 常見問題

**Q: 需要安裝什麼嗎？**
A: 不用。這是架在 Cloudflare Workers 上的遠端 MCP 伺服器。把 URL 加到 MCP 客戶端設定就能馬上使用。

**Q: 英翻日的品質如何？**
A: 翻譯目標是自然、道地的日文，而不是逐字機器翻譯。適合部落格文章、技術文章和行銷內容，讓日本讀者讀起來順暢。

**Q: 支援哪些平台的跨平台發文？**
A: note.com、Zenn 和 Qiita。`cross_post_format` 工具會根據每個平台的要求調整格式、front matter 和 HTML 結構。

## 連結

- [主專案](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全部 9 台伺服器](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#可用的-mcp-伺服器)
- [English](README.md) · [日本語](README.ja.md)

## 授權

MIT
