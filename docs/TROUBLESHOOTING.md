# Troubleshooting Guide

## English

### Issue 1: Server Not Showing in Client

**Symptom:** You added the server config but no tools appear in Claude Desktop, Cursor, or other clients.

**Cause:** MCP clients only load server manifests at startup. If you added or changed the config while the client was running, it has not picked up the change yet.

**Fix:**
1. Save your config file
2. Fully quit the client (not just minimize -- exit completely)
3. Reopen the client
4. Check that the tools appear in the tool panel or tool list

**Command:** Test that the server is reachable:
```bash
curl -s https://json-toolkit.yagami8095.workers.dev/mcp | head -c 200
```

**Escalation:** If tools still do not appear after restart, check Issue 2 (invalid config) below.

---

### Issue 2: Invalid Config / JSON Parse Error

**Symptom:** Client shows a JSON parse error, or silently ignores your MCP config.

**Cause:** The config file has a JSON syntax error. The most common mistakes are trailing commas, missing quotes, or mismatched brackets.

**Fix:**
1. Open your config file
2. Validate it at [jsonlint.com](https://jsonlint.com) or with `json_validate` if you have another working server
3. Common fixes:
   - Remove trailing commas: `{"a": 1,}` should be `{"a": 1}`
   - Ensure all keys are quoted: `{url: "..."}` should be `{"url": "..."}`
   - Match all brackets: every `{` needs a `}`

**Correct config example:**
```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit.yagami8095.workers.dev/mcp"
    }
  }
}
```

**Escalation:** If the JSON is valid but tools still do not load, check your client documentation for the exact config file location.

---

### Issue 3: Tool Call Fails with Error

**Symptom:** The tool appears but returns an error when called. You may see timeout, 500, or unexpected response errors.

**Cause:** This can be a temporary network issue, a malformed input, or (rarely) a server-side issue.

**Fix:**
1. Try the call again -- transient network errors are the most common cause
2. Simplify your input -- send a minimal test case
3. Check that you are not exceeding the free tier limit (20 calls/day per server)
4. Verify the server is up:

**Command:**
```bash
curl -s -o /dev/null -w "%{http_code}" https://json-toolkit.yagami8095.workers.dev/mcp
```
Expected: `200`. If you get `503` or `0`, the server may be temporarily down.

**Escalation:** If the server returns 200 but tool calls fail, open a [GitHub Issue](https://github.com/yagami8095/openclaw-mcp-servers/issues) with the error message and your input.

---

### Issue 4: Permission or Access Denied

**Symptom:** You see "access denied", "unauthorized", or "forbidden" errors when calling tools.

**Cause:** On the Free tier, this usually means you have exceeded the daily call limit. On Pro, it may mean your token is missing or expired.

**Fix:**
1. **Free tier:** Wait until midnight UTC for the limit to reset. You get 20 calls/day per server.
2. **Pro tier:** Check that your auth token is included in the config:
```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit.yagami8095.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_PRO_TOKEN"
      }
    }
  }
}
```
3. Verify your Pro subscription is active

**Escalation:** If you are within limits and still getting access errors, contact support with your token (first 8 characters only) and the timestamp of the error.

---

### Issue 5: Connection Timeout or Refused

**Symptom:** Client shows "connection refused", "timeout", or "could not reach server" errors.

**Cause:** Either your internet connection is down, a firewall is blocking outbound HTTPS, or (very rarely) Cloudflare is experiencing an outage.

**Fix:**
1. Check your internet connection
2. Test from a browser: visit `https://json-toolkit.yagami8095.workers.dev/mcp` directly
3. If you are behind a corporate firewall or VPN, ensure outbound HTTPS (port 443) to `*.workers.dev` is allowed
4. Check [Cloudflare Status](https://www.cloudflarestatus.com/) for any ongoing incidents

**Command:**
```bash
curl -v https://json-toolkit.yagami8095.workers.dev/mcp 2>&1 | grep -E "Connected|refused|timeout"
```

**Escalation:** If Cloudflare is up and your internet works but you still cannot connect, try from a different network (e.g., mobile hotspot) to rule out local network issues.

---

## ZH-TW

### 問題 1：伺服器未顯示在用戶端

**症狀：** 加了設定但工具沒有出現。

**原因：** MCP 用戶端只在啟動時載入伺服器清單。修改設定後需要重新啟動。

**修復：**
1. 儲存設定檔
2. 完全關閉用戶端（不是最小化，是完全退出）
3. 重新開啟用戶端
4. 確認工具出現在工具面板中

**指令：** 測試伺服器是否可達：
```bash
curl -s https://json-toolkit.yagami8095.workers.dev/mcp | head -c 200
```

**升級處理：** 重新啟動後仍未出現，請檢查問題 2（無效設定）。

---

### 問題 2：無效設定 / JSON 解析錯誤

**症狀：** 用戶端顯示 JSON 解析錯誤，或靜默忽略 MCP 設定。

**原因：** 設定檔有 JSON 語法錯誤。最常見的是尾隨逗號、缺少引號或括號不匹配。

**修復：**
1. 在 [jsonlint.com](https://jsonlint.com) 驗證設定檔
2. 移除尾隨逗號
3. 確保所有鍵都有引號
4. 確保括號匹配

---

### 問題 3：工具呼叫失敗

**症狀：** 工具出現了，但呼叫時返回錯誤。

**原因：** 可能是暫時性網路問題、輸入格式錯誤，或已超過免費額度。

**修復：**
1. 重試一次
2. 簡化輸入
3. 確認未超過每日 20 次限制
4. 驗證伺服器狀態：`curl -s -o /dev/null -w "%{http_code}" https://json-toolkit.yagami8095.workers.dev/mcp`

---

### 問題 4：權限或存取被拒

**症狀：** 看到「access denied」或「forbidden」錯誤。

**原因：** 免費版通常是超過每日限制。專業版可能是 token 缺失或過期。

**修復：**
1. 免費版：等到 UTC 午夜重置
2. 專業版：檢查設定中的 Authorization header
3. 確認訂閱仍然有效

---

### 問題 5：連線逾時或被拒

**症狀：** 用戶端顯示「connection refused」或「timeout」。

**原因：** 網路問題、防火牆阻擋，或 Cloudflare 極少數情況的中斷。

**修復：**
1. 檢查網路連線
2. 在瀏覽器直接訪問伺服器網址
3. 企業防火牆/VPN 需允許 `*.workers.dev` 的 HTTPS 連線
4. 檢查 [Cloudflare 狀態頁面](https://www.cloudflarestatus.com/)

---

## JA

### 問題 1：サーバーがクライアントに表示されない

**症状：** 設定を追加したがツールが表示されない。

**原因：** MCP クライアントは起動時にのみサーバーマニフェストを読み込みます。設定変更後は再起動が必要。

**修正：**
1. 設定ファイルを保存
2. クライアントを完全に終了（最小化ではなく完全終了）
3. クライアントを再度開く
4. ツールパネルにツールが表示されていることを確認

**コマンド：**
```bash
curl -s https://json-toolkit.yagami8095.workers.dev/mcp | head -c 200
```

---

### 問題 2：無効な設定 / JSON パースエラー

**症状：** JSON パースエラーが表示される、または設定が無視される。

**原因：** 設定ファイルに JSON 構文エラー。末尾カンマ、引用符の欠落、括弧の不一致が最も一般的。

**修正：**
1. [jsonlint.com](https://jsonlint.com) で設定ファイルを検証
2. 末尾カンマを削除
3. すべてのキーに引用符があることを確認

---

### 問題 3：ツール呼び出しがエラーで失敗

**症状：** ツールは表示されるが、呼び出し時にエラーが返される。

**原因：** 一時的なネットワーク問題、不正な入力、または無料枠の超過。

**修正：**
1. もう一度試す
2. 入力を簡素化
3. 1日20回の制限を超えていないか確認
4. サーバーの状態を確認

---

### 問題 4：権限またはアクセス拒否

**症状：** 「access denied」または「forbidden」エラー。

**原因：** 無料版では通常、1日の制限超過。Pro ではトークンの欠落または期限切れ。

**修正：**
1. 無料版：UTC 深夜のリセットを待つ
2. Pro：設定の Authorization ヘッダーを確認
3. サブスクリプションが有効か確認

---

### 問題 5：接続タイムアウトまたは拒否

**症状：** 「connection refused」または「timeout」エラー。

**原因：** ネットワーク問題、ファイアウォール、または Cloudflare の障害（まれ）。

**修正：**
1. インターネット接続を確認
2. ブラウザでサーバー URL に直接アクセス
3. 企業ファイアウォール/VPN の場合、`*.workers.dev` への HTTPS を許可
4. [Cloudflare ステータスページ](https://www.cloudflarestatus.com/)を確認
