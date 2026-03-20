#!/bin/bash
# ============================================================
# OpenClaw Secrets Store Migration
# Run this to migrate all tokens from wrangler.toml vars to secrets
# CF Secrets Store centralizes all tokens in one place
# ============================================================
set -euo pipefail

echo "[OpenClaw] Migrating secrets to CF Secrets Store..."
echo "NOTE: Run these commands one by one, entering the secret values when prompted."
echo ""

# Fleet Gateway
echo "# Fleet Gateway secrets:"
echo "npx wrangler secret put FLEET_GATEWAY_TOKEN --name fleet-gateway"
echo "npx wrangler secret put FLEET_AUTH_TOKEN --name fleet-gateway"
echo "npx wrangler secret put KG_TOKEN --name fleet-gateway"
echo "npx wrangler secret put NEO4J_AUTH --name fleet-gateway"
echo "npx wrangler secret put MEM0_API_KEY --name fleet-gateway"
echo "npx wrangler secret put BRAVE_API_KEY --name fleet-gateway"
echo "npx wrangler secret put NEON_CONNECTION_STRING --name fleet-gateway"
echo "npx wrangler secret put TAVILY_API_KEY --name fleet-gateway"
echo "npx wrangler secret put COHERE_API_KEY --name fleet-gateway"
echo "npx wrangler secret put GROQ_API_KEY --name fleet-gateway"
echo "npx wrangler secret put OPENROUTER_API_KEY --name fleet-gateway"
echo "npx wrangler secret put CF_ACCOUNT_ID --name fleet-gateway"
echo ""

# YEDAN Workers (shared token)
for worker in yedan-orchestrator yedan-cloud-executor yedan-intel-ops yedan-health-commander; do
  echo "# $worker secrets:"
  echo "npx wrangler secret put BUNSHIN_AUTH_TOKEN --name $worker"
  echo "npx wrangler secret put FLEET_AUTH_TOKEN --name $worker"
  echo ""
done

# Durable Objects Worker
echo "# openclaw-do secrets:"
echo "npx wrangler secret put FLEET_GATEWAY_TOKEN --name openclaw-do"
echo ""

# Workflows Worker
echo "# openclaw-workflows secrets:"
echo "npx wrangler secret put FLEET_GATEWAY_TOKEN --name openclaw-workflows"
echo ""

# GitHub Actions (set via GitHub Settings → Secrets)
echo "# GitHub Actions secrets (set via github.com → Settings → Secrets):"
echo "ANTHROPIC_API_KEY — for claude-code-action"
echo "CF_API_TOKEN — for wrangler-action"
echo "CF_ACCOUNT_ID — for wrangler-action"
echo "FLEET_GATEWAY_TOKEN — for deploy notification"
echo ""

echo "[OpenClaw] After running these commands, remove any plaintext tokens from wrangler.toml [vars] sections."
echo "Secrets set via 'wrangler secret put' are encrypted and never appear in code."
