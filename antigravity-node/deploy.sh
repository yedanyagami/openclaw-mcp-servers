#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[+]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[x]${NC} $*" >&2; }
info()  { echo -e "${BLUE}[i]${NC} $*"; }

header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════╗"
    echo "║  Antigravity Node Deployer v1.0          ║"
    echo "║  Multi-Cloud Mesh Network                ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_command() {
    if ! command -v "$1" &>/dev/null; then
        error "$1 is not installed. Install it:"
        echo "    $2"
        return 1
    fi
    return 0
}

# ─── Koyeb (Node 2) ───────────────────────────────────────────────
deploy_koyeb() {
    log "Deploying Node 2 to Koyeb (yedanyagamiai@gmail.com)..."
    check_command koyeb "curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | sh" || return 1

    if ! koyeb whoami &>/dev/null 2>&1; then
        error "Not logged in to Koyeb. Run: koyeb login"
        return 1
    fi

    if koyeb app get yedan-antigravity-n2 &>/dev/null 2>&1; then
        warn "App exists. Redeploying..."
        koyeb service redeploy yedan-antigravity-n2/antigravity-proxy
    else
        log "Creating new Koyeb app..."
        koyeb app create yedan-antigravity-n2

        koyeb service create antigravity-proxy \
            --app yedan-antigravity-n2 \
            --docker "." \
            --docker-dockerfile Dockerfile \
            --instance-type free \
            --regions fra \
            --port 8080:http \
            --route /:8080 \
            --env PORT=8080 \
            --env NODE_ENV=production \
            --checks 8080:http:/health:30
    fi

    log "Koyeb deployment complete."
    info "URL: https://yedan-antigravity-n2-antigravity-proxy.koyeb.app"
}

# ─── Render (Node 3) ──────────────────────────────────────────────
deploy_render() {
    log "Deploying Node 3 to Render (yedankikuchi@gmail.com)..."

    warn "Render deployment via CLI is limited."
    info "Recommended: Deploy via Render Dashboard"
    echo ""
    echo "  1. Go to https://dashboard.render.com"
    echo "  2. Click 'New +' → 'Blueprint'"
    echo "  3. Connect repo: openclaw-mcp-servers"
    echo "  4. Select render.yaml from antigravity-node/"
    echo "  5. Set ANTIGRAVITY_ACCOUNTS env var"
    echo ""
    info "Or use Render Deploy Hook if you have one:"
    echo "  curl -X POST \$RENDER_DEPLOY_HOOK_URL"
    echo ""

    if [ -n "${RENDER_DEPLOY_HOOK_URL:-}" ]; then
        log "Deploy hook found, triggering..."
        curl -s -X POST "$RENDER_DEPLOY_HOOK_URL"
        log "Render deploy triggered."
    fi
}

# ─── Zeabur (Node 4) ──────────────────────────────────────────────
deploy_zeabur() {
    log "Deploying Node 4 to Zeabur (yedanapi@gmail.com)..."
    check_command zeabur "curl -sSL https://dub.sh/zeabur | bash" || return 1

    if ! zeabur auth status &>/dev/null 2>&1; then
        warn "Not logged in to Zeabur. Run: zeabur auth login"
        return 1
    fi

    zeabur deploy --name antigravity-node4 2>/dev/null || {
        warn "Auto-deploy failed. Try manual deployment:"
        echo ""
        echo "  1. Go to https://dash.zeabur.com"
        echo "  2. Create project → Deploy from GitHub"
        echo "  3. Select openclaw-mcp-servers/antigravity-node"
        echo "  4. Set PORT=8080, ANTIGRAVITY_ACCOUNTS env"
        echo ""
    }

    log "Zeabur deployment complete."
    info "URL: https://antigravity-node4.zeabur.app"
}

