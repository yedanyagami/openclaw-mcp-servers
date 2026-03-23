# AgentForge AI Tool Compare MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/agentforge-compare-mcp)](https://smithery.ai/server/@openclaw-ai/agentforge-compare-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://agentforge-compare-mcp.yagami8095.workers.dev/mcp)

> Claude Code・Cursor・Copilot・Devinなどを徹底比較 -- 機能対照、価格分析、おすすめ提案をAIアシスタントから直接確認できます。

## これは何ですか？なぜ必要ですか？

- **AIコーディングツールが多すぎて、違いがよく分かりません。** Claude Code、Cursor、GitHub Copilot、Windsurf、Devin、Aider、Cline -- どれも「最強」を謳っていますが、料金体系もバラバラです。
- **このサーバーは、AIアシスタントに実データに基づくツール比較能力を追加します。** 「CursorとClaude Codeの違いは？」と聞くだけで、機能、価格、長所、短所を構造化した比較表が返ってきます。漠然とした意見ではなく、具体的なデータです。
- **サブスクリプションを契約する前に、正しい判断ができるようになります。** 初めてAIツールを選ぶ個人開発者でも、チームのツールを評価するリーダーでも、比較可能な明確なデータが手に入ります。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=agentforge-compare&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vYWdlbnRmb3JnZS1jb21wYXJlLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Claude Desktop

`claude_desktop_config.json` に追加：

```json
{
  "mcpServers": {
    "agentforge-compare": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/agentforge-compare-mcp
```

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `compare_ai_tools`（無料） | 2つ以上のAIツールを横並びで比較 | 「Claude Code vs Cursor vs Copilotを比較して」 |
| `get_tool_profile`（無料） | 機能、価格、長所・短所を含む詳細プロフィール | 「Devinの詳細プロフィールを見せて」 |
| `recommend_tool`（Pro） | あなたの要件に基づいたAIによるおすすめ提案 | 「Pythonバックエンド開発者に最適なAIコーディングツールは？」 |
| `get_pricing_comparison`（無料） | 追跡中のすべてのAIコーディングツールの料金一覧 | 「すべてのAIコーディングアシスタントの料金を見せて」 |
| `purchase_pro_key` | Pro APIキーの購入方法を案内 | 「おすすめ機能を使うにはどうアップグレードすればいい？」 |

## コピペで使える例

### 例 1: 購入前に2つのツールを比較する

AIに聞いてみましょう：「Claude CodeとCursorを横並びで比較して -- 機能、価格、長所、短所を教えて」

速度、精度、コスト、対応言語、IDE連携などの観点で各ツールがどう評価されるかの構造化された比較表と、どちらがどんな用途に向いているかのまとめが返ってきます。

### 例 2: 特定のツールの詳細プロフィールを確認する

AIに聞いてみましょう：「Windsurfについて全部教えて -- 料金、得意なこと、苦手なこと、どんな人に向いているか」

料金プラン、主要機能、既知の制限事項、理想的なユースケース、他ツールとの位置づけを含む完全なプロフィールが返ってきます。

### 例 3: 全ツールの料金を一覧で確認する

AIに聞いてみましょう：「Copilot、Cursor、Claude Code、Devin、Aider、Clineの料金比較を見せて」

月額コスト、無料枠の詳細、各料金プランに含まれる内容が一覧表で返ってきます。

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 10回/日 |
| Pro | $29/月 | 50,000回/月 |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上でホストされているリモートMCPサーバーです。MCPクライアントの設定にURLを追加するだけで、すぐに使えます。ダウンロード不要、無料プランではAPIキーも不要です。

**Q: どのAIツールが追跡されていますか？**
A: 現在はClaude Code、Cursor、GitHub Copilot、Windsurf、Devin、Aider、Cline、SWE-agentを追跡しています。関連性の高い新しいツールは随時追加されます。

**Q: データはどのくらい最新ですか？**
A: ツールのプロフィールと料金データは定期的に更新されています。ツールの大きなアップデートや料金変更があった場合、データはそれを反映するよう更新されます。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
