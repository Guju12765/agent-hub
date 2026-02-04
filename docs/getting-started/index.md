# Installation

## Quick Install

```bash
npm install -g agent-hub
```

## Verify Installation

```bash
agent-hub --version
```

## Requirements

- **Node.js 22+** - Required for local embeddings (Node 22 LTS recommended)
- **Claude Code or Codex CLI** - For deploying agents to projects

## What Gets Installed

Agent Hub provides:

- `agent-hub` CLI command for managing agents
- MCP server for memory tools (started automatically by Claude Code)
- Local embedding model (downloads on first use, ~300MB)
- Default templates for skills, rules, agents, commands, and hooks

## Embeddings Setup (Optional)

Agent Hub uses embeddings for semantic memory search. **By default, local embeddings work with no configuration.**

For faster/better embeddings, you can optionally set up an API key:

| Provider | Setup | Cost |
|----------|-------|------|
| **Local** (default) | None needed | Free |
| **OpenAI** | `export OPENAI_API_KEY=sk-...` | ~$0.02/1M tokens |
| **Gemini** | `export GOOGLE_API_KEY=...` | Free tier available |

::: tip Recommendation
Start with local embeddings (no setup). If you want faster search, add a Gemini API key (free tier).
:::

See [Embeddings Setup](/configuration/embeddings) for detailed instructions.

## Next Steps

Once installed, you're ready to [create your first agent](/getting-started/first-agent).
