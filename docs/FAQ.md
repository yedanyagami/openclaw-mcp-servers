# Frequently Asked Questions

## English

### 1. What is MCP?

**Q:** What is MCP and why should I care?

**A:** MCP (Model Context Protocol) is a standard that lets AI assistants call external tools. It is like giving your AI a toolbox. Without MCP, your AI can only generate text. With MCP, it can validate JSON, check color contrast, convert timestamps, and 46 other things.

**Why it matters:** MCP is becoming the standard for AI tool integration. Learning it now puts you ahead.

**Next:** See [Getting Started](GETTING-STARTED.md) to install your first server.

### 2. Do I need coding experience?

**Q:** I am not a programmer. Can I still use this?

**A:** Yes. The setup requires pasting a URL into a config file. If you can copy and paste, you can use OpenClaw. The AI handles everything after that -- you just type what you want in plain language.

**Why:** MCP was designed for end users, not just developers. The tools work through conversation.

**Next:** Follow the [3-step install](GETTING-STARTED.md#install-in-3-steps) guide.

### 3. Which server should I try first?

**Q:** There are 9 servers. Where do I start?

**A:** Start with **JSON Toolkit**. JSON is everywhere -- config files, API responses, data exports. The 6 tools (validate, format, diff, query, transform, schema generate) are useful in every project.

**Why:** It gives the most immediate value. You will use it within minutes of installing.

**Next:** Install JSON Toolkit from the [Server Index](../README.md#server-index).

### 4. How do I install a server?

**Q:** What is the actual installation process?

**A:** For Cursor: click the one-click install badge. For Claude Desktop: add a JSON block to your config file, then restart. That is it. No downloads, no build steps, no API keys.

**Why:** The servers run on Cloudflare's edge network. There is nothing to install locally.

**Next:** Step-by-step with screenshots in [Getting Started](GETTING-STARTED.md).

### 5. What is the difference between Free and Pro?

**Q:** Why would I pay when the free tier exists?

**A:** Free gives you 3 servers with 20 calls/day each. Pro ($9/month) unlocks all 9 servers with 50,000 calls/month and priority support. If you use OpenClaw daily or need more than 3 servers, Pro pays for itself quickly.

**Why:** The free tier is for trying things out. Pro is for daily use.

**Next:** See [Pricing](../README.md#pricing) for the full comparison.

### 6. What happens when I hit the call limit?

**Q:** I used 20 calls today. Now what?

**A:** On the Free tier, calls reset at midnight UTC. You will get a clear error message saying the limit was reached. You can either wait until tomorrow or upgrade to Pro for 50,000 calls/month.

**Why:** Limits prevent abuse and keep the service free for everyone.

**Next:** Upgrade to Pro if you need more capacity.

### 7. Does it work with Claude Desktop and Cursor?

**Q:** Which editors are supported?

**A:** Any MCP-compatible client works. This includes Claude Desktop, Cursor, Windsurf, Cline, Continue, and any future client that supports the MCP standard. The server does not care which client connects to it.

**Why:** MCP is a protocol, not a product. OpenClaw implements the standard, so it works everywhere.

**Next:** See client-specific setup in [Getting Started](GETTING-STARTED.md).

### 8. A tool is not appearing in my client. What do I do?

**Q:** I added the config but the tools do not show up.

**A:** Three things to check: (1) Restart your client -- tools only load on startup. (2) Verify the URL ends with `/mcp`. (3) Check that your JSON config has no syntax errors (no trailing commas, correct brackets).

**Why:** The most common cause is forgetting to restart. The second most common is a JSON syntax error in the config.

**Next:** Full checklist in [Troubleshooting](TROUBLESHOOTING.md).

### 9. Do I need API keys for any of the servers?

**Q:** Will I need to sign up for anything or enter credentials?

**A:** No. All 9 servers work without API keys on the Free tier. Just paste the URL and go. Pro users receive a token for higher limits, but no third-party API keys are ever required.

**Why:** We want zero friction. If you need an API key, it is not zero setup.

**Next:** Start using any server right now from the [Server Index](../README.md#server-index).

### 10. Where do I get help?

**Q:** Something is not working and I cannot figure it out.

**A:** Check the [Troubleshooting Guide](TROUBLESHOOTING.md) first -- it covers the 5 most common issues. If that does not help, open a GitHub Issue with the error message and your client name. Pro users get priority email support.

**Why:** Most issues are config-related and resolve in under 2 minutes.

**Next:** [Troubleshooting](TROUBLESHOOTING.md) or [GitHub Issues](https://github.com/yagami8095/openclaw-mcp-servers/issues).

---

## ZH-TW

### 1. MCP 是什麼？

**問：** MCP 是什麼？為什麼我該關心？

**答：** MCP（模型上下文協議）是讓 AI 助手呼叫外部工具的標準。就像給 AI 一個工具箱。沒有 MCP，AI 只能產生文字。有了 MCP，它可以驗證 JSON、檢查色彩對比、轉換時間戳，以及其他 46 種功能。

**下一步：** 參閱[入門指南](GETTING-STARTED.md)安裝你的第一台伺服器。

### 2. 需要程式經驗嗎？

**問：** 我不是程式設計師，可以使用嗎？

**答：** 可以。設定只需要把網址貼到設定檔中。如果你會複製貼上，就能使用 OpenClaw。之後 AI 會處理一切 -- 你只需要用自然語言描述需求。

### 3. 該先試哪台伺服器？

**問：** 有 9 台伺服器，從哪裡開始？

**答：** 從 **JSON Toolkit** 開始。JSON 無處不在 -- 設定檔、API 回應、資料匯出。6 個工具在每個專案中都用得到。

### 4. 如何安裝伺服器？

**問：** 實際安裝流程是什麼？

**答：** Cursor：點擊一鍵安裝按鈕。Claude Desktop：在設定檔加入一段 JSON，然後重新啟動。沒有下載、沒有建置步驟、不需要 API 金鑰。

### 5. 免費版和專業版有什麼差別？

**問：** 既然有免費版，為什麼要付費？

**答：** 免費版提供 3 台伺服器，每台每天 20 次呼叫。專業版（$9/月）解鎖全部 9 台伺服器，每月 50,000 次呼叫和優先支援。

### 6. 達到呼叫上限怎麼辦？

**問：** 今天用了 20 次，然後呢？

**答：** 免費版的呼叫在 UTC 午夜重置。你會收到清楚的錯誤訊息。可以等明天或升級到專業版。

### 7. 支援 Claude Desktop 和 Cursor 嗎？

**問：** 支援哪些編輯器？

**答：** 任何 MCP 相容用戶端都可以。包括 Claude Desktop、Cursor、Windsurf、Cline、Continue 等。

### 8. 工具沒有出現怎麼辦？

**問：** 我加了設定，但工具沒有顯示。

**答：** 三件事要檢查：(1) 重新啟動用戶端。(2) 確認網址以 `/mcp` 結尾。(3) 檢查 JSON 設定沒有語法錯誤。

### 9. 需要 API 金鑰嗎？

**問：** 需要註冊或輸入憑證嗎？

**答：** 不需要。所有 9 台伺服器在免費版都不需要 API 金鑰。貼上網址即可。

### 10. 在哪裡獲得幫助？

**問：** 有問題無法解決怎麼辦？

**答：** 先看[疑難排解](TROUBLESHOOTING.md)。如果無法解決，在 GitHub 開 Issue。專業版用戶享有優先支援。

---

## JA

### 1. MCP とは？

**質問：** MCP とは何ですか？なぜ重要ですか？

**回答：** MCP（Model Context Protocol）は AI アシスタントが外部ツールを呼び出すための標準です。AI に道具箱を渡すようなもの。MCP なしでは AI はテキスト生成のみ。MCP があれば JSON 検証、色コントラストチェック、タイムスタンプ変換など 49 の機能が使えます。

**次のステップ：** [はじめに](GETTING-STARTED.md)で最初のサーバーをインストール。

### 2. プログラミング経験は必要？

**質問：** プログラマーではありませんが使えますか？

**回答：** はい。URL を設定ファイルに貼り付けるだけ。コピー＆ペーストができれば OpenClaw を使えます。

### 3. 最初にどのサーバーを試すべき？

**質問：** 9 つのサーバーがありますが、どこから始めますか？

**回答：** **JSON Toolkit** から。JSON はどこにでもあります -- 設定ファイル、API レスポンス、データエクスポート。

### 4. サーバーのインストール方法は？

**質問：** 実際のインストール手順は？

**回答：** Cursor：ワンクリックインストールバッジをクリック。Claude Desktop：設定ファイルに JSON ブロックを追加して再起動。以上です。

### 5. 無料と Pro の違いは？

**質問：** 無料版があるのになぜ有料版？

**回答：** 無料はサーバー 3 台、各 1 日 20 回。Pro（$9/月）は全 9 サーバー、月 50,000 回、優先サポート。

### 6. コール制限に達したらどうなる？

**質問：** 今日 20 回使いました。次は？

**回答：** 無料版は UTC 深夜にリセット。明日まで待つか Pro にアップグレード。

### 7. Claude Desktop と Cursor に対応？

**質問：** どのエディタに対応していますか？

**回答：** MCP 互換クライアントすべて。Claude Desktop、Cursor、Windsurf、Cline、Continue など。

### 8. ツールが表示されない場合は？

**質問：** 設定を追加しましたがツールが表示されません。

**回答：** 3 点を確認：(1) クライアントを再起動。(2) URL が `/mcp` で終わるか確認。(3) JSON 設定に構文エラーがないか確認。

### 9. API キーは必要？

**質問：** 登録や認証情報の入力は必要？

**回答：** 不要です。全 9 サーバーは無料版で API キーなしで動作します。

### 10. ヘルプはどこで？

**質問：** 解決できない問題があります。

**回答：** まず[トラブルシューティング](TROUBLESHOOTING.md)を確認。解決しない場合は GitHub Issue を開いてください。Pro ユーザーは優先サポート付き。
