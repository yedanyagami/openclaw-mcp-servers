# OpenClaw Fortune & Tarot MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/fortune-mcp)](https://smithery.ai/server/@openclaw-ai/fortune-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-50%2Fday-green)](https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp)

> 12星座の毎日の運勢、タロットリーディング、星座ランキング -- AIチャットに楽しさをプラスしましょう。

## これは何ですか？なぜ必要ですか？

- **毎日の占いはみんな大好きです。** チャットボット、コンテンツフィード、デイリーニュースレターを作っているなら、占いコンテンツはエンゲージメントを高め、ユーザーが毎日戻ってくる理由になります。
- **このサーバーは、AIアシスタントに占い能力を追加します。** 任意の星座の今日の運勢を聞くだけで、恋愛・仕事・健康・金運のスコア、タロットカードの解釈、ラッキーナンバーが返ってきます。
- **完全無料で、セットアップも不要です。** 1日50回の無料コール、APIキー不要、Claude Desktop・Cursor・その他のMCP対応クライアントですぐに使えます。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=fortune&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctZm9ydHVuZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

`claude_desktop_config.json` に追加：

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

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `get_daily_fortune` | 特定の星座の今日の運勢とタロットカードを取得 | 「今日の牡羊座の運勢は？」 |
| `get_fortune_ranking` | 今日の12星座のラッキーランキング（1位〜12位） | 「今日一番運がいい星座はどれ？」 |
| `get_all_fortunes` | 12星座すべての運勢データを一括取得 | 「今日の全星座の運勢を見せて」 |

## コピペで使える例

### 例 1: 今日の運勢をチェックする

AIに聞いてみましょう：「今日の獅子座の運勢を教えて。タロットカードとラッキーナンバーも含めて」

恋愛・仕事・健康・金運のスコア、タロットカードとその解釈、そして今日のラッキーナンバーを含む詳細なリーディングが返ってきます。

### 例 2: 今日一番ラッキーな星座を見つける

AIに聞いてみましょう：「今日の12星座を運勢でランキングして -- 一番ラッキーなのはどれ？」

1位から12位までの総合スコア付きランキングが返ってくるので、どの星座が今日一番良い日を過ごしているか分かります。

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 50回/日 |
| Pro | $29/月 | 50,000回/月 |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上でホストされているリモートMCPサーバーです。MCPクライアントの設定にURLを追加するだけで、すぐに使えます。ダウンロードも依存関係もありません。

**Q: どの星座に対応していますか？**
A: 12星座すべてに対応しています：牡羊座（Aries）、牡牛座（Taurus）、双子座（Gemini）、蟹座（Cancer）、獅子座（Leo）、乙女座（Virgo）、天秤座（Libra）、蠍座（Scorpio）、射手座（Sagittarius）、山羊座（Capricorn）、水瓶座（Aquarius）、魚座（Pisces）。英語名でも日本語名でも指定できます。

**Q: チャットボットやアプリで使えますか？**
A: もちろんです。1日50回の無料コールは、個人のチャットボットや小規模プロジェクトに十分です。アクセスが多いアプリケーションにはProプランへのアップグレードをおすすめします。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
