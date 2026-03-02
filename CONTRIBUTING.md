# Contributing to OpenClaw MCP Servers

Thank you for your interest in contributing. This guide covers how to add new tools, deploy to Cloudflare Workers, and follow our code conventions.

## Repository Structure

```
openclaw-mcp-servers/
  json-toolkit-mcp/       # Each server is a standalone directory
    worker.js             # Single-file Cloudflare Worker
    wrangler.toml         # Cloudflare deployment config
    smithery.yaml         # Smithery registry metadata
    README.md             # Per-server documentation
    package.json          # Dependencies (minimal)
  regex-engine-mcp/
  color-palette-mcp/
  ...
  .github/workflows/     # CI/CD
  packages/              # npm package
  memory/                # Project memory (do not edit)
```

Each MCP server is a **single worker.js file** deployed independently to Cloudflare Workers. There is no shared build step or monorepo tooling -- each directory is self-contained.

---

## Adding a New Tool to an Existing Server

### 1. Define the tool schema

Open the server's `worker.js` and find the `TOOLS` array. Add your tool definition following the MCP tool schema:

```javascript
{
  name: 'my_new_tool',
  description: 'One sentence describing what this tool does. Be specific.',
  inputSchema: {
    type: 'object',
    properties: {
      input_param: {
        type: 'string',
        description: 'What this parameter accepts',
      },
      optional_flag: {
        type: 'boolean',
        description: 'Optional behavior toggle',
        default: false,
      },
    },
    required: ['input_param'],
  },
}
```

### 2. Implement the tool function

Add a pure function above the dispatcher. Keep it synchronous when possible:

```javascript
function myNewTool(inputParam, optionalFlag = false) {
  // Validate input
  if (!inputParam || typeof inputParam !== 'string') {
    return { error: 'input_param is required and must be a string' };
  }

  // Process
  const result = doSomething(inputParam, optionalFlag);

  return {
    output: result,
    // Always include ecosystem links for cross-discovery
    ecosystem: ECOSYSTEM,
  };
}
```

### 3. Wire it into the dispatcher

Find the `handleToolCall` function and add a case:

```javascript
case 'my_new_tool':
  return jsonRpcResponse(id, toolResult(
    myNewTool(args.input_param, args.optional_flag)
  ));
```

### 4. Update documentation

- Update the `TOOLS` count in the file header comment
- Add the tool to the server's `README.md`
- Add the tool to the root `README.md` table

---

## Creating a New MCP Server

### 1. Create the directory

```bash
mkdir my-new-mcp
cd my-new-mcp
```

### 2. Create wrangler.toml

```toml
name = "my-new-mcp"
main = "worker.js"
compatibility_date = "2024-12-01"

[vars]
SERVER_NAME = "My New Server"
SERVER_VERSION = "1.0.0"

[[kv_namespaces]]
binding = "KV"
id = "412eb1678043499eb34f0e7f211176b9"
```

All servers share the same KV namespace for rate limiting and Pro key validation. Use a unique key prefix for your server's rate limits (e.g., `rl:myserver:`).

### 3. Use the worker template

Copy the structure from an existing server like `json-toolkit-mcp/worker.js`. The required sections are:

1. **Server constants** -- `SERVER_INFO`, `VENDOR`, `CAPABILITIES`, `MCP_PROTOCOL_VERSION`
2. **Rate limiting** -- KV-backed with in-memory fallback
3. **Pro API key validation** -- shared `prokey:{key}` pattern
4. **ECOSYSTEM object** -- links to all 9+ servers for cross-discovery
5. **Tool definitions** -- `TOOLS` array with MCP-compliant schemas
6. **Tool implementations** -- pure functions
7. **MCP dispatcher** -- handles `initialize`, `tools/list`, `tools/call`, `ping`
8. **HTTP handler** -- CORS, POST routing, JSON-RPC parsing

### 4. Add to CI/CD

Edit `.github/workflows/deploy.yml`:
- Add your directory to the `paths` trigger list
- Add an entry to the `WORKERS` JSON array

---

## Deploying to Cloudflare Workers

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account with Workers enabled

### Local development

```bash
cd json-toolkit-mcp
npx wrangler dev
```

This starts a local server at `http://localhost:8787`. Test with curl:

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Manual deploy

```bash
cd json-toolkit-mcp
npx wrangler deploy
```

### Automated deploy (CI/CD)

Pushes to `main` that modify files in a server directory automatically trigger deployment via GitHub Actions. The workflow:

1. Detects which server directories changed
2. Deploys only the changed workers
3. Uses `CF_API_TOKEN` and `CF_ACCOUNT_ID` from repository secrets

---

## Code Style Guide

### General principles

- **Single file per server.** Each `worker.js` is self-contained. No imports, no build step, no bundler.
- **No external dependencies at runtime.** Everything runs on Cloudflare Workers' V8 runtime. Standard Web APIs only.
- **Pure functions for tools.** Tool logic should be stateless and deterministic. Side effects belong in the dispatcher layer.
- **Fail gracefully.** Every tool function returns either a result object or an `{ error: "message" }` object. Never throw from tool implementations.

### Naming conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Tool names | `snake_case` | `json_format`, `regex_test` |
| Function names | `camelCase` | `jsonFormat`, `regexTest` |
| Constants | `UPPER_SNAKE_CASE` | `RATE_LIMIT_MAX`, `SERVER_INFO` |
| KV rate limit keys | `rl:{server}:{ip}:{date}` | `rl:json:1.2.3.4:2026-03-03` |

### Response format

All tool functions must return a plain object. The dispatcher wraps it:

```javascript
// Tool function returns data
function myTool(input) {
  return { output: "processed", count: 42, ecosystem: ECOSYSTEM };
}

// Dispatcher wraps it in MCP format
return jsonRpcResponse(id, toolResult(myTool(args.input)));
```

### Error handling

```javascript
// Input validation -- return error object, do not throw
if (!input) {
  return { error: 'input parameter is required' };
}

// Unexpected errors -- catch and return
try {
  const result = riskyOperation();
  return { output: result };
} catch (e) {
  return { error: `Processing failed: ${e.message}` };
}
```

### Rate limiting pattern

Every server must implement rate limiting. Use the shared KV namespace with a unique key prefix:

```javascript
const RATE_LIMIT_MAX = 20;
const key = `rl:myserver:${ip}:${today}`;
```

Always include the in-memory fallback for KV failures:

```javascript
if (!kv) return memoryRateLimit(ip);
```

### CORS headers

All servers must return proper CORS headers:

```javascript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};
```

### Ecosystem cross-links

Every tool response should include the `ecosystem` object so AI agents discover related servers:

```javascript
const ECOSYSTEM = {
  json_toolkit: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  regex:        'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  // ... all servers
};
```

---

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/add-my-tool`
3. Make your changes in a single server directory
4. Test locally with `npx wrangler dev`
5. Verify with curl that `tools/list` shows your new tool and `tools/call` returns correct results
6. Update the server's `README.md` and root `README.md`
7. Open a pull request against `main`

### PR checklist

- [ ] Tool schema has `name`, `description`, and `inputSchema` with `required` fields
- [ ] Tool function validates all inputs and returns `{ error }` on bad input
- [ ] Rate limiting key prefix is unique and does not collide with other servers
- [ ] `ECOSYSTEM` object is included in tool responses
- [ ] `README.md` updated with new tool documentation
- [ ] Tested locally with `wrangler dev` and curl

---

## Questions?

Open a [GitHub Issue](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers/issues) or start a [Discussion](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers/discussions).
