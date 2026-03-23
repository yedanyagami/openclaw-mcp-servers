# Color Palette MCP サーバー

[![Smithery](https://smithery.ai/badge/@openclaw-ai/color-palette-mcp)](https://smithery.ai/server/@openclaw-ai/color-palette-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--11--05-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-25%2Fday-green)](https://color-palette-mcp.yagami8095.workers.dev/mcp)

> AIアシスタントで配色生成、アクセシビリティのコントラスト確認、CSSグラデーション作成がすべてできます。

## これは何ですか？なぜ必要ですか？

- **相性の良い色の組み合わせを選ぶのは、思った以上に難しいものです。** 色彩理論には理由があります。このサーバーは本格的な色彩理論（補色、トライアド、類似色、スプリットコンプリメンタリー）に基づいて調和のとれたパレットを生成するので、デザインの専門知識がなくてもプロ品質の配色が手に入ります。
- **アクセシビリティはもはや任意ではありません。** WCAG 2.1（ウェブアクセシビリティガイドライン）では、文字色と背景色の最小コントラスト比が定められています。コントラストチェッカーを使えば、色の組み合わせがAA基準やAAA基準を満たしているか即座に判定できます。
- **Hex、RGB、HSL、Tailwindクラスの相互変換は面倒です。** デザイナーはHexコードで指定し、CSSではRGBを使い、フレームワークはTailwindクラスを使う。このサーバーならすべての形式を瞬時に変換し、任意の色に最も近いTailwindユーティリティクラスも見つけてくれます。

## クイックインストール

### Cursor（ワンクリック）

[![Cursorにインストール](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=color-palette&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vY29sb3ItcGFsZXR0ZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Claude Desktop

`claude_desktop_config.json` に追加：

```json
{
  "mcpServers": {
    "color-palette": {
      "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @openclaw-ai/color-palette-mcp
```

## ツール一覧

| ツール | 機能 | 使用例 |
|--------|------|--------|
| `generate_palette` | ベースカラーから色彩理論に基づいた調和パレットを生成 | 「#3b82f6を基に補色配色で5色のパレットを作って」 |
| `contrast_check` | 2色間のWCAG 2.1コントラスト比をチェック（AA/AAA判定） | 「青い背景 #3b82f6 に白文字は読みやすい？」 |
| `color_convert` | Hex、RGB、HSL、CSS色名の相互変換 | 「#ff6b35 をRGBとHSLに変換して」 |
| `css_gradient` | そのまま貼れるCSSグラデーションコード（線形・放射・円錐）を生成 | 「海の青から夕焼けのオレンジへのCSSグラデーションを作って」 |
| `tailwind_colors` | 任意のHexカラーに最も近いTailwind CSSユーティリティクラスを検索 | 「#3b82f6に一番近いTailwindクラスは？」 |

## コピペで使える例

### 例 1: 新しいプロジェクトの配色を作る

AIに聞いてみましょう：「SaaSダッシュボードを作っています。#3b82f6を基に補色配色で5色のパレットを生成して、各色の上に白文字が読みやすいかアクセシビリティもチェックして」

### 例 2: デザインのアクセシビリティを確認する

AIに聞いてみましょう：「文字色 #333333 と背景色 #f5f5f5 のWCAGコントラスト比をチェックして。AAとAAAに合格している？」

### 例 3: CSSグラデーションのコードを取得する

AIに聞いてみましょう：「#667eea から #764ba2 への左から右への線形グラデーションのCSSコードを作って、スタイルシートにそのまま貼れるようにして」

## 料金プラン

| プラン | 料金 | コール数 |
|--------|------|----------|
| 無料 | $0 | 25回/日 |
| Pro | $29/月 | 50,000回/月 |

## FAQ

**Q: 何かインストールする必要はありますか？**
A: いいえ。Cloudflare Workers上で動作するクラウドサービスです。MCP設定にURLを追加するだけで使い始められます。無料プランではAPIキーも不要です。

**Q: どの色彩理論のハーモニーに対応していますか？**
A: 補色、トライアド（三色配色）、類似色、スプリットコンプリメンタリー（分裂補色）、テトラード（四色配色）の5種類です。実際のデザインワークで最も役立つハーモニーを網羅しています。

**Q: コントラストチェッカーは最新のWCAG基準に準拠していますか？**
A: はい。WCAG 2.1の基準で通常テキスト（AA: 4.5:1、AAA: 7:1）と大きなテキスト（AA: 3:1、AAA: 4.5:1）の両方をチェックします。正確なコントラスト比も結果に含まれます。

## リンク

- [メインリポジトリ](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
- [全9サーバー](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers#available-mcp-servers)
- [English](README.md) · [繁體中文](README.zh-TW.md)

## ライセンス

MIT
