---
name: Feature Request
about: Suggest a new tool or improvement to an existing server
title: "[FEATURE] "
labels: enhancement
assignees: ''
---

## Type

- [ ] New tool for an existing server
- [ ] New MCP server
- [ ] Improvement to an existing tool
- [ ] Documentation improvement
- [ ] Other

## Target Server (if applicable)

Which server should this be added to?

## Description

A clear description of the feature you want.

## Use Case

Describe the problem this solves. What workflow or AI agent task would benefit from this?

**Example prompt an AI agent might receive:**

> "..."

**How this tool would help:**

## Proposed Tool Schema (optional)

If you have a specific API design in mind:

```json
{
  "name": "proposed_tool_name",
  "description": "What it does",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param": {
        "type": "string",
        "description": "What this parameter accepts"
      }
    },
    "required": ["param"]
  }
}
```

## Expected Output (optional)

```json
{
  "output": "example result"
}
```

## Additional Context

Any other details, screenshots, or references.
