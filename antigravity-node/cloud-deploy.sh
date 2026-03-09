#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Antigravity Cloud Deploy — One-shot deploy to Koyeb/Render/Zeabur
# Image: ghcr.io/yedanyagamiai-cmd/antigravity-node:latest
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

IMAGE="ghcr.io/yedanyagamiai-cmd/antigravity-node:latest"

# ── Account JSON per node (loaded from exported file) ──
ACCOUNTS_FILE="${ACCOUNTS_FILE:-$HOME/.openclaw/secrets/antigravity-accounts-export.json}"
if [ ! -f "$ACCOUNTS_FILE" ]; then
    echo "[!] Accounts file not found: $ACCOUNTS_FILE"
    echo "    Export first: curl -s http://127.0.0.1:8090/api/accounts/export > \$ACCOUNTS_FILE"
    exit 1
fi
NODE2_ACCOUNTS=$(python3 -c "import json;a=json.load(open('$ACCOUNTS_FILE'));print(json.dumps([x for x in a if x['email'] in ['yedanyagamiai@gmail.com','naoyagamiai@gmail.com']]))")
NODE3_ACCOUNTS=$(python3 -c "import json;a=json.load(open('$ACCOUNTS_FILE'));print(json.dumps([x for x in a if x['email']=='yedankikuchi@gmail.com']))")
NODE4_ACCOUNTS=$(python3 -c "import json;a=json.load(open('$ACCOUNTS_FILE'));print(json.dumps([x for x in a if x['email']=='yedanapi@gmail.com']))")

echo "╔══════════════════════════════════════════════════╗"
echo "║  Antigravity Cloud Deploy                        ║"
echo "║  Image: $IMAGE  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════
# KOYEB (Node 2) — API deploy
# ═══════════════════════════════════════════════════════════
deploy_koyeb() {
    local TOKEN="${KOYEB_TOKEN:-}"
    if [ -z "$TOKEN" ]; then
        echo "[!] KOYEB_TOKEN not set. Get one from: https://app.koyeb.com/settings/api"
        echo "    export KOYEB_TOKEN=your-token-here"
        return 1
    fi

    echo "[+] Deploying Node 2 to Koyeb..."

    # Check if app exists
    local EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "https://app.koyeb.com/v1/apps?name=antigravity-n2")

    if echo "$EXISTS" | grep -q "200"; then
        local APP_CHECK=$(curl -s \
            -H "Authorization: Bearer $TOKEN" \
            "https://app.koyeb.com/v1/apps?name=antigravity-n2")
        local APP_COUNT=$(echo "$APP_CHECK" | python3 -c "import sys,json;print(len(json.load(sys.stdin).get('apps',[])))" 2>/dev/null || echo "0")

        if [ "$APP_COUNT" != "0" ]; then
            echo "[i] App exists. Triggering redeploy..."
            local SERVICE_ID=$(echo "$APP_CHECK" | python3 -c "
import sys,json
apps = json.load(sys.stdin).get('apps',[])
if apps:
    for s in apps[0].get('services',[]):
        print(s['id'])
        break
" 2>/dev/null || echo "")
            if [ -n "$SERVICE_ID" ]; then
                curl -s -X POST \
                    -H "Authorization: Bearer $TOKEN" \
                    "https://app.koyeb.com/v1/services/$SERVICE_ID/redeploy"
                echo "[✓] Koyeb redeploy triggered"
                return 0
            fi
        fi
    fi

    # Create new app + service
    echo "[+] Creating new Koyeb app..."
    curl -s -X POST "https://app.koyeb.com/v1/apps" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"antigravity-n2"}'

    curl -s -X POST "https://app.koyeb.com/v1/services" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"app_id_or_name\": \"antigravity-n2\",
            \"definition\": {
                \"name\": \"proxy\",
                \"type\": \"WEB\",
                \"docker\": {
                    \"image\": \"$IMAGE\"
                },
                \"instance_types\": [{\"type\": \"free\"}],
                \"regions\": [\"fra\"],
                \"ports\": [{\"port\": 8080, \"protocol\": \"http\"}],
                \"routes\": [{\"path\": \"/\", \"port\": 8080}],
                \"env\": [
                    {\"key\": \"PORT\", \"value\": \"8080\"},
                    {\"key\": \"NODE_ENV\", \"value\": \"production\"},
                    {\"key\": \"ANTIGRAVITY_ACCOUNTS\", \"value\": $(echo "$NODE2_ACCOUNTS" | python3 -c 'import sys,json;print(json.dumps(sys.stdin.read().strip()))')}
                ],
                \"health_checks\": [{
                    \"http\": {\"port\": 8080, \"path\": \"/health\"},
                    \"interval_seconds\": 30,
                    \"timeout_seconds\": 5,
                    \"healthy_threshold\": 2,
                    \"unhealthy_threshold\": 3,
                    \"grace_period\": 30
                }],
                \"scaling\": {\"min\": 1, \"max\": 1}
            }
        }"

    echo ""
    echo "[✓] Koyeb deploy submitted"
    echo "[i] URL: https://antigravity-n2-<org>.koyeb.app"
}

