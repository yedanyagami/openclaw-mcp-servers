# YEDAN x BUNSIN — System Architecture
# Updated: 2026-03-08

## Overview
```
YEDAN (Local Brain)          BUNSIN (Cloud Brain)
═══════════════════          ══════════════════════
OpenClaw Gateway ──────────→ 24 Cloudflare Workers
Port 18789                   *.yagami8095.workers.dev
7 Agents / 92 Skills
Cron System (29 jobs)        Auto-Agent (*/10 OODA)
Claude Code CLI              Status Dashboard
Telegram Bot                 Product Store
                             x402 Gateway
```

## BUNSIN Cloud Fleet (24 Workers)

### Core MCP Servers (9) — Revenue Layer
| # | Server | Workers Name | Tools |
|---|--------|-------------|-------|
| 1 | JSON Toolkit | json-toolkit-mcp | 6 |
| 2 | Regex Engine | regex-engine-mcp | 5 |
| 3 | Color Palette | color-palette-mcp | 5 |
| 4 | Timestamp Converter | timestamp-converter-mcp | 5 |
| 5 | Prompt Enhancer | prompt-enhancer-mcp | 6 |
| 6 | Market Intelligence | openclaw-intel-mcp | 6 |
| 7 | Fortune & Tarot | openclaw-fortune-mcp | 3 |
| 8 | Content Publisher | moltbook-publisher-mcp | 8 |
| 9 | AI Tool Compare | agentforge-compare-mcp | 5 |

### Fleet Workers (6) — Operations Layer
| Worker | Role |
|--------|------|
| yedan-orchestrator | Fleet coordination |
| yedan-health-commander | Health monitoring |
| yedan-revenue-sentinel | Revenue tracking |
| yedan-cloud-executor | Task execution |
| yedan-content-engine | Content generation |
| yedan-intel-ops | Intelligence ops |

### Support Workers (9) — Infrastructure Layer
| Worker | Role |
|--------|------|
| yedan-auto-agent | Autonomous OODA loop (*/10 cron) |
| yedan-status-dashboard | Service health UI |
| product-store | Digital product storefront |
| openclaw-x402-gateway | USDC micropayment gateway |
| openclaw-intel-api | Intel Pro API |
| fortune-api | Fortune REST API |
| kpi-dashboard | KPI metrics |
| openclaw-analytics | Analytics tracking |
| quality-scorer-mcp | Quality scoring |

## YEDAN Local System

### Agents (7)
main, revenue-tracker, moltbook, intel-collector, browser-agent, github, clawops

### Key Paths
- `~/.openclaw/` — OpenClaw platform (1.9GB)
- `~/openclaw-mcp-servers/` — All worker source code
- `~/ClawWork/` — GDPVal benchmark
- `~/bin/` — Automation scripts

### Revenue Flow
```
PayPal ──────┐
Stripe ──────┤
USDC x402 ───┤──→ 兆豐銀行 24110234810 (Primary)
note.com ────┤
Bank xfer ───┘
International ──→ 國泰世華 258506100850 (Backup)
```

## Deployment
```bash
~/bin/cloud-deploy.sh all    # Deploy everything
~/bin/cloud-deploy.sh mcp    # Deploy 9 MCP servers
~/bin/cloud-deploy.sh fleet  # Deploy 6 fleet workers
~/bin/cloud-deploy.sh status # Health check
```
