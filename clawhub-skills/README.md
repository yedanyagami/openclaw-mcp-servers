# ClawHub Skills

## What Are Skills?

Skills are modular capability packages that extend OpenClaw's agent system. Each skill is a self-contained directory with its own logic, configuration, and metadata. Skills are the building blocks that power the MCP servers -- each server exposes one or more skills as MCP tools.

Think of it this way:
- **Skills** = the internal capability (the code that does the work)
- **MCP Servers** = the external interface (how AI clients discover and call the skill)

## Directory Structure

Each skill directory contains the implementation for a specific capability domain. There are currently **19 skill packages** in this directory:

| # | Skill | Description |
|---|---|---|
| 1 | `agentforge-compare` | AI model comparison, benchmarking, and recommendation engine |
| 2 | `color-palette` | Color information, palette generation, WCAG contrast checking |
| 3 | `json-toolkit` | JSON validation, formatting, diffing, querying, transformation |
| 4 | `moltbook-publisher` | Content publishing, article creation, SEO analysis |
| 5 | `openclaw-agent-orchestrator` | Multi-agent coordination and task routing |
| 6 | `openclaw-api-monitor` | API health monitoring and alerting |
| 7 | `openclaw-content-autopilot` | Automated content generation and scheduling |
| 8 | `openclaw-crypto-payments` | Cryptocurrency payment processing |
| 9 | `openclaw-database-toolkit` | Database query and management tools |
| 10 | `openclaw-fortune` | Fortune telling and tarot card readings |
| 11 | `openclaw-health-monitor` | System health checks and diagnostics |
| 12 | `openclaw-intel` | Market intelligence, tech scanning, trend reports |
| 13 | `openclaw-revenue-tracker` | Revenue tracking and financial analytics |
| 14 | `openclaw-task-queue` | Task queuing and background job management |
| 15 | `openclaw-telegram-bot` | Telegram bot integration and messaging |
| 16 | `openclaw-web-scraper` | Web scraping and data extraction |
| 17 | `prompt-enhancer` | Prompt improvement, chain-of-thought, few-shot generation |
| 18 | `regex-engine` | Regex testing, extraction, replacement, explanation |
| 19 | `timestamp-converter` | Time conversion, timezone handling, cron expression parsing |

## How Skills Relate to MCP Servers

The 9 public MCP servers map to skills as follows:

| MCP Server | Primary Skill | Tools |
|---|---|---|
| JSON Toolkit | `json-toolkit` | 6 |
| Regex Engine | `regex-engine` | 5 |
| Color Palette | `color-palette` | 5 |
| Timestamp Converter | `timestamp-converter` | 5 |
| Prompt Enhancer | `prompt-enhancer` | 6 |
| Market Intelligence | `openclaw-intel` | 6 |
| Fortune & Tarot | `openclaw-fortune` | 3 |
| Content Publisher | `moltbook-publisher` + `openclaw-content-autopilot` | 8 |
| AI Tool Compare | `agentforge-compare` | 5 |

The remaining skills (`openclaw-agent-orchestrator`, `openclaw-api-monitor`, `openclaw-crypto-payments`, `openclaw-database-toolkit`, `openclaw-health-monitor`, `openclaw-revenue-tracker`, `openclaw-task-queue`, `openclaw-telegram-bot`, `openclaw-web-scraper`) are internal capabilities used by the OpenClaw platform. They may become public MCP servers in future releases.

## Skill Format

Each skill follows this structure:

```
skill-name/
  index.js          # Main entry point
  package.json      # Metadata and dependencies
  tools/            # Individual tool implementations
  tests/            # Test files
```

Skills export their tools using the standard format:

```javascript
module.exports = {
  name: 'tool-name',
  description: 'What this tool does',
  async run(ctx) {
    // Tool implementation
  }
}
```

## Contributing a Skill

To add a new skill:

1. Create a new directory under `clawhub-skills/`
2. Implement the tool(s) using the format above
3. Add tests
4. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full guidelines.
