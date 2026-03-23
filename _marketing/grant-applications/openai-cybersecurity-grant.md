# OpenAI Cybersecurity Grant Application
**URL:** https://openai.com/index/openai-cybersecurity-grant-program/
**Amount:** API credits from $10M pool
**Status:** DRAFT — Check if applications are currently open

---

## Project Name
OpenClaw — Security-First AGI Runtime with MCP Tool Infrastructure

## Description

OpenClaw is an open-source AI agent architecture with security as a core design principle. The system includes:

**MCP Server Security:**
- 9 production MCP servers on Cloudflare Workers with rate limiting, input validation, and edge-based isolation
- Rate limiting via Cloudflare KV prevents abuse
- No persistent user data stored on servers
- MCP spec-compliant transport (Streamable HTTP)

**AGI Runtime Security:**
- Constitution v3.1 with 12 NEVER rules and 7 ALWAYS rules
- Shell injection prevention via shlex.quote() on all subprocess calls
- SQL injection prevention via parameterized queries and identifier validation
- Path traversal prevention via os.path.realpath() + directory whitelisting
- Prompt injection detection with blocklist patterns
- Context isolation between agents
- Least-privilege tool access per agent
- Circuit breakers for dependency isolation
- Admission control with priority-based shedding
- Error budget governance with SLO/SLI tracking

**Relevant to OpenAI's Cybersecurity Focus:**
- Our Governor v7.4.1 implements deterministic patch safety gates that prevent unsafe code changes
- Our fault injection system enables controlled chaos testing of AI agent resilience
- Our multi-agent architecture demonstrates practical security patterns for production AGI deployments

## How we would use API credits

1. Enhanced prompt injection detection testing across our 9 MCP servers
2. Red-team evaluation of our Constitution enforcement layer
3. Adversarial testing of our admission control under simulated attack scenarios
4. Research on MCP-specific security patterns (tool poisoning, context manipulation)

## Links
- GitHub: https://github.com/yedanyagami/openclaw-mcp-servers
- License: MIT
