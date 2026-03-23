# openclaw-fortune-mcp

![MCP](https://img.shields.io/badge/MCP-compatible-brightgreen) ![Tools](https://img.shields.io/badge/tools-3-blue) ![Free](https://img.shields.io/badge/free-50%20calls%2Fday-orange)

**One-line:** Get your daily fortune, tarot reading, or compatibility check -- for fun.

> **EN:** Fun fortune-telling tools for AI assistants -- daily fortunes, tarot, and compatibility.
> **ZH-TW:** AI 助手的趣味占卜工具 -- 每日運勢、塔羅牌和相容性測試。
> **JA:** AIアシスタントのための占いツール -- デイリー運勢、タロット、相性診断。

## What is this?

openclaw-fortune-mcp is a lighthearted remote MCP server that adds fortune-telling capabilities to your AI assistant. It generates daily fortunes with lucky numbers, performs tarot card readings with interpretations, and checks compatibility between two names or concepts. It is meant for entertainment -- do not make life decisions based on it.

## Why use it?

- **Break the ice** with daily fortunes in team standups or chat channels
- **Creative inspiration** from tarot card interpretations and symbolism
- **Fun compatibility checks** between names, projects, or programming languages

## Included tools

1. **fortune** - Generate a daily fortune with lucky number, color, mood, and advice
2. **tarot_reading** - Draw tarot cards and get interpretations for past, present, and future
3. **compatibility** - Check compatibility between two names or concepts with a percentage score

## Install

**Cursor (one-click):** Add this URL in Cursor Settings > MCP:
```
https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp
```

**Claude Desktop (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "openclaw-fortune": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote", "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"]
    }
  }
}
```

**Manual (curl):**
```bash
curl -X POST https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"fortune","arguments":{"name":"Yagami"}}}'
```

## Try it now

```bash
curl -s -X POST https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"fortune","arguments":{"name":"Developer"}}}' | jq
```

## Example input

```json
{
  "method": "tools/call",
  "params": {
    "name": "tarot_reading",
    "arguments": {
      "question": "What should I focus on this week?",
      "spread": "three_card"
    }
  }
}
```

## Expected output

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"spread\":\"three_card\",\"cards\":[{\"position\":\"past\",\"card\":\"The Hermit\",\"orientation\":\"upright\",\"interpretation\":\"You have spent time in deep reflection and solitary work. This foundation of introspection serves you well.\"},{\"position\":\"present\",\"card\":\"The Star\",\"orientation\":\"upright\",\"interpretation\":\"Hope and inspiration flow freely right now. Trust your vision and stay open to possibilities.\"},{\"position\":\"future\",\"card\":\"Three of Pentacles\",\"orientation\":\"upright\",\"interpretation\":\"Collaboration will be key. Seek out skilled partners and build something together.\"}],\"summary\":\"Your solitary preparation is paying off. Stay inspired and open to collaboration this week.\"}"
    }
  ]
}
```

## Tool-by-tool reference

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `fortune` | Daily fortune | `name` (string, optional) | `{fortune, lucky_number, lucky_color, mood, advice}` |
| `tarot_reading` | Tarot card draw | `question` (string, optional), `spread` (string: single/three_card/celtic_cross) | `{cards: [{position, card, orientation, interpretation}], summary}` |
| `compatibility` | Compatibility check | `name1` (string), `name2` (string) | `{score: number, analysis: string, strengths: [], challenges: []}` |

## Common use cases

1. **Team building** - Start standup meetings with a group fortune for the day
2. **Creative writing** - Use tarot readings as story prompts or character development seeds
3. **Fun breaks** - Check compatibility between your favorite programming languages
4. **Content creation** - Generate daily fortune posts for social media bots
5. **Decision making** - Just kidding. Do not use this for actual decisions.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Same fortune every time | Fortunes are seeded by date + name. Change the `name` parameter for variety. |
| Tarot cards repeating | Each reading is randomized. The same card appearing is coincidence, not a bug. |
| Compatibility always high | The algorithm uses name hashing. Try full names for more differentiated results. |

## Pricing

| Plan | Price | Calls | Servers |
|------|-------|-------|---------|
| **Free** | $0 | 50/day | openclaw-fortune + 2 others |
| **Pro** | $9/month | 50,000/month | All 9 servers + priority support |
| **Enterprise** | Custom | Unlimited | Custom SLA + dedicated edge |

---

[Back to main README](../README.md)

---

## ZH-TW

openclaw-fortune-mcp 是一個輕鬆有趣的遠端 MCP 伺服器，為你的 AI 助手加入占卜功能。它能生成每日運勢（含幸運數字和顏色）、進行塔羅牌抽牌解讀，以及檢查兩個名字或概念之間的相容性。純粹娛樂用途，免費方案每天 50 次呼叫。

## JA

openclaw-fortune-mcp は、AIアシスタントに占い機能を追加する楽しいリモートMCPサーバーです。ラッキーナンバーやカラー付きのデイリー運勢、タロットカードリーディング、名前や概念間の相性診断が可能です。エンターテインメント目的で、無料プランは1日50回まで利用できます。
