# JSON Toolkit MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/json-toolkit-mcp)](https://smithery.ai/server/@openclaw-ai/json-toolkit-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://json-toolkit-mcp.yagami8095.workers.dev/mcp)

> AIアシスタントから直接、JSONのフォーマット・検証・差分比較・クエリ・変換・スキーマ生成ができる万能ツールです。

## これは何ですか？なぜ必要ですか？

- **JSONはプログラミングのあらゆる場面で使われています。** APIレスポンス、設定ファイル、データベース -- すべてJSONです。しかし、生のJSONは読みにくく、カンマ一つ抜けただけで全体が壊れます。このサーバーは乱雑なJSONを瞬時に整形し、エラーの正確な位置（行番号・列番号）を教えてくれます。
- **2つのJSONファイルを手作業で比較するのは大変です。** 設定を変えたら何かが壊れた -- そんなとき、どこが違うのか知りたいですよね。差分比較ツール（diffツール）は、追加・削除・変更されたキーを正確に表示してくれます。目視で探す必要はもうありません。
- **深くネストされたJSONからデータを取り出したいけど、コードを書くのは面倒。** クエリツールを使えば、`$.users[*].name` のようなシンプルなパス構文で、必要なデータだけを取り出せます。さらに、スキーマ生成ツールはサンプルデータからJSONスキーマを自動生成します。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=json-toolkit&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vanNvbi10b29sa2l0LW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

`claude_desktop_config.json` に追加：

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

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `json_format` | JSONの整形（インデント指定可）またはミニファイ | 「このJSONを2スペースインデントで整形して：{"name":"Alice","age":30}」 |
| `json_validate` | JSONの構文チェック。エラーがあれば正確な位置を表示 | 「これは正しいJSON？ {key: value}」 |
| `json_diff` | 2つのJSONオブジェクトを比較し、すべての差分を一覧表示 | 「この2つのJSON設定ファイルの違いを教えて」 |
| `json_query` | `$.users[0].name` のようなパス構文でJSON内を検索 | 「このJSON配列からメールアドレスを全部取り出して」 |
| `json_transform` | フラット化、展開、キーの抽出・除外・リネーム | 「このネストされたJSONを1階層にフラット化して」 |
| `json_schema_generate` | サンプルデータからJSONスキーマを自動生成 | 「このAPIレスポンスからJSONスキーマを生成して」 |

## コピペで使える例

### 例 1: 乱雑なAPIレスポンスを整形・検証する

AIに聞いてみましょう：「このJSONをフォーマットして、正しいか検証して：{"users":[{"name":"Alice","scores":[98,87,95]},{"name":"Bob","scores":[72,88]}]}」

### 例 2: 2つの設定ファイルの差分を確認する

AIに聞いてみましょう：「この2つのJSONオブジェクトの差分を教えて：A = {"debug": true, "port": 3000, "host": "localhost"} B = {"debug": false, "port": 8080, "host": "localhost"}」

### 例 3: ネストされたJSONから特定のデータを取り出す

AIに聞いてみましょう：「$.users[*].email でクエリして、すべてのメールアドレスを一覧にして」

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 20回/日 |
| Pro | $29/月 | 50,000回/月 |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上で動作するクラウドサーバーです。AIクライアントのMCP設定にURLを追加するだけで、すぐに使い始められます。npm install も Docker も APIキーも不要です。

**Q: 処理できるJSONの最大サイズはどのくらいですか？**
A: 無料プランでは最大1MBのJSONペイロードに対応しています。一般的なAPIレスポンスや設定ファイルの大部分をカバーできます。より大きなファイルにはProプランをご検討ください。

**Q: JSONPathやjqの構文に対応していますか？**
A: クエリツールはJSONPathライクな構文（`$`、ドット記法、ワイルドカード、配列スライス）に対応しています。完全なjqではありませんが、開発者が日常的に必要とするクエリパターンのほとんどをカバーしています。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
