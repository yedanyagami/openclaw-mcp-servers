#!/bin/bash
set -e

CONFIG_DIR="$HOME/.config/antigravity-proxy"
ACCOUNTS_FILE="$CONFIG_DIR/accounts.json"

# If ANTIGRAVITY_ACCOUNTS env var is set, write it to accounts.json
# This allows pre-configuring accounts without browser OAuth on cloud
if [ -n "$ANTIGRAVITY_ACCOUNTS" ]; then
    echo "$ANTIGRAVITY_ACCOUNTS" > "$ACCOUNTS_FILE"
    echo "[entrypoint] Injected accounts from ANTIGRAVITY_ACCOUNTS env"
fi

# If accounts.json doesn't exist yet, create empty one
if [ ! -f "$ACCOUNTS_FILE" ]; then
    echo "[]" > "$ACCOUNTS_FILE"
    echo "[entrypoint] Created empty accounts.json — add account via Web UI at http://host:${PORT:-8080}"
fi

echo "[entrypoint] Starting antigravity-claude-proxy on port ${PORT:-8080}..."
exec npx antigravity-claude-proxy start --log
