<p align="center">
  <h1 align="center">OpenClaw MCP サーバー</h1>
  <p align="center"><strong>49のAIツール · 9サーバー · 無料で始められる · 30秒で接続完了</strong></p>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Streamable_HTTP-blue" alt="MCP"></a>
  <a href="https://workers.cloudflare.com"><img src="https://img.shields.io/badge/Cloudflare-Workers-orange" alt="CF"></a>
  <a href="#利用可能な-mcp-サーバー"><img src="https://img.shields.io/badge/サーバー-9-green" alt="9"></a>
  <a href="#利用可能な-mcp-サーバー"><img src="https://img.shields.io/badge/ツール-49-green" alt="49"></a>
</p>

<p align="center">
  <a href="#クイックスタート">クイックスタート</a> &bull;
  <a href="#利用可能な-mcp-サーバー">全49ツール</a> &bull;
  <a href="#料金--利用方法">料金</a> &bull;
  <a href="#faq">FAQ</a> &bull;
  <a href="README.md">English</a> &bull;
  <a href="README.zh-TW.md">繁體中文</a>
</p>

---

## OpenClaw とは

OpenClaw は、**すぐに使える9つのAIツールサーバー**です。お使いのAIアシスタントが [MCP（Model Context Protocol）](https://modelcontextprotocol.io) に対応していれば、すぐに接続して利用できます。

- **インストール不要です。** 各サーバーはCloudflareのグローバルエッジネットワーク上で動いています。AIツールの設定にURLを貼り付けるだけで使えます。
- **無料で始められます。** 全てのサーバーに無料枠があります。クレジットカードもAPIキーもアカウント登録も不要です。
- **49の実用的なツール** を搭載。JSONの整形、正規表現の作成、カラーパレットの生成、タイムスタンプの変換、プロンプトの改善など、日常的な作業をサポートします。

AIアシスタントに新しいスキルを追加するようなものです。接続したら、あとは聞くだけです。

---

## なぜ OpenClaw か

| | OpenClaw | 一般的なMCPサーバー |
|--|----------|------------------|
| **セットアップ** | URLを貼り付けるだけ（30秒） | パッケージのインストール、設定、再起動が必要 |
| **ホスティング** | Cloudflareエッジ（世界300+拠点） | 自前でホストまたはDocker |
| **安定性** | グローバルCDN、自動フェイルオーバー | インフラ次第 |
| **レイテンシ** | 100ms未満（エッジコンピューティング） | 200-500ms（集中型） |
| **無料プラン** | あり（アカウント不要） | 多くはAPIキーが必要 |
| **有料プラン** | 月額$29で全9サーバー利用可能 | サーバーごとに個別料金 |

---

## 誰に向いているか

- **AI初心者の方** — 便利なツールを使いたいけど、複雑な設定はしたくない
- **開発者の方** — JSON、正規表現、カラー、タイムスタンプなどのユーティリティをAIワークフローに組み込みたい
- **コンテンツクリエイターの方** — プロンプト最適化、SEO分析、多言語パブリッシングツールが必要
- **チームの方** — 安定した管理型MCPサーバーセットを、明確な料金体系で利用したい

基本的な使い方にはプログラミングの知識は不要です。

---

## できること

接続後、AIアシスタントにこんなふうに話しかけてみてください：

| 用途 | プロンプト例 |
|------|------------|
| 雑なJSONを整形する | *「このJSONをフォーマットして、エラーがあれば教えて」* |
| 正規表現を作る | *「メールアドレスにマッチする正規表現を作って」* |
| 色のコントラストをチェック | *「この青い背景に白い文字、WCAG AAに適合してる？」* |
| タイムゾーン変換 | *「東京の午後3時は、ニューヨークとロンドンでは何時？」* |
| プロンプトを改善する | *「このプロンプトを採点して、改善点を教えて」* |

---

## 利用可能な MCP サーバー

### Cursorでワンクリックインストール

| サーバー | インストール | ツール数 | 無料/日 |
|----------|------------|---------|---------|
| JSON Toolkit | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=json-toolkit&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vanNvbi10b29sa2l0LW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 6 | 20 |
| Regex Engine | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=regex-engine&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcmVnZXgtZW5naW5lLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 5 | 20 |
| Color Palette | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=color-palette&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vY29sb3ItcGFsZXR0ZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==) | 5 | 25 |
| Timestamp Converter | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=timestamp-converter&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vdGltZXN0YW1wLWNvbnZlcnRlci1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==) | 5 | 30 |
| Prompt Enhancer | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-enhancer&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcHJvbXB0LWVuaGFuY2VyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 6 | 10 |
| Market Intelligence | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-intel&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctaW50ZWwtbWNwLnlhZ2FtaTgwOTUud29ya2Vycy5kZXYvbWNwIn0=) | 6 | 10 |
| Fortune & Tarot | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-fortune&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctZm9ydHVuZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==) | 3 | 50 |
| Content Publisher | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=moltbook-publisher&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vbW9sdGJvb2stcHVibGlzaGVyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 8 | 5 |
| AI Tool Compare | [![インストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=agentforge-compare&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vYWdlbnRmb3JnZS1jb21wYXJlLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9) | 5 | 10 |

---

## クイックスタート

### 方法A：Cursor（ワンクリック）

上のテーブルにある **インストール** ボタンをクリックするだけです。

### 方法B：Claude Desktop

`claude_desktop_config.json` に以下を追加してください：

```json
{
  "mcpServers": {
    "openclaw-json": { "type": "streamable-http", "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-regex": { "type": "streamable-http", "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-colors": { "type": "streamable-http", "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-timestamp": { "type": "streamable-http", "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-prompt": { "type": "streamable-http", "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-intel": { "type": "streamable-http", "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-fortune": { "type": "streamable-http", "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-moltbook": { "type": "streamable-http", "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp" },
    "openclaw-agentforge": { "type": "streamable-http", "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp" }
  }
}
```

### 方法C：その他のMCPクライアント

上記のサーバーURLを使い、Streamable HTTPトランスポートで接続してください。Claude Code、Windsurf、Clineなど、MCP対応のツールで利用できます。

---

## Product Store

デジタル製品、ガイド、APIアクセスの一覧はこちら：

**[product-store.yagami8095.workers.dev](https://product-store.yagami8095.workers.dev)**

プロンプト集、自動化ガイド、スターターキット、Pro APIキーなどをご用意しています。

---

## 料金 / 利用方法

<table>
<tr><th>プラン</th><th>料金</th><th>内容</th></tr>
<tr><td><strong>Free（無料）</strong></td><td>$0</td><td>月1,000コール、3サーバーまで利用可能（アカウント不要）</td></tr>
<tr><td><strong>Pro</strong></td><td><strong>$29/月</strong></td><td>月50,000コール、全9サーバー + Pro限定ツール</td></tr>
<tr><td><strong>Enterprise</strong></td><td><strong>$99/月</strong></td><td>月500,000コール + 優先ルーティング + 24時間サポート</td></tr>
<tr><td><strong>Credit Pack</strong></td><td>$29（買い切り）</td><td>5,000クレジット（有効期限なし）</td></tr>
</table>

### Proキーの取得方法

| 方法 | リンク |
|------|--------|
| **Product Store** | [product-store.yagami8095.workers.dev](https://product-store.yagami8095.workers.dev) |
| **PayPal** | [paypal.me/Yagami8095/29](https://paypal.me/Yagami8095/29) |

お支払い後、Pro APIキーは即座に発行されます。ご質問は **yagami8095@gmail.com** までお気軽にどうぞ。

---

## 言語サポート

本プロジェクトは3つの言語で提供しています：

- **[English](README.md)** — 英語版
- **[繁體中文](README.zh-TW.md)** — 繁体字中国語版
- **日本語** — 現在ご覧のページです

---

## FAQ

**Q：何かインストールする必要はありますか？**
A：いいえ。OpenClawのサーバーはクラウドで動いています。AIツールの設定にURLを貼り付けるだけです。

**Q：アカウントやAPIキーは必要ですか？**
A：いいえ。無料プランはアカウントなしで利用できます。接続するだけで使えます。

**Q：MCPとは何ですか？**
A：MCP（Model Context Protocol）は、AIアシスタントが外部ツールを使えるようにするオープン標準です。「AIのためのUSBポート」のようなもので、新しい機能を統一的な方法で追加できます。

**Q：どのAIツールで使えますか？**
A：MCPに対応しているツールならどれでも使えます。Cursor、Claude Desktop、Claude Code、Windsurf、Clineなどに対応しています。

**Q：無料枠を使い切ったらどうなりますか？**
A：サーバーからレートリミットのメッセージが返されます。リセットを待つか、Proにアップグレードしてより多くのコールを利用できます。

---

## トラブルシューティング

**「接続拒否」または「サーバーが見つからない」**
- URLの末尾が `/mcp` になっているか確認してください（例：`https://json-toolkit-mcp.yagami8095.workers.dev/mcp`）
- ご利用のAIツールがStreamable HTTPトランスポートに対応しているか確認してください

**「使用制限超過」**
- 無料プランでは各サーバーに1日の上限があります（上の表を参照）
- 日次リセットを待つか、Proにアップグレードしてください

**設定後にツールが表示されない**
- サーバー設定を追加した後、AIツールを再起動してください
- JSON設定に構文エラーがないか確認してください

---

## ドキュメント / 次のステップ

- **[アーキテクチャ](ARCHITECTURE.md)** — OpenClawの技術構成
- **[コントリビューションガイド](CONTRIBUTING.md)** — ツールの追加やサーバーの改善方法
- **[セキュリティポリシー](SECURITY.md)** — セキュリティに関するポリシーと報告方法
- **[デモ](DEMO.md)** — その他の使用例

---

## OpenClaw を応援する

皆様のサポートにより、これらのサーバーを無料で維持・運営できます。

[![GitHubでスポンサーになる](https://img.shields.io/badge/Sponsor-%E2%9D%A4-red)](https://github.com/sponsors/yedanyagamiai-cmd)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-サポート-blue)](https://ko-fi.com/openclaw)
[![PayPal](https://img.shields.io/badge/PayPal-寄付-blue)](https://paypal.me/Yagami8095)
[![Proキー](https://img.shields.io/badge/Pro_Key-%2429%2F月-green)](https://product-store.yagami8095.workers.dev/products/ecosystem-pro)

---

## 信頼性に関する注記

- **オープンソース** — MITライセンス、ソースコード全公開
- **ロックインなし** — 標準MCPプロトコル、いつでも乗り換え可能
- **エッジホスティング** — Cloudflare Workers、世界300+拠点
- **トラッキングなし** — サーバーはリクエストを処理して結果を返すだけです
- **MCP仕様準拠** — Streamable HTTPトランスポート対応

---

<p align="center">
  <a href="README.md">English</a> &bull;
  <a href="README.zh-TW.md">繁體中文版</a>
</p>

<p align="center">
  <a href="https://product-store.yagami8095.workers.dev">OpenClaw</a> が開発 — 9サーバー、49ツール、オープンソース
</p>
