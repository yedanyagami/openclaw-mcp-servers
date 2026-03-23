# OpenClaw Market Intelligence MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/openclaw-intel-mcp)](https://smithery.ai/server/@openclaw-ai/openclaw-intel-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://openclaw-intel-mcp.yagami8095.workers.dev/mcp)

> AI市場の最新動向をオンデマンドで取得 -- 業界レポート、エコシステム統計、トレンド分析をAIアシスタントから直接利用できます。

## これは何ですか？なぜ必要ですか？

- **AI業界は毎週のように変化しています。** 新しいツールがリリースされ、企業が資金調達し、市場のダイナミクスが絶えず変わります。手作業で追い続けるのは大変で、すぐに情報が古くなってしまいます。
- **このサーバーは、AIアシスタントの中で直接マーケットインテリジェンスを提供します。** 「AIコーディングツール市場の最新動向は？」と聞くだけで、データ、トレンド、分析を含む構造化されたレポートが返ってきます。ブラウザのタブを開いたりGoogle検索をしたりする必要はありません。
- **開発者、起業家、アナリストのいずれにも役立ちます。** 競合の評価、市場概要の執筆、最新情報のキャッチアップなど、推測ではなく実際のデータに基づいた情報が得られます。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-intel&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctaW50ZWwtbWNwLnlhZ2FtaTgwOTUud29ya2Vycy5kZXYvbWNwIn0=)

### Claude Desktop

`claude_desktop_config.json` に追加：

```json
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/openclaw-intel-mcp
```

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `get_ai_market_report`（無料） | 任意のAIトピックに関するマーケットインテリジェンスレポートを取得 | 「AIコーディングアシスタントの市場レポートを見せて」 |
| `get_report_by_id`（Pro） | レポートIDを指定して特定のレポートを取得 | 「レポートID intel-2026-03-15 を取得して」 |
| `list_reports`（無料） | 利用可能な全レポートのタイトルと日付を一覧表示 | 「どんな市場レポートがありますか？」 |
| `get_market_stats`（無料） | ユーザー数、レポート数、データ更新日などのリアルタイム統計 | 「現在のAI市場の統計を見せて」 |
| `purchase_api_key` | Pro APIキーの購入方法を案内 | 「Proにアップグレードするには？」 |
| `validate_api_key`（無料） | APIキーの有効性と残り利用枠を確認 | 「APIキーのステータスを確認して」 |

## コピペで使える例

### 例 1: 市場の概要を取得する

AIに聞いてみましょう：「エージェントフレームワークのエコシステムについて、詳細なAI市場レポートを取得して」

市場規模、成長率、主要プレイヤー、投資シグナル、新興トレンドを含む構造化されたレポートが返ってきます。

### 例 2: 利用可能なレポートを確認する

AIに聞いてみましょう：「利用可能なマーケットインテリジェンスレポートを一覧表示して」

レポートのタイトル、日付、無料/Proアクセスの区分が一覧で表示されます。

### 例 3: リアルタイムのエコシステム統計を確認する

AIに聞いてみましょう：「現在のAI市場の統計データを教えて」

Proユーザー数、レポート数、データの最終更新日時などのリアルタイム数値が返ってきます。

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 10回/日 |
| Pro | $29/月 | 50,000回/月 |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上でホストされているリモートMCPサーバーです。MCPクライアントの設定にURLを追加するだけで、すぐに使えます。

**Q: 市場レポートにはどのようなデータが含まれていますか？**
A: レポートには市場規模の推定、成長率、主要プレイヤー、競争ポジショニング、資金調達シグナル、技術トレンド、将来の展望分析が含まれています。データは複数のソースから定期的に更新されます。

**Q: 無料プランとProプランの違いは何ですか？**
A: 無料プランでは1日10回のコールと、最新の市場レポート、統計、レポート一覧にアクセスできます。Proプランでは `get_report_by_id` によるレポートアーカイブ全体へのアクセスと、より高いレート制限が利用できます。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
