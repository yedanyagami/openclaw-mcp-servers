---
name: Bug Report
about: Report a bug with an OpenClaw MCP server
title: "[BUG] "
labels: bug
assignees: ''
---

## Server

Which server(s) are affected?

- [ ] json-toolkit-mcp
- [ ] regex-engine-mcp
- [ ] color-palette-mcp
- [ ] timestamp-converter-mcp
- [ ] prompt-enhancer-mcp
- [ ] openclaw-intel-mcp
- [ ] openclaw-fortune-mcp
- [ ] moltbook-publisher-mcp
- [ ] agentforge-compare-mcp

## MCP Client

Which MCP client are you using?

- [ ] Claude Code
- [ ] Cursor
- [ ] Windsurf
- [ ] Cline
- [ ] Custom / Other: ___

## Describe the Bug

A clear description of what went wrong.

## Request Sent

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name_here",
    "arguments": {}
  }
}
```

## Response Received

```json

```

## Expected Response

What you expected to receive instead.

## Additional Context

- Are you using a Pro API key? (yes/no)
- Approximate time of the request (UTC):
- Any error codes or HTTP status codes:
