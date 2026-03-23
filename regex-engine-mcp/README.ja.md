# Regex Engine MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/regex-engine-mcp)](https://smithery.ai/server/@openclaw-ai/regex-engine-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://regex-engine-mcp.yagami8095.workers.dev/mcp)

> 自然言語で正規表現の作成・テスト・解読ができます。もう正規表現で悩む必要はありません。

## これは何ですか？なぜ必要ですか？

- **正規表現は強力ですが、書くのが難しいことで有名です。** ほとんどの開発者は正規表現が必要になるたびにGoogleで検索しています。このサーバーなら「日本の電話番号にマッチする正規表現を作って」のように日本語で説明するだけで、動作する正規表現を自動生成してくれます。
- **他人が書いた正規表現は暗号のように見えます。** 解説ツールを使えば、どんな正規表現でもステップごとに分かりやすく説明してくれます。`^(?:[a-z0-9]+(?:\.[a-z0-9]+)*)@` が何を意味するのか、もう推測する必要はありません。
- **別のツールに切り替えて正規表現をテストすると、作業の流れが途切れます。** regex101.comに移動する代わりに、AIアシスタントの中でパターンのテスト、マッチの抽出、検索置換がすべてできます。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=regex-engine&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcmVnZXgtZW5naW5lLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

`claude_desktop_config.json` に追加：

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

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `regex_test` | 正規表現パターンをテキストに対してテストし、マッチ箇所と位置を返す | 「この文字列に有効なメールアドレスが含まれているかテストして」 |
| `regex_explain` | 正規表現パターンをステップごとに分かりやすく解説 | 「この正規表現の意味を教えて：^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$」 |
| `regex_build` | 自然言語の説明から正規表現を自動生成 | 「YYYY-MM-DD形式の日付にマッチする正規表現を作って」 |
| `regex_replace` | キャプチャグループ対応の正規表現による検索置換 | 「テキスト内のすべての日付をMM/DD/YYYYからYYYY-MM-DDに変換して」 |
| `regex_extract` | テキストからマッチするすべての部分文字列を抽出 | 「この文章からすべてのURLを抽出して」 |

## コピペで使える例

### 例 1: 説明文から正規表現を作る

AIに聞いてみましょう：「メールアドレスにマッチする正規表現を作って、このテキストでテストして：お問い合わせは hello@example.com または support@company.co.jp まで。」

### 例 2: コードの中で見つけた正規表現を理解する

AIに聞いてみましょう：「コードベースで見つけたこの正規表現を解説して：(?:(?:\r\n)?[ \t])*(?:(?:[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)」

### 例 3: テキストからデータを抽出する

AIに聞いてみましょう：「このテキストからすべての電話番号を抽出して：お電話は 03-1234-5678 または 090-1234-5678 まで。海外：+44 20 7946 0958」

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 20回/日 |
| Pro | $29/月 | 50,000回/月 |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上で動作するクラウドサービスです。AIクライアントのMCP設定にURLを追加するだけですぐに使えます。依存関係もAPIキーもセットアップも不要です。

**Q: どの正規表現フレーバー（方言）に対応していますか？**
A: JavaScriptの正規表現（ECMAScript）です。名前付きキャプチャグループ、先読み（ルックアヘッド）、すべての標準フラグ（g, i, m, s, u）を含め、Web開発者や一般的なプログラマーが必要とするケースの99%をカバーしています。

**Q: 再帰マッチングのような複雑なパターンにも対応していますか？**
A: JavaScriptの正規表現がサポートするすべてのパターンに対応しています。括弧の対応チェックのような本当に複雑なパターンについては、可能な限り最善の近似パターンを生成し、制限事項を説明します。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
