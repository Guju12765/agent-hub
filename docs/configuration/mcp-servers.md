# MCP Servers Configuration

Configure additional MCP servers your agent needs.

**Location:** `~/.agent-hub/agents/<name>/mcp-servers.json`

## Default Template

```json
{
  "_comment": "MCP server dependencies. Injected into settings.json on hire.",
  "servers": {
    // Add your servers here
  }
}
```

## Example Configuration

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "/path/to/allowed/dir"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

## How It Works

When you run `agent-hub hire`:

1. Reads `mcp-servers.json` from master
2. Adds the memory server automatically
3. Merges everything into `.claude/settings.json`

**Result in `.claude/settings.json`:**

```json
{
  "mcpServers": {
    "alice-memory": {
      "command": "npx",
      "args": ["agent-hub", "--agent", "alice", "--project"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "/path/to/allowed/dir"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

## Environment Variables

Use `${VAR_NAME}` syntax for environment variables:

```json
{
  "env": {
    "API_KEY": "${MY_API_KEY}",
    "DATABASE_URL": "${DATABASE_URL}"
  }
}
```

These are resolved at runtime by Claude Code.

## Popular MCP Servers

| Server | Package | Description |
|--------|---------|-------------|
| Filesystem | `@anthropic/mcp-server-filesystem` | Read/write files |
| GitHub | `@anthropic/mcp-server-github` | GitHub API access |
| PostgreSQL | `@anthropic/mcp-server-postgres` | Database queries |
| Brave Search | `@anthropic/mcp-server-brave-search` | Web search |
