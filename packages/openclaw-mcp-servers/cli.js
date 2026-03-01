#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const data = require('./servers.json');
const args = process.argv.slice(2);
const cmd = args[0] || '--config';

if (cmd === '--help' || cmd === '-h') {
  console.log(`
openclaw-mcp — 49 MCP tools on Cloudflare Workers

Usage:
  npx openclaw-mcp-servers --config     Output MCP config JSON (paste into .mcp.json)
  npx openclaw-mcp-servers --list       List all 49 tools with descriptions
  npx openclaw-mcp-servers --servers    List 9 server endpoints
  npx openclaw-mcp-servers --x402       Show x402 payment info
  npx openclaw-mcp-servers --claude     Output config for Claude Code
  npx openclaw-mcp-servers --cursor     Output config for Cursor

Free: 3 calls/tool/day. x402: $0.05/call USDC on Base. Pro: $9 one-time.
Docs: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
`);
  process.exit(0);
}

if (cmd === '--config' || cmd === '-c') {
  const config = { mcpServers: {} };
  for (const [key, val] of Object.entries(data.mcpServers)) {
    config.mcpServers[key] = { url: val.url };
  }
  console.log(JSON.stringify(config, null, 2));
  process.exit(0);
}

if (cmd === '--claude') {
  console.log('Add to ~/.claude.json or .mcp.json:\n');
  const config = { mcpServers: {} };
  for (const [key, val] of Object.entries(data.mcpServers)) {
    config.mcpServers[key] = { url: val.url };
  }
  console.log(JSON.stringify(config, null, 2));
  process.exit(0);
}

if (cmd === '--cursor') {
  console.log('Add to .cursor/mcp.json:\n');
  const config = { mcpServers: {} };
  for (const [key, val] of Object.entries(data.mcpServers)) {
    config.mcpServers[key] = { url: val.url };
  }
  console.log(JSON.stringify(config, null, 2));
  process.exit(0);
}

if (cmd === '--list' || cmd === '-l') {
  let total = 0;
  for (const [key, val] of Object.entries(data.mcpServers)) {
    console.log(`\n${key} (${val.tools.length} tools)`);
    console.log(`  ${val.url}`);
    console.log(`  ${val.description}`);
    for (const t of val.tools) {
      console.log(`    - ${t}`);
    }
    total += val.tools.length;
  }
  console.log(`\nTotal: ${total} tools across ${Object.keys(data.mcpServers).length} servers`);
  process.exit(0);
}

if (cmd === '--servers' || cmd === '-s') {
  for (const [key, val] of Object.entries(data.mcpServers)) {
    console.log(`${key.padEnd(22)} ${val.url}`);
  }
  process.exit(0);
}

if (cmd === '--x402') {
  console.log('x402 Payment Info:');
  console.log(`  Network:   ${data.x402.network}`);
  console.log(`  Currency:  ${data.x402.currency}`);
  console.log(`  Amount:    $${data.x402.amount}/call`);
  console.log(`  Recipient: ${data.x402.recipient}`);
  console.log('\nFree tier: 3 calls/tool/day per IP');
  console.log('After limit: HTTP 402 + X-Payment headers → auto-pay with @x402/fetch');
  process.exit(0);
}

// Default: output config
const config = { mcpServers: {} };
for (const [key, val] of Object.entries(data.mcpServers)) {
  config.mcpServers[key] = { url: val.url };
}
console.log(JSON.stringify(config, null, 2));
