# Timestamp Converter MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/timestamp-converter-mcp)](https://smithery.ai/server/@openclaw-ai/timestamp-converter-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-30%2Fday-green)](https://timestamp-converter-mcp.yagami8095.workers.dev/mcp)

> タイムスタンプ変換、タイムゾーン計算、Cron式解析、日付差分計算がAIアシスタントからすぐにできます。

## これは何ですか？なぜ必要ですか？

- **日付とタイムゾーンの処理は、プログラミングで最もミスが起きやすい作業の一つです。** `1710000000` は3月9日？それとも3月10日？タイムゾーン次第で答えが変わります。このサーバーはUnixタイムスタンプ、ISO 8601、人間が読める形式を瞬時に相互変換するので、タイムスタンプが何時を表しているか常に正確に分かります。
- **タイムゾーンの計算は混乱しやすく、間違えがちです。** サーバーはUTC、ユーザーは東京、ログには14:30と書いてある -- ローカル時刻で何時？タイムゾーン変換ツールは400以上のIANAタイムゾーンに対応し、オフセットも表示するので曖昧さがなくなります。
- **Cron式はそれを覚えるまでランダムな数字の羅列にしか見えません。** `*/15 9-17 * * 1-5` が「平日の営業時間中、15分ごと」という意味だと暗記する代わりに、パーサーが分かりやすい日本語で説明し、次の5回の実行予定時刻も表示してくれます。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=timestamp-converter&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vdGltZXN0YW1wLWNvbnZlcnRlci1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

`claude_desktop_config.json` に追加：

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

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `convert_timestamp` | Unixエポック、ISO 8601、人間が読める形式、相対時刻の相互変換 | 「Unixタイムスタンプ 1710000000 を日時に変換して」 |
| `timezone_convert` | 任意の2つのIANAタイムゾーン間で日時を変換 | 「2024-03-15 14:30 UTCは東京とニューヨークで何時？」 |
| `parse_cron` | Cron式を分かりやすく説明し、次の実行時刻を表示 | 「このCronの意味は？ */15 9-17 * * 1-5」 |
| `time_diff` | 2つの日付の差を複数の単位で計算 | 「2024年1月1日から3月15日まで何日ある？」 |
| `format_duration` | 秒またはミリ秒を人間が読める時間表記に変換 | 「90061秒を読みやすい形式にして」 |

## コピペで使える例

### 例 1: ログのタイムスタンプを解読する

AIに聞いてみましょう：「このUnixタイムスタンプを東京時間（Asia/Tokyo）で人間が読める日時に変換して：1710000000」

### 例 2: 複数のタイムゾーンで会議の時刻を確認する

AIに聞いてみましょう：「サンフランシスコの2024-03-20 午前10:00に会議があります。東京、ロンドン、ニューヨークでは何時になりますか？」

### 例 3: Cronスケジュールを理解する

AIに聞いてみましょう：「このCron式の意味を説明して、次の5回の実行時刻を教えて：0 2 * * 0」

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 30回/日 |
| Pro | $29/月 | 50,000回/月 |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上で動作しています。MCP設定にURLを追加するだけで、すぐにタイムスタンプの変換を始められます。無料プランではAPIキーも不要です。

**Q: どのタイムゾーンに対応していますか？**
A: `America/New_York`、`Asia/Tokyo`、`Europe/London` など、400以上のIANAタイムゾーンすべてに対応しています。これらは主要なプログラミング言語とOSで使われている標準的なタイムゾーン識別子です。

**Q: サマータイム（夏時間）は正しく処理されますか？**
A: はい。IANAタイムゾーンデータを使用しており、すべてのDST（夏時間）切り替えルールが含まれています。タイムゾーン間の変換時には、指定された日付に基づいてDSTオフセットが自動的に適用されます。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
