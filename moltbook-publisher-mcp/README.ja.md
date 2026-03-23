# MoltBook Content Publisher MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/moltbook-publisher-mcp)](https://smithery.ai/server/@openclaw-ai/moltbook-publisher-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-5%2Fday%2Ftool-green)](https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp)

> note.com・Zenn・Qiitaへの記事公開を支援 -- 翻訳、SEO最適化、クロスポストをAIアシスタントから直接実行できます。

## これは何ですか？なぜ必要ですか？

- **日本のプラットフォームでコンテンツを公開するのは手間がかかります。** note.com、Zenn、Qiitaはそれぞれ独自のフォーマットルールがあり、母語でない方にとって自然な日本語を書くのはさらに大変です。
- **このサーバーは、記事公開のワークフロー全体を処理します。** Markdownからプラットフォーム対応HTMLへの変換、英語から自然な日本語への翻訳、SEO最適化、クロスポスト用のフォーマット調整 -- すべてAIアシスタントへの指示だけで完了します。
- **コンテンツクリエイターや開発者の作業時間を大幅に節約できます。** 翻訳ツール、SEOチェッカー、フォーマッターを行き来する代わりに、Claude DesktopやCursorの中ですべてを一箇所で完結できます。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=moltbook-publisher&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vbW9sdGJvb2stcHVibGlzaGVyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

`claude_desktop_config.json` に追加：

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

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `convert_markdown_to_html`（無料） | Markdownをプラットフォーム対応HTMLに変換 | 「このMarkdown記事をZenn用のHTMLに変換して」 |
| `optimize_for_seo`（無料） | 日本語記事のSEOを分析・改善 | 「AIエージェントについてのこの記事のSEOをチェックして」 |
| `translate_en_to_jp`（無料） | 英語を自然な日本語に翻訳 | 「このブログ記事を日本語に翻訳して」 |
| `generate_article_outline`（無料） | 見出しとキーポイントを含む構造化されたアウトラインを生成 | 「初心者向けMCPサーバーの記事アウトラインを作って」 |
| `get_trending_topics`（Pro） | 日本のテックコミュニティのトレンドトピックを取得 | 「ZennとQiitaで今何がトレンドになっている？」 |
| `cross_post_format`（Pro） | 1つの記事を複数の日本語プラットフォーム向けに一括フォーマット | 「この記事をnote.comとQiitaの両方用にフォーマットして」 |
| `analyze_article_performance`（Pro） | パフォーマンス指標と改善提案を取得 | 「公開済みのこの記事のパフォーマンスを分析して」 |
| `purchase_pro_key` | Pro APIキーの購入方法を案内 | 「MoltBookのProキーを取得するには？」 |

## コピペで使える例

### 例 1: ブログ記事を翻訳して公開する

AIに聞いてみましょう：「AIエージェントの構築についてのこの英語ブログ記事を自然な日本語に翻訳して、それからnote.com用のHTMLに変換して」

AIがまずコンテンツを自然な日本語に翻訳し、次にMarkdownをnote.comのエディタにそのまま貼れるプラットフォーム対応HTMLに変換してくれます。

### 例 2: 公開前にSEOをチェックする

AIに聞いてみましょう：「MCPサーバーについてのこの記事のSEOを分析して、日本の検索エンジンでのランキング向上のための改善点を教えて」

スコア、キーワード密度分析、見出しの追加やメタディスクリプションの改善、文字数の調整などの具体的な提案が返ってきます。

### 例 3: ゼロから記事を作成する

AIに聞いてみましょう：「Claude DesktopでMCPサーバーを使う方法について、Qiitaの日本人開発者向けの記事アウトラインを作って」

H2/H3見出し、各セクションのキーポイント、推奨文字数を含む構造化されたアウトラインが返ってきます。

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 5回/日 |
| Pro | $29/月 | 50,000回/月 |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上でホストされているリモートMCPサーバーです。MCPクライアントの設定にURLを追加するだけで、すぐに使い始められます。

**Q: 英日翻訳の品質はどの程度ですか？**
A: 直訳ではなく、自然で読みやすい日本語を目指しています。ブログ記事、技術記事、マーケティングコンテンツなど、日本語読者向けのコンテンツに適した品質です。

**Q: クロスポストに対応しているプラットフォームはどれですか？**
A: note.com、Zenn、Qiitaに対応しています。`cross_post_format` ツールは各プラットフォームの要件に合わせてフォーマット、フロントマター、HTML構造を自動調整します。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
