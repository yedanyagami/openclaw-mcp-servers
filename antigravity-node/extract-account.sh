#!/usr/bin/env bash
# ─── Antigravity Account Extractor ─────────────────────────────────
# Adds a Google account to antigravity locally, then extracts the
# credentials for injection into cloud nodes.
#
# Usage:
#   ./extract-account.sh <email> [port]
#
# Example:
#   ./extract-account.sh yedanyagamiai@gmail.com 9901
#   ./extract-account.sh yedankikuchi@gmail.com 9902
#   ./extract-account.sh yedanapi@gmail.com 9903
#
# After running, follow the browser prompt to authenticate.
# The script will output the accounts.json content to copy to
# the cloud platform as ANTIGRAVITY_ACCOUNTS env var.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

EMAIL="${1:-}"
PORT="${2:-9900}"
EXTRACT_DIR="/tmp/antigravity-extract-$$"
CONFIG_DIR="$EXTRACT_DIR/.config/antigravity-proxy"

if [ -z "$EMAIL" ]; then
    echo "Usage: $0 <email> [port]"
    echo ""
    echo "Supported emails:"
    echo "  yedanyagamiai@gmail.com  → Node 2 (Koyeb)"
    echo "  yedankikuchi@gmail.com   → Node 3 (Render)"
    echo "  yedanapi@gmail.com       → Node 4 (Zeabur)"
    exit 1
fi

echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Antigravity Account Extractor            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Create isolated config dir
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_DIR/config.json" <<'CONF'
{
  "requestThrottlingEnabled": true,
  "requestDelayMs": 3000,
  "defaultCooldownMs": 15000,
  "maxRetries": 3,
  "accountSelection": { "strategy": "sticky" }
}
CONF

echo -e "${GREEN}[+]${NC} Starting temporary antigravity on port $PORT..."
echo -e "${YELLOW}[!]${NC} When the browser opens, log in with: $EMAIL"
echo -e "${YELLOW}[!]${NC} After login, press Ctrl+C to stop and extract credentials."
echo ""

# Start with isolated HOME so it doesn't mess with existing accounts
HOME="$EXTRACT_DIR" PORT="$PORT" npx --prefix /home/yedan/antigravity-test \
    antigravity-claude-proxy start --log || true

echo ""

# Extract accounts.json
if [ -f "$CONFIG_DIR/accounts.json" ]; then
    echo -e "${GREEN}[+]${NC} Account extracted successfully!"
    echo ""
    echo -e "${CYAN}═══ ACCOUNTS JSON (copy this) ═══${NC}"
    cat "$CONFIG_DIR/accounts.json"
    echo ""
    echo -e "${CYAN}═════════════════════════════════${NC}"
    echo ""

    # Save to secrets dir
    SAFE_EMAIL=$(echo "$EMAIL" | tr '@.' '_')
    SAVE_PATH="/home/yedan/.openclaw/secrets/antigravity-accounts"
    mkdir -p "$SAVE_PATH"
    cp "$CONFIG_DIR/accounts.json" "$SAVE_PATH/${SAFE_EMAIL}.json"
    echo -e "${GREEN}[+]${NC} Saved to: $SAVE_PATH/${SAFE_EMAIL}.json"
    echo ""
    echo -e "${YELLOW}[!]${NC} Set this as ANTIGRAVITY_ACCOUNTS env var on the cloud platform."
else
    echo -e "${RED}[x]${NC} No accounts.json found. Did you complete the login?"
fi

# Cleanup
rm -rf "$EXTRACT_DIR"