# ─── Status ────────────────────────────────────────────────────────
show_status() {
    echo ""
    echo "═══════════════════════════════════════════"
    echo "  Antigravity Mesh — Node Status"
    echo "═══════════════════════════════════════════"
    echo ""

    # Node 1: Local
    info "Node 1 — WSL2 Local (yagami8095@gmail.com)"
    if curl -sf http://127.0.0.1:8090/health >/dev/null 2>&1; then
        HEALTH=$(curl -sf http://127.0.0.1:8090/health)
        echo -e "  Status: ${GREEN}HEALTHY${NC}"
        echo "  $HEALTH" | python3 -m json.tool 2>/dev/null | head -5 || echo "  $HEALTH"
    else
        echo -e "  Status: ${RED}DOWN${NC}"
    fi
    echo ""

    # Node 2: Koyeb
    info "Node 2 — Koyeb (yedanyagamiai@gmail.com)"
    if curl -sf https://yedan-antigravity-n2-antigravity-proxy.koyeb.app/health >/dev/null 2>&1; then
        echo -e "  Status: ${GREEN}HEALTHY${NC}"
    else
        echo -e "  Status: ${YELLOW}NOT DEPLOYED${NC}"
    fi
    echo ""

    # Node 3: Render
    info "Node 3 — Render (yedankikuchi@gmail.com)"
    if curl -sf https://antigravity-node3.onrender.com/health >/dev/null 2>&1; then
        echo -e "  Status: ${GREEN}HEALTHY${NC}"
    else
        echo -e "  Status: ${YELLOW}NOT DEPLOYED${NC}"
    fi
    echo ""

    # Node 4: Zeabur
    info "Node 4 — Zeabur (yedanapi@gmail.com)"
    if curl -sf https://antigravity-node4.zeabur.app/health >/dev/null 2>&1; then
        echo -e "  Status: ${GREEN}HEALTHY${NC}"
    else
        echo -e "  Status: ${YELLOW}NOT DEPLOYED${NC}"
    fi
    echo ""
}

# ─── Account Setup Helper ─────────────────────────────────────────
setup_accounts() {
    echo ""
    echo "═══════════════════════════════════════════"
    echo "  Account Setup Guide"
    echo "═══════════════════════════════════════════"
    echo ""
    info "Each node needs a separate Google account."
    echo ""
    echo "  Node 1 (local):  yagami8095@gmail.com    ✅ Already configured"
    echo "  Node 2 (Koyeb):  yedanyagamiai@gmail.com  → Step 1 below"
    echo "  Node 3 (Render): yedankikuchi@gmail.com   → Step 1 below"
    echo "  Node 4 (Zeabur): yedanapi@gmail.com       → Step 1 below"
    echo ""
    info "Step 1: Generate account token locally"
    echo "  cd /home/yedan/antigravity-test"
    echo "  PORT=9999 npx antigravity-claude-proxy start --log"
    echo "  # Open http://localhost:9999 in browser"
    echo "  # Log in with each Google account"
    echo "  # Copy the accounts.json entry"
    echo ""
    info "Step 2: Set ANTIGRAVITY_ACCOUNTS env on each platform"
    echo "  # Koyeb:  koyeb service update ... --env ANTIGRAVITY_ACCOUNTS='{...}'"
    echo "  # Render: Set in dashboard → Environment Variables"
    echo "  # Zeabur: Set in dashboard → Variables"
    echo ""
    info "Step 3: Verify"
    echo "  curl https://<node-url>/health"
    echo ""
}

usage() {
    echo "Usage: $0 <command>"
    echo ""
    echo "  koyeb     Deploy Node 2 to Koyeb"
    echo "  render    Deploy Node 3 to Render"
    echo "  zeabur    Deploy Node 4 to Zeabur"
    echo "  all       Deploy to all platforms"
    echo "  status    Show all node status"
    echo "  accounts  Show account setup guide"
    exit 1
}

header

if [ $# -lt 1 ]; then
    usage
fi

FAILURES=0

case "$1" in
    koyeb)   deploy_koyeb ;;
    render)  deploy_render ;;
    zeabur)  deploy_zeabur ;;
    all)
        log "Deploying to all platforms..."
        echo ""
        deploy_koyeb || { error "Koyeb failed"; FAILURES=$((FAILURES + 1)); }
        echo ""
        deploy_render || { error "Render failed"; FAILURES=$((FAILURES + 1)); }
        echo ""
        deploy_zeabur || { error "Zeabur failed"; FAILURES=$((FAILURES + 1)); }
        echo ""
        show_status
        [ "$FAILURES" -gt 0 ] && { warn "$FAILURES deployment(s) failed"; exit 1; } || log "All deployments successful!"
        ;;
    status)   show_status ;;
    accounts) setup_accounts ;;
    *)        usage ;;
esac
