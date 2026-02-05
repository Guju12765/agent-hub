# CLI Commands

Complete reference for Agent Hub commands.

## Agent Management

### create

Create a new agent with default templates.

```bash
agent-hub create <name> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --specialty <desc>` | Agent specialty description |

**Example:**
```bash
npx agent-hub create alice -s "Full-stack engineer"
```

Creates agent with starter templates:
- Skills: memory-summarization, skill-creator
- Rules: coding-style, performance
- Commands: extract-session
- Hooks: SessionStart reminder, PreCompact prompt
- Scripts: extract-session.js, lib/utils.js

---

### agents

List all available agents.

```bash
agent-hub agents
```

**Example output:**
```
Agents:
  alice          Full-stack engineer       12 memories
  bob            Backend specialist        5 memories
```

---

### status

Show agent status and memory stats.

```bash
agent-hub status [name]
```

**Example:**
```bash
agent-hub status alice
```

---

### delete

Permanently delete an agent and all its memory.

```bash
agent-hub delete <name> [options]
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Skip confirmation prompt |

**Example:**
```bash
agent-hub delete alice --force
```

---

## Project Deployment

### hire

Deploy an agent to the current project with conflict resolution support.

```bash
npx agent-hub hire <name> [options]
```

| Option | Description |
|--------|-------------|
| `-g, --global` | Add to global settings instead of project |
| `-u, --update` | Update existing agent (re-hire with conflict resolution) |
| `--dry-run` | Show what would be copied without making changes |
| `--force-keep` | Keep existing files, skip conflicts |
| `--force-replace` | Replace all conflicting files |

**Examples:**
```bash
# Hire for this project (interactive conflict resolution)
npx agent-hub hire alice

# Update an already-hired agent with new files
npx agent-hub hire alice --update

# Preview changes before installing
npx agent-hub hire alice --dry-run

# Hire globally
npx agent-hub hire alice --global

# Force replace all conflicts during update
npx agent-hub hire alice --update --force-replace
```

See [hire command documentation](../cli/hire.md) for full details on conflict resolution.

---

---

## Planned Commands

The following commands are planned but not yet implemented:

### fire (Planned)

Remove an agent from the current project.

```bash
npx agent-hub fire <name>
```

### Config Sync (Planned)

- `agent-hub diff <name>` - Compare master vs project configurations
- `agent-hub pull <name>` - Pull config updates from master to project
- `agent-hub push <name>` - Push config changes from project to master

### Sharing (Planned)

- `agent-hub export <name>` - Export agent as archive
- `agent-hub import <archive>` - Import agent from archive
- `agent-hub clone <source> <target>` - Clone an existing agent

See [Sharing documentation](/sharing/) for workarounds and details.

---

## MCP Server

### serve

Start the MCP server (typically invoked automatically by Claude Code).

```bash
agent-hub --agent <name> [options]
```

| Option | Description |
|--------|-------------|
| `--agent <name>` | Agent to serve (required) |
| `--project` | Use project memory instead of master |

This is what gets configured in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "alice-memory": {
      "command": "npx",
      "args": ["agent-hub", "--agent", "alice", "--project"]
    }
  }
}
```

### MCP Tools

When the server runs, these tools are available:

| Tool | Description |
|------|-------------|
| `memory_search` | Semantic search across all memory files |
| `memory_get` | Retrieve specific lines from memory files |
| `memory_status` | Check memory statistics |

---

## Built-in Slash Commands

Every agent comes with default commands:

### Memory & Learning

| Command | Description |
|---------|-------------|
| `/extract-session` | Extract full session transcript to memory |
| `/memory-summarization` | Save session state and memories (triggered at PreCompact) |

### Adding Custom Commands

You can easily add custom commands by creating `.md` files in `~/.agent-hub/agents/<name>/commands/`:

```bash
# Example: Create a custom command
mkdir -p ~/.agent-hub/agents/alice/commands
cat > ~/.agent-hub/agents/alice/commands/plan.md << 'EOF'
# Plan Command

Create implementation plans by:
1. Analyzing requirements
2. Breaking down into steps
3. Identifying dependencies
EOF

# After hiring the agent, use it with:
# /plan
```
