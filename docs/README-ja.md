# OpenClaw MCP サーバー

## 49 AI ツール。9 サーバー。セットアップ不要。10秒で接続。

OpenClaw は、プロダクション品質の AI ツールをエディタに接続する最速の方法です。すべてのサーバーは Cloudflare のグローバルエッジネットワークにデプロイされ、レイテンシは 100ms 未満。API キー、Docker、Node.js、ビルドステップは一切不要です。

URL を貼り付けて、エディタを再起動するだけ。それだけで始められます。

---

## MCP とは？

MCP（Model Context Protocol）は、AI アシスタントが外部ツールを使用するための標準プロトコルです。AI の USB インターフェースと考えてください -- ユニバーサルコネクタです。

MCP なしの AI はテキスト生成のみ。MCP があれば、AI は以下のことができます：
- JSON ファイルの検証とフォーマット
- 正規表現のテストと解説
- WCAG 色コントラストのチェック
- タイムゾーン間のタイムスタンプ変換
- AI プロンプトの品質改善
- 市場トレンドと競合情報のスキャン
- タロットカード占い
- コンテンツの作成と予約投稿
- AI モデルの機能とコスト比較

---

## なぜ OpenClaw？

| 比較項目 | セルフホスト MCP | Smithery | 個別ツールサーバー | **OpenClaw** |
|---|---|---|---|---|
| セットアップ時間 | サーバーごとに 30-60分 | 5-15分 | 10-20分 | **10秒** |
| サーバー管理 | 自分で維持 | マーケットプレイス依存 | 設定がバラバラ | **メンテナンス不要** |
| 稼働率 | インフラ次第 | 不安定 | SLA なし | **99.9% Cloudflare** |
| 平均レイテンシ | ネットワーク依存 | 200-500ms | バラバラ | **<100ms エッジ** |
| 無料プラン | なし（自分のコスト） | 限定的 | まれ | **3台、1日20回** |
| Pro 価格 | 自分のコンピュート費用 | $15-30/月 | 個別課金 | **$9/月で全部** |
| 多言語ドキュメント | まれ | 英語のみ | 英語のみ | **英語+繁体中文+日本語** |

---

## 対象ユーザー

- **開発者**：エディタ内で信頼性の高い JSON、正規表現、タイムスタンプツールが必要
- **AI エンジニア**：プロンプトチェーンの構築、モデル比較、市場インテリジェンスの実行
- **初心者**：何もインストールせずに MCP を試したい
- **チーム**：プロジェクト全体で一貫したツールインフラが必要

---

## サーバー一覧

| # | サーバー | ツール数 | ツール一覧 |
|---|---|---|---|
| 1 | **JSON Toolkit** | 6 | json_format, json_validate, json_diff, json_query, json_transform, json_schema_generate |
| 2 | **Regex Engine** | 5 | regex_test, regex_extract, regex_replace, regex_explain, regex_generate |
| 3 | **Color Palette** | 5 | color_info, generate_palette, contrast_check, css_gradient, closest_to |
| 4 | **Timestamp Converter** | 5 | convert, time_diff, cron_explain, timezone_list, now_in_tz |
| 5 | **Prompt Enhancer** | 6 | enhance, rewrite, chain_of_thought, few_shot, system_prompt, compare |
| 6 | **Market Intelligence** | 6 | tech_scan, trend_report, competitor_brief, market_size, news_digest, alert_setup |
| 7 | **Fortune & Tarot** | 3 | fortune, tarot_reading, compatibility |
| 8 | **Content Publisher** | 8 | create_article, schedule_post, seo_analyze, headline_test, content_calendar, repurpose, translate, publish |
| 9 | **AI Tool Compare** | 5 | compare_models, benchmark, cost_calc, feature_matrix, recommend |

**合計：9 サーバー、49 ツール**

---

## クイックスタート（3ステップ）

### ステップ 1：サーバーを選ぶ

JSON Toolkit から始めることをお勧めします。JSON は最も広く使われるフォーマットです。

### ステップ 2：設定を追加

**Cursor** の場合、ワンクリックインストール：

[![Cursor にインストール](https://cursor.com/deeplink/mcp-install-badge.svg)](https://cursor.com/install-mcp?name=json-toolkit&config=json-toolkit.yagami8095.workers.dev/mcp)

**Claude Desktop** の場合、`claude_desktop_config.json` に追加：

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit.yagami8095.workers.dev/mcp"
    }
  }
}
```

### ステップ 3：再起動して使い始める

クライアントを閉じて再度開き、試してみてください：

> 「この JSON を検証して：`{"name": "test", "value": 42,}`」

AI が自動的に `json_validate` を呼び出し、末尾カンマのエラーを見つけ、修正方法を教えてくれます。

---

## 料金

| プラン | 価格 | 内容 |
|---|---|---|
| **無料** | $0 | サーバー3台、各1日20回、登録不要 |
| **Pro** | $9/月 | 全9サーバー、月50,000回、優先サポート |
| **Enterprise** | お問い合わせ | カスタムツール、99.99% SLA、専任サポート |

無料プランは登録もクレジットカードも不要です。URL を貼り付けるだけで始められます。

---

## よくある質問

**プログラミング経験は必要？**
不要です。URL を設定ファイルにコピー＆ペーストするだけ。

**本当に無料？**
はい。サーバー3台、1日20回、登録不要。もっと必要なら Pro にアップグレード。

**対応クライアントは？**
すべての MCP 互換クライアント：Claude Desktop、Cursor、Windsurf、Cline、Continue など。

**ツールが表示されない場合は？**
設定保存後にクライアントを再起動。最も一般的な原因は再起動忘れです。

**API キーは必要？**
不要。すべてのサーバーは無料版でキーや認証情報なしで動作します。

---

## アーキテクチャ

```
あなたのエディタ（Claude Desktop / Cursor / Windsurf）
        |
        | MCP プロトコル（HTTP 上の JSON-RPC）
        |
   Cloudflare エッジネットワーク（300+ 都市）
        |
        +-- json-toolkit.yagami8095.workers.dev/mcp
        +-- regex-engine.yagami8095.workers.dev/mcp
        +-- ...（全9サーバー）
```

各サーバーは Cloudflare Worker で、グローバルエッジにデプロイされています。MCP クライアントがツール呼び出しを送信すると、最寄りの Cloudflare データセンターにルーティングされ、100ms 以内に実行が完了して結果が返されます。オリジンサーバーなし。コールドスタートなし。管理するインフラなし。

---

## ドキュメント

| ドキュメント | 説明 |
|---|---|
| [はじめに](GETTING-STARTED.md) | 初回インストールガイド |
| [FAQ](FAQ.md) | よくある質問10選 |
| [トラブルシューティング](TROUBLESHOOTING.md) | 一般的な問題の解決 |
| [繁体中文版](README-zh-TW.md) | 繁体中文プロダクトページ |
| [英語版](../README.md) | 完全な英語ドキュメント |

---

## 始めましょう

- **無料で試す** -- 今すぐサーバー URL をクライアントに貼り付け。登録不要。
- **Pro にアップグレード** -- $9/月で全9サーバーと50,000回のコールを解放
- **スターを付ける** -- より多くの人が OpenClaw を見つけられるように

---

MIT ライセンス | Cloudflare Workers で構築 | [OpenClaw プロジェクト](https://github.com/yagami8095/openclaw-mcp-servers)