# ═══════════════════════════════════════════════════════════
# RENDER (Node 3) — API deploy
# ═══════════════════════════════════════════════════════════
deploy_render() {
    local TOKEN="${RENDER_TOKEN:-}"
    if [ -z "$TOKEN" ]; then
        echo "[!] RENDER_TOKEN not set. Get one from: https://dashboard.render.com/settings#api-keys"
        echo "    export RENDER_TOKEN=your-token-here"
        return 1
    fi

    echo "[+] Deploying Node 3 to Render..."

    # Check existing services
    local EXISTING=$(curl -s \
        -H "Authorization: Bearer $TOKEN" \
        "https://api.render.com/v1/services?name=antigravity-node3&limit=1")

    local SVC_COUNT=$(echo "$EXISTING" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

    if [ "$SVC_COUNT" != "0" ]; then
        echo "[i] Service exists. Triggering deploy..."
        local SVC_ID=$(echo "$EXISTING" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['service']['id'])" 2>/dev/null)
        curl -s -X POST \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "https://api.render.com/v1/services/$SVC_ID/deploys" \
            -d '{"clearCache":"do_not_clear"}'
        echo "[✓] Render redeploy triggered"
        return 0
    fi

    # Create new service
    curl -s -X POST "https://api.render.com/v1/services" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"antigravity-node3\",
            \"type\": \"web_service\",
            \"plan\": \"free\",
            \"region\": \"singapore\",
            \"image\": {
                \"ownerId\": \"tok-$(echo $TOKEN | cut -c1-8)\",
                \"imagePath\": \"$IMAGE\"
            },
            \"envVars\": [
                {\"key\": \"PORT\", \"value\": \"8080\"},
                {\"key\": \"NODE_ENV\", \"value\": \"production\"},
                {\"key\": \"ANTIGRAVITY_ACCOUNTS\", \"value\": $(echo "$NODE3_ACCOUNTS" | python3 -c 'import sys,json;print(json.dumps(sys.stdin.read().strip()))')}
            ],
            \"healthCheckPath\": \"/health\"
        }"

    echo ""
    echo "[✓] Render deploy submitted"
    echo "[i] URL: https://antigravity-node3.onrender.com"
}

# ═══════════════════════════════════════════════════════════
# ZEABUR (Node 4) — CLI deploy
# ═══════════════════════════════════════════════════════════
deploy_zeabur() {
    if ! command -v zeabur &>/dev/null; then
        echo "[!] Zeabur CLI not found. Install: curl -sSL https://dub.sh/zeabur | bash"
        return 1
    fi

    if ! zeabur auth status &>/dev/null 2>&1; then
        echo "[!] Not logged in. Run: zeabur auth login"
        return 1
    fi

    echo "[+] Deploying Node 4 to Zeabur..."
    echo "[i] Using Docker image: $IMAGE"

    # Zeabur CLI deploy from current directory
    cd "$(dirname "$0")"
    zeabur deploy --name antigravity-node4 2>&1 || {
        echo "[!] CLI deploy failed. Use dashboard:"
        echo "    1. https://dash.zeabur.com → New Project"
        echo "    2. Deploy → Docker Image → $IMAGE"
        echo "    3. Add env: PORT=8080, ANTIGRAVITY_ACCOUNTS='$NODE4_ACCOUNTS'"
        return 1
    }

    echo "[✓] Zeabur deploy submitted"
    echo "[i] URL: https://antigravity-node4.zeabur.app"
}

# ═══════════════════════════════════════════════════════════
# Status check
# ═══════════════════════════════════════════════════════════
check_status() {
    echo "═══ Antigravity Mesh Node Status ═══"
    echo ""
    for node in \
        "N1|http://127.0.0.1:8090|WSL2 Local" \
        "N2|https://antigravity-n2.koyeb.app|Koyeb" \
        "N3|https://antigravity-node3.onrender.com|Render" \
        "N4|https://antigravity-node4.zeabur.app|Zeabur"; do
        IFS='|' read -r name url platform <<< "$node"
        STATUS=$(curl -sf "$url/health" -m 10 2>/dev/null && echo "HEALTHY" || echo "DOWN")
        if [ "$STATUS" = "HEALTHY" ]; then
            echo "  ✅ $name ($platform): HEALTHY"
        else
            echo "  ❌ $name ($platform): $STATUS"
        fi
    done
    echo ""
}

# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════
case "${1:-help}" in
    koyeb)  deploy_koyeb ;;
    render) deploy_render ;;
    zeabur) deploy_zeabur ;;
    all)
        deploy_koyeb || echo "[!] Koyeb failed"
        echo ""
        deploy_render || echo "[!] Render failed"
        echo ""
        deploy_zeabur || echo "[!] Zeabur failed"
        echo ""
        check_status
        ;;
    status) check_status ;;
    *)
        echo "Usage: $0 {koyeb|render|zeabur|all|status}"
        echo ""
        echo "Required env vars:"
        echo "  KOYEB_TOKEN   — from https://app.koyeb.com/settings/api"
        echo "  RENDER_TOKEN  — from https://dashboard.render.com/settings#api-keys"
        echo "  Zeabur        — run 'zeabur auth login' first"
        echo ""
        echo "Image: $IMAGE"
        ;;
esac
