#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Antigravity 全自動雲端部署
# YEDAN 只需：開瀏覽器拿 token → 貼進來 → 自動部署
# ═══════════════════════════════════════════════════════════
set -euo pipefail

IMAGE="ghcr.io/yedanyagamiai-cmd/antigravity-node:latest"

ACCOUNTS_FILE="${ACCOUNTS_FILE:-$HOME/.openclaw/secrets/antigravity-accounts-export.json}"
if [ ! -f "$ACCOUNTS_FILE" ]; then
    echo "[!] Export accounts first: curl -s http://127.0.0.1:8090/api/accounts/export > $ACCOUNTS_FILE"
    exit 1
fi
NODE2_ACCOUNTS=$(python3 -c "import json;a=json.load(open('$ACCOUNTS_FILE'));print(json.dumps([x for x in a if x['email'] in ['yedanyagamiai@gmail.com','naoyagamiai@gmail.com']]))")
NODE3_ACCOUNTS=$(python3 -c "import json;a=json.load(open('$ACCOUNTS_FILE'));print(json.dumps([x for x in a if x['email']=='yedankikuchi@gmail.com']))")
NODE4_ACCOUNTS=$(python3 -c "import json;a=json.load(open('$ACCOUNTS_FILE'));print(json.dumps([x for x in a if x['email']=='yedanapi@gmail.com']))")

echo "╔══════════════════════════════════════════════════╗"
echo "║  Antigravity 雲端部署 — YEDAN 專用               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Zeabur Login ──
echo "═══ Step 1/3: Zeabur 登入 ═══"
if zeabur auth status &>/dev/null 2>&1; then
    echo "[✓] Zeabur 已登入"
else
    echo "[i] 開瀏覽器登入 Zeabur（用 yedanyagamiai@gmail.com）"
    zeabur auth login
    echo "[✓] Zeabur 登入完成"
fi
echo ""

# ── Step 2: 收集 Koyeb / Render Token ──
echo "═══ Step 2/3: 取得 API Token ═══"
echo ""

# Open browser pages
if command -v wslview &>/dev/null; then
    wslview "https://app.koyeb.com/settings/api" 2>/dev/null || true
    wslview "https://dashboard.render.com/settings#api-keys" 2>/dev/null || true
elif command -v xdg-open &>/dev/null; then
    xdg-open "https://app.koyeb.com/settings/api" 2>/dev/null || true
    xdg-open "https://dashboard.render.com/settings#api-keys" 2>/dev/null || true
fi

echo "[i] 已開啟瀏覽器，用 yedanyagamiai@gmail.com 登入"
echo ""
echo "  Koyeb:  建立 API Token → 複製"
echo "  Render: 建立 API Key → 複製"
echo ""

read -rp "貼上 Koyeb API Token: " KOYEB_TOKEN
read -rp "貼上 Render API Key:  " RENDER_TOKEN

echo ""
echo "[✓] Token 收集完成"
echo ""

# Save tokens for future use
mkdir -p ~/.openclaw/secrets
cat > ~/.openclaw/secrets/cloud-tokens.env << TOKEOF
KOYEB_TOKEN=$KOYEB_TOKEN
RENDER_TOKEN=$RENDER_TOKEN
TOKEOF
chmod 600 ~/.openclaw/secrets/cloud-tokens.env
echo "[✓] Token 已存到 ~/.openclaw/secrets/cloud-tokens.env"
echo ""

# ── Step 3: Deploy All ──
echo "═══ Step 3/3: 部署三個節點 ═══"
echo ""
FAIL=0

