#!/bin/bash
# Quick-add 3 Google accounts to antigravity proxy
# Opens OAuth URLs in browser, proxy auto-catches the callback
set -euo pipefail

PROXY="http://127.0.0.1:8090"
ACCOUNTS=("yedanyagamiai@gmail.com" "yedankikuchi@gmail.com" "yedanapi@gmail.com")

echo "╔═══════════════════════════════════════════╗"
echo "║  Antigravity Quick Account Setup          ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Check current accounts
echo "[i] Current accounts:"
curl -s "$PROXY/api/accounts" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for a in d.get('accounts', []):
    print(f'  ✅ {a[\"email\"]}')
"
echo ""

for EMAIL in "${ACCOUNTS[@]}"; do
    # Check if already exists
    EXISTS=$(curl -s "$PROXY/api/accounts" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('yes' if any(a['email'] == '$EMAIL' for a in d.get('accounts', [])) else 'no')
")

    if [ "$EXISTS" = "yes" ]; then
        echo "[✓] $EMAIL — already added, skipping"
        continue
    fi

    echo "[+] Adding: $EMAIL"

    # Get OAuth URL
    OAUTH=$(curl -s "$PROXY/api/auth/url")
    URL=$(echo "$OAUTH" | python3 -c "import sys,json;print(json.load(sys.stdin)['url'])")
    STATE=$(echo "$OAUTH" | python3 -c "import sys,json;print(json.load(sys.stdin)['state'])")

    echo "[+] OAuth state: $STATE"
    echo "[+] Opening browser..."

    # Open in Windows browser via WSL
    if command -v wslview &>/dev/null; then
        wslview "$URL" 2>/dev/null
    elif command -v xdg-open &>/dev/null; then
        xdg-open "$URL" 2>/dev/null
    else
        echo "[!] Cannot open browser. Copy this URL:"
        echo "    $URL"
    fi

    echo ""
    echo "  ╔═══════════════════════════════════════════╗"
    echo "  ║  1. Log in with: $EMAIL"
    echo "  ║  2. Click 'Allow' / '允許'                ║"
    echo "  ║  3. Wait for redirect                     ║"
    echo "  ╚═══════════════════════════════════════════╝"
    echo ""

    # Wait for account to appear
    echo -n "  Waiting for OAuth completion"
    for i in $(seq 1 60); do
        EXISTS=$(curl -s "$PROXY/api/accounts" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('yes' if any(a['email'] == '$EMAIL' for a in d.get('accounts', [])) else 'no')
")
        if [ "$EXISTS" = "yes" ]; then
            echo ""
            echo "  [✓] $EMAIL added successfully!"
            break
        fi
        echo -n "."
        sleep 2
    done

    if [ "$EXISTS" != "yes" ]; then
        echo ""
        echo "  [!] Timeout. Press Enter when done, or Ctrl+C to skip"
        read -r
    fi

    echo ""
done

echo ""
echo "═══ Final Account Status ═══"
curl -s "$PROXY/api/accounts" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for a in d.get('accounts', []):
    print(f'  ✅ {a[\"email\"]} (source: {a.get(\"source\",\"?\")})')
print(f'  Total: {len(d.get(\"accounts\",[]))} accounts')
"
echo ""
echo "When done, export accounts for cloud nodes:"
echo "  curl -s $PROXY/api/accounts/export > accounts-backup.json"
