# Antigravity Claude Proxy - Node Deployment Guide

## Overview

This deploys `antigravity-claude-proxy@2.8.1` to 3 free cloud platforms:

| Platform | App Name | Region | Free Tier |
|----------|----------|--------|-----------|
| Fly.io | yedan-antigravity-n2 | nrt (Tokyo) | 256MB shared-cpu-1x |
| Koyeb | yedan-antigravity-n3 | fra (Frankfurt) | 256MB 0.1 vCPU |
| Railway | (project-based) | auto | 500 hours/month |

## Prerequisites

Install the CLI tools for each platform:

```bash
# Fly.io
curl -L https://fly.io/install.sh | sh
flyctl auth login

# Koyeb
curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | sh
koyeb login

# Railway
npm install -g @railway/cli
railway login
```

## Deploying

```bash
chmod +x deploy.sh

# Deploy to one platform
./deploy.sh fly
./deploy.sh koyeb
./deploy.sh railway

# Deploy to all 3
./deploy.sh all

# Check status
./deploy.sh status
```

## Adding Google Accounts (OAuth Flow)

After deployment, each node needs at least one Google account linked via OAuth. The proxy stores credentials in `accounts.json`.

### Step 1: Access the Proxy Web UI

Each platform provides a public URL after deployment:

- **Fly.io**: `https://yedan-antigravity-n2.fly.dev`
- **Koyeb**: Check `koyeb service get yedan-antigravity-n3/antigravity-proxy` for URL
- **Railway**: Check `railway status` or the Railway dashboard

### Step 2: Start the OAuth Flow

Navigate to the proxy's management endpoint (typically `/manage` or `/auth`) in your browser. Follow the on-screen instructions to:

1. Click "Add Account"
2. Sign in with a Google account
3. Grant the required permissions
4. The proxy will store the OAuth tokens automatically

### Step 3: Verify the Account

After adding an account, check it was registered:

```bash
curl https://<your-proxy-url>/health
```

A healthy response with accounts registered confirms the setup.

## How accounts.json Works

The proxy stores account credentials in `~/.config/antigravity-proxy/accounts.json`:

```json
{
  "accounts": [
    {
      "email": "user@gmail.com",
      "cookies": { ... },
      "status": "active",
      "lastUsed": "2026-03-09T00:00:00Z"
    }
  ]
}
```

- **Fly.io**: Uses a persistent volume (`antigravity_data`) mounted at the config directory. Accounts survive redeployments.
- **Koyeb/Railway**: Filesystem is ephemeral. You must re-add accounts after each deploy, or mount persistent storage if available.

### Persisting Accounts on Ephemeral Platforms

Option A: Bake `accounts.json` into the Docker image (not recommended for security).

Option B: Use environment variables or secrets to inject account data at startup.

Option C: Use a startup script that pulls `accounts.json` from a secure location (S3, KV store, etc.).

## Account Selection Strategy

The `config.json` uses `"strategy": "sticky"` which means:

- Requests from the same source will reuse the same account when possible
- Accounts rotate only on cooldown or error
- `requestDelayMs: 3000` adds 3s between requests
- `defaultCooldownMs: 15000` is the cooldown after rate-limit hits
- `maxRetries: 3` retries on transient failures

## Verifying the Node is Working

```bash
# Health check
curl https://<your-proxy-url>/health

# Test a proxy request (replace with actual endpoint)
curl -X POST https://<your-proxy-url>/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"ping"}]}'
```

## Security Considerations

1. **Do not expose the proxy publicly without authentication.** The management UI and proxy endpoints should be protected. Consider:
   - Using Fly.io's private networking (`fly proxy`)
   - Adding a reverse proxy with basic auth or API key validation
   - Restricting access to known IP ranges via platform firewall rules

2. **accounts.json contains sensitive OAuth tokens.** Treat it like a password file:
   - Never commit it to git
   - Use encrypted storage when possible
   - On Fly.io, the persistent volume provides isolation

3. **Rate limiting is your friend.** The default config throttles requests to avoid triggering abuse detection. Do not disable throttling in production.

4. **Monitor your accounts.** Accounts can get flagged or suspended. Check the `/health` endpoint regularly and rotate accounts if needed.

5. **Keep the proxy updated.** Pin to a specific version (currently 2.8.1) and update deliberately after testing.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Health check failing | Check logs: `flyctl logs -a yedan-antigravity-n2` or platform equivalent |
| accounts.json lost after redeploy | Use persistent volume (Fly.io) or external storage |
| OAuth flow not loading | Ensure the proxy port matches the platform's expected port (8080) |
| Rate limited immediately | Increase `requestDelayMs` and `defaultCooldownMs` in config.json |
| Container OOM killed | 256MB is tight; reduce concurrent connections or upgrade instance |