# ── Koyeb ──
echo "─── Koyeb (Node 2: yedanyagamiai) ───"
KOYEB_RESP=$(curl -s -X POST "https://app.koyeb.com/v1/services" \
    -H "Authorization: Bearer $KOYEB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"app_id_or_name\": \"antigravity-n2\",
        \"definition\": {
            \"name\": \"proxy\",
            \"type\": \"WEB\",
            \"docker\": {\"image\": \"$IMAGE\"},
            \"instance_types\": [{\"type\": \"free\"}],
            \"regions\": [\"fra\"],
            \"ports\": [{\"port\": 8080, \"protocol\": \"http\"}],
            \"routes\": [{\"path\": \"/\", \"port\": 8080}],
            \"env\": [
                {\"key\": \"PORT\", \"value\": \"8080\"},
                {\"key\": \"NODE_ENV\", \"value\": \"production\"},
                {\"key\": \"ANTIGRAVITY_ACCOUNTS\", \"value\": $(python3 -c "import json; print(json.dumps('$NODE2_ACCOUNTS'))")}
            ],
            \"scaling\": {\"min\": 1, \"max\": 1}
        }
    }" 2>&1)

# If app doesn't exist, create it first then retry
if echo "$KOYEB_RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if 'id' in d else 1)" 2>/dev/null; then
    echo "[✓] Koyeb 部署成功"
else
    echo "[i] 嘗試先建立 app..."
    curl -s -X POST "https://app.koyeb.com/v1/apps" \
        -H "Authorization: Bearer $KOYEB_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"antigravity-n2"}' > /dev/null 2>&1
    sleep 2
    KOYEB_RESP2=$(curl -s -X POST "https://app.koyeb.com/v1/services" \
        -H "Authorization: Bearer $KOYEB_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"app_id_or_name\": \"antigravity-n2\",
            \"definition\": {
                \"name\": \"proxy\",
                \"type\": \"WEB\",
                \"docker\": {\"image\": \"$IMAGE\"},
                \"instance_types\": [{\"type\": \"free\"}],
                \"regions\": [\"fra\"],
                \"ports\": [{\"port\": 8080, \"protocol\": \"http\"}],
                \"routes\": [{\"path\": \"/\", \"port\": 8080}],
                \"env\": [
                    {\"key\": \"PORT\", \"value\": \"8080\"},
                    {\"key\": \"NODE_ENV\", \"value\": \"production\"},
                    {\"key\": \"ANTIGRAVITY_ACCOUNTS\", \"value\": $(python3 -c "import json; print(json.dumps('$NODE2_ACCOUNTS'))")}
                ],
                \"scaling\": {\"min\": 1, \"max\": 1}
            }
        }" 2>&1)
    if echo "$KOYEB_RESP2" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if 'id' in d else 1)" 2>/dev/null; then
        echo "[✓] Koyeb 部署成功"
    else
        echo "[✗] Koyeb 部署失敗: $KOYEB_RESP2"
        FAIL=$((FAIL+1))
    fi
fi
echo ""

# ── Render ──
echo "─── Render (Node 3: yedankikuchi) ───"
RENDER_RESP=$(curl -s -X POST "https://api.render.com/v1/services" \
    -H "Authorization: Bearer $RENDER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"antigravity-node3\",
        \"type\": \"web_service\",
        \"plan\": \"free\",
        \"region\": \"singapore\",
        \"image\": {\"imagePath\": \"$IMAGE\"},
        \"envVars\": [
            {\"key\": \"PORT\", \"value\": \"8080\"},
            {\"key\": \"NODE_ENV\", \"value\": \"production\"},
            {\"key\": \"ANTIGRAVITY_ACCOUNTS\", \"value\": $(python3 -c "import json; print(json.dumps('$NODE3_ACCOUNTS'))")}
        ],
        \"healthCheckPath\": \"/health\"
    }" 2>&1)

if echo "$RENDER_RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);s=d.get('service',d);sys.exit(0 if 'id' in s else 1)" 2>/dev/null; then
    echo "[✓] Render 部署成功"
else
    echo "[✗] Render 回應: $RENDER_RESP"
    FAIL=$((FAIL+1))
fi
echo ""

# ── Zeabur ──
echo "─── Zeabur (Node 4: yedanapi) ───"
cd "$(dirname "$0")"
if zeabur deploy --name antigravity-node4 2>&1; then
    echo "[✓] Zeabur 部署成功"
    echo "[i] 記得到 Zeabur dashboard 設定環境變數:"
    echo "    PORT=8080"
    echo "    ANTIGRAVITY_ACCOUNTS='$NODE4_ACCOUNTS'"
else
    echo "[✗] Zeabur CLI 部署失敗"
    echo "[i] 手動: https://dash.zeabur.com → Docker Image → $IMAGE"
    FAIL=$((FAIL+1))
fi
echo ""

# ── Summary ──
echo "╔══════════════════════════════════════════════════╗"
echo "║  部署結果                                        ║"
echo "╚══════════════════════════════════════════════════╝"
if [ $FAIL -eq 0 ]; then
    echo "[✓] 全部成功！"
else
    echo "[!] $FAIL 個失敗，請檢查上方錯誤"
fi
echo ""
echo "節點 URL:"
echo "  N2 Koyeb:  https://antigravity-n2-*.koyeb.app"
echo "  N3 Render: https://antigravity-node3.onrender.com"
echo "  N4 Zeabur: https://antigravity-node4.zeabur.app"
echo ""
echo "驗證: curl https://<url>/health"
