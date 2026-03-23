# Prompt Enhancer MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/prompt-enhancer-mcp)](https://smithery.ai/server/@openclaw-ai/prompt-enhancer-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday%20free%2C%20100%20Pro-green)](https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp)

> AIプロンプトの採点・改善・生成ができる、人間とAIのコミュニケーションのための文章コーチです。

## これは何ですか？なぜ必要ですか？

- **良いプロンプトを書くだけで、AIの出力品質が劇的に向上します。** 「AIについて書いて」という曖昧な指示と、構造化されたプロンプトでは、出力品質に10倍の差が出ることもあります。このサーバーはプロンプトを分析し、0〜100でスコアリングし、何を改善すべきか具体的に教えてくれます。プロンプトエンジニアリングの専門家がいつでも相談に乗ってくれるようなものです。
- **システムプロンプトをゼロから書くのは時間がかかります。** カスタマーサポートエージェント、コードレビュアー、クリエイティブライター -- どんな役割でも、このサーバーが用途に合わせた本番品質のシステムプロンプトを数秒で生成してくれます。
- **プロンプトの形式はAIツールやフレームワークごとに異なります。** XMLタグ、Markdownヘッダー、JSON -- それぞれ違う形式を使っています。フォーマット変換ツールを使えば、プレーンテキスト、XML、Markdown、JSONの間で自由に変換でき、異なるAIプラットフォーム間でプロンプトを再利用できます。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-enhancer&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcHJvbXB0LWVuaGFuY2VyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

`claude_desktop_config.json` に追加：

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

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `enhance_prompt`（無料） | 曖昧なプロンプトを明確で効果的なものに書き換え | 「このプロンプトを改善して：AIについてブログを書いて」 |
| `analyze_prompt`（無料） | プロンプトの品質を0〜100でスコアリングし、改善点を提案 | 「このプロンプトを分析して採点して：犬について教えて」 |
| `convert_prompt_format`（無料） | プレーンテキスト、XML、Markdown、JSON間でプロンプト形式を変換 | 「このプロンプトをClaude向けのXML形式に変換して」 |
| `generate_system_prompt`（無料） | 任意の用途に合わせた役割別システムプロンプトを生成 | 「シニアコードレビュアー用のシステムプロンプトを生成して」 |
| `prompt_template_library`（Pro） | 30以上の本番品質プロンプトテンプレートをカテゴリ別に閲覧 | 「コンテンツライティング用のプロンプトテンプレートを全部見せて」 |
| `purchase_pro_key` | ProプランのAPIキー取得方法を案内 | 「Proにアップグレードするにはどうすればいい？」 |

## コピペで使える例

### 例 1: 弱いプロンプトを改善する

AIに聞いてみましょう：「このプロンプトを分析してから改善して：ブログ用に機械学習について何か書いて」

### 例 2: 新しいAIエージェント用のシステムプロンプトを作る

AIに聞いてみましょう：「返金リクエストに対応するカスタマーサポートエージェント用のシステムプロンプトを作って。フレンドリーだけど毅然とした口調で」

### 例 3: 別のAIツール用にプロンプトの形式を変換する

AIに聞いてみましょう：「このプレーンテキストのプロンプトをClaude用のXML形式に変換して：あなたは親切なコーディングアシスタントです。常にステップバイステップで理由を説明してください。できるだけ例を使ってください。」

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 10回/日（4ツール） |
| Pro | $29/月 | 50,000回/月（全6ツール） |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上で動作しています。MCP設定にURLを追加するだけで、プロンプトの改善を始められます。無料プランはAPIキーなしですぐに使えます。

**Q: プロンプトのスコアが高い・低いの基準は何ですか？**
A: アナライザーは明確さ（曖昧さがないか）、具体性（スコープ、形式、長さが定義されているか）、構造（コンテキストと制約があるか）、完全性（エッジケースがカバーされているか）を評価します。80点以上であれば本番品質のプロンプトと言えます。

**Q: 無料で使える4ツールとProが必要なツールはどれですか？**
A: `enhance_prompt`、`analyze_prompt`、`convert_prompt_format`、`generate_system_prompt` は完全無料（1日10回）です。30以上のテンプレートが使える `prompt_template_library` にはProキーが必要です。`purchase_pro_key` でアップグレード方法を確認できます。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
