# Getting Started with OpenClaw MCP Servers

## English

### What is MCP?

MCP (Model Context Protocol) is a standard that lets AI assistants use external tools. Think of it like USB for AI -- a universal connector. When you add an MCP server to your editor, the AI gains new abilities. For example, adding the JSON Toolkit server means your AI can validate, format, and transform JSON files directly.

You do not need to understand the protocol. You just need to paste a URL.

### Who Is This For?

- **You use Claude Desktop, Cursor, or Windsurf** and want more capabilities
- **You work with JSON, regex, timestamps, or colors** regularly
- **You want AI-powered tools** without managing infrastructure
- **You are new to MCP** and want the easiest possible starting point

### Before You Start

You need one of these MCP-compatible clients installed:

| Client | Download |
|---|---|
| Claude Desktop | [claude.ai/download](https://claude.ai/download) |
| Cursor | [cursor.com](https://cursor.com) |
| Windsurf | [codeium.com/windsurf](https://codeium.com/windsurf) |

That is the only prerequisite. No API keys, no Docker, no Node.js, no Python.

### Install in 3 Steps

**Step 1: Pick a server**

Start with JSON Toolkit. It has 6 tools that everyone can use immediately.

**Step 2: Add the server URL to your client**

For **Cursor**, click this button:

[![Install JSON Toolkit in Cursor](https://cursor.com/deeplink/mcp-install-badge.svg)](https://cursor.com/install-mcp?name=json-toolkit&config=json-toolkit.yagami8095.workers.dev/mcp)

For **Claude Desktop**, open Settings > Developer > Edit Config and add:

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit.yagami8095.workers.dev/mcp"
    }
  }
}
```

<!-- Screenshot placeholder: assets/claude-desktop-config.png -->

**Step 3: Restart your client**

Close and reopen Claude Desktop or Cursor. The tools will appear automatically.

<!-- Screenshot placeholder: assets/tools-visible.png -->

### Your First Successful Use

After installing JSON Toolkit, try this in your chat:

> "Validate this JSON: `{"name": "test", "value": 42,}`"

The AI will call `json_validate`, detect the trailing comma error, and explain the fix. Then ask:

> "Format it nicely"

The AI calls `json_format` and returns properly indented, valid JSON.

Congratulations. You are using MCP.

### Common Mistakes

| Mistake | Fix |
|---|---|
| Forgetting to restart the client | Always restart after changing config |
| Adding a trailing comma in the JSON config | JSON does not allow trailing commas. Remove them. |
| Using `http://` instead of `https://` | All OpenClaw servers use HTTPS. |
| Misspelling the server URL | Copy-paste from the [Server Index](../README.md#server-index) |

### What to Try Next

1. Add **Regex Engine** for pattern matching and testing
2. Add **Timestamp Converter** if you work with dates and time zones
3. Add **Prompt Enhancer** to improve your AI prompts before sending them
4. Explore all 9 servers in the [Server Index](../README.md#server-index)

---

## ZH-TW

### MCP 是什麼？

MCP（模型上下文協議）是一個讓 AI 助手使用外部工具的標準。可以把它想像成 AI 的 USB -- 一個通用連接器。當你將 MCP 伺服器加入編輯器，AI 就獲得了新能力。例如，加入 JSON Toolkit 伺服器後，AI 就能直接驗證、格式化和轉換 JSON 檔案。

你不需要理解協議本身。只需要貼上一個網址。

### 這是給誰的？

- **你使用 Claude Desktop、Cursor 或 Windsurf**，想要更多功能
- **你經常處理 JSON、正則表達式、時間戳或色彩**
- **你想要 AI 驅動的工具**，但不想管理基礎設施
- **你是 MCP 新手**，想要最簡單的起步方式

### 開始前需要什麼

你需要安裝以下任一 MCP 相容用戶端：

| 用戶端 | 下載 |
|---|---|
| Claude Desktop | [claude.ai/download](https://claude.ai/download) |
| Cursor | [cursor.com](https://cursor.com) |
| Windsurf | [codeium.com/windsurf](https://codeium.com/windsurf) |

這是唯一的前提條件。不需要 API 金鑰、Docker、Node.js 或 Python。

### 3 步驟安裝

**步驟 1：選一台伺服器**

從 JSON Toolkit 開始。它有 6 個每個人都能立即使用的工具。

**步驟 2：將伺服器網址加入用戶端**

**Cursor** 使用者，點擊安裝按鈕：

[![在 Cursor 安裝 JSON Toolkit](https://cursor.com/deeplink/mcp-install-badge.svg)](https://cursor.com/install-mcp?name=json-toolkit&config=json-toolkit.yagami8095.workers.dev/mcp)

**Claude Desktop** 使用者，開啟 Settings > Developer > Edit Config 並加入：

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit.yagami8095.workers.dev/mcp"
    }
  }
}
```

**步驟 3：重新啟動用戶端**

關閉並重新開啟 Claude Desktop 或 Cursor。工具會自動出現。

### 你的第一次成功使用

安裝 JSON Toolkit 後，在聊天中嘗試：

> 「驗證這個 JSON：`{"name": "test", "value": 42,}`」

AI 會呼叫 `json_validate`，偵測到尾隨逗號錯誤，並解釋修正方法。然後問：

> 「幫我格式化」

AI 呼叫 `json_format`，返回正確縮排的有效 JSON。

恭喜，你已經在使用 MCP 了。

### 常見錯誤

| 錯誤 | 修正 |
|---|---|
| 忘記重新啟動用戶端 | 修改設定後務必重新啟動 |
| 在 JSON 設定中加了尾隨逗號 | JSON 不允許尾隨逗號，請移除 |
| 使用 `http://` 而非 `https://` | 所有 OpenClaw 伺服器使用 HTTPS |
| 拼錯伺服器網址 | 從[伺服器列表](../README.md#server-index)複製貼上 |

### 下一步

1. 加入 **Regex Engine** 進行模式匹配和測試
2. 加入 **Timestamp Converter** 處理日期和時區
3. 加入 **Prompt Enhancer** 在送出前改善你的 AI 提示
4. 探索全部 9 台伺服器：[伺服器列表](../README.md#server-index)

---

## JA

### MCP とは？

MCP（Model Context Protocol）は、AI アシスタントが外部ツールを使用するための標準規格です。AI の USB のようなもの -- ユニバーサルコネクタです。MCP サーバーをエディタに追加すると、AI は新しい能力を獲得します。例えば、JSON Toolkit サーバーを追加すると、AI が JSON ファイルの検証、フォーマット、変換を直接行えるようになります。

プロトコルを理解する必要はありません。URL を貼り付けるだけです。

### 対象ユーザー

- **Claude Desktop、Cursor、Windsurf を使用**していて、より多くの機能が欲しい方
- **JSON、正規表現、タイムスタンプ、カラー**を日常的に扱う方
- **AI 駆動のツール**をインフラ管理なしで使いたい方
- **MCP 初心者**で、最も簡単な出発点を求めている方

### 始める前に

以下の MCP 互換クライアントのいずれかが必要です：

| クライアント | ダウンロード |
|---|---|
| Claude Desktop | [claude.ai/download](https://claude.ai/download) |
| Cursor | [cursor.com](https://cursor.com) |
| Windsurf | [codeium.com/windsurf](https://codeium.com/windsurf) |

前提条件はこれだけです。API キー、Docker、Node.js、Python は不要です。

### 3ステップでインストール

**ステップ 1：サーバーを選ぶ**

JSON Toolkit から始めましょう。誰でもすぐ使える 6 つのツールがあります。

**ステップ 2：サーバー URL をクライアントに追加**

**Cursor** の場合、インストールボタンをクリック：

[![Cursor に JSON Toolkit をインストール](https://cursor.com/deeplink/mcp-install-badge.svg)](https://cursor.com/install-mcp?name=json-toolkit&config=json-toolkit.yagami8095.workers.dev/mcp)

**Claude Desktop** の場合、Settings > Developer > Edit Config を開いて追加：

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit.yagami8095.workers.dev/mcp"
    }
  }
}
```

**ステップ 3：クライアントを再起動**

Claude Desktop または Cursor を閉じて再度開きます。ツールが自動的に表示されます。

### 初めての成功体験

JSON Toolkit をインストール後、チャットで試してみてください：

> 「この JSON を検証して：`{"name": "test", "value": 42,}`」

AI が `json_validate` を呼び出し、末尾カンマのエラーを検出し、修正方法を説明します。次に：

> 「フォーマットして」

AI が `json_format` を呼び出し、適切にインデントされた有効な JSON を返します。

おめでとうございます。MCP を使い始めました。

### よくある間違い

| 間違い | 修正 |
|---|---|
| クライアントの再起動を忘れる | 設定変更後は必ず再起動 |
| JSON 設定に末尾カンマを入れる | JSON では末尾カンマは許可されません |
| `https://` ではなく `http://` を使用 | すべての OpenClaw サーバーは HTTPS |
| サーバー URL のスペルミス | [サーバー一覧](../README.md#server-index)からコピー&ペースト |

### 次のステップ

1. **Regex Engine** でパターンマッチングとテスト
2. **Timestamp Converter** で日付とタイムゾーンの処理
3. **Prompt Enhancer** で AI プロンプトの改善
4. 全 9 サーバーを探索：[サーバー一覧](../README.md#server-index)
