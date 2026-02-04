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

Creates agent with default templates:
- Skills (skill-creator, memory-summarization)
- Rules (security, testing, performance, git-workflow, etc.)
- Agents (code-reviewer, architect, tdd-guide, planner, etc.)
- Commands (extract-session)
- Hooks (SessionStart with memory recall)
- MCP servers (memory server)

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
| `--dry-run` | Show what would be copied without making changes |
| `--force-keep` | Keep existing files, skip conflicts |
| `--force-replace` | Replace all conflicting files |

**Examples:**
```bash
# Hire for this project (interactive conflict resolution)
npx agent-hub hire alice

# Preview changes before installing
npx agent-hub hire alice --dry-run

# Hire globally
npx agent-hub hire alice --global

# Force replace all conflicts
npx agent-hub hire alice --force-replace
```

See [hire command documentation](../cli/hire.md) for full details on conflict resolution.

---

### fire

Remove an agent from the current project.

```bash
npx agent-hub fire <name> [options]
```

| Option | Description |
|--------|-------------|
| `-g, --global` | Remove from global settings |

**Example:**
```bash
npx agent-hub fire alice
```

This removes the MCP configuration but keeps all files in `.claude/`.

---

### targets

List available target platforms.

```bash
agent-hub targets
```

**Example output:**
```
Available targets:
  claude    Claude Code         ✓ Supported
  codex     Codex CLI           ○ Placeholder
```

---

## Config Sync

### diff

Compare master vs project configurations.

```bash
agent-hub diff <name>
```

Shows differences between `~/.agent-hub/agents/<name>/` and `.claude/` for skills, hooks, commands, rules.

---

### pull

Pull config updates from master to project.

```bash
agent-hub pull <name> [options]
```

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Pull specific file only |
| `-a, --all` | Pull all changes without confirmation |

**Examples:**
```bash
# Interactive pull
agent-hub pull alice

# Pull specific file
agent-hub pull alice --file skills/code-review.md

# Pull all without prompts
agent-hub pull alice --all
```

---

### push

Push config changes from project to master.

```bash
agent-hub push <name> [options]
```

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Push specific file only |
| `-a, --all` | Push all changes without confirmation |

**Examples:**
```bash
# Interactive push
agent-hub push alice

# Push specific file
agent-hub push alice --file skills/new-skill.md
```

---

## Sharing

### export

Export an agent as a shareable archive.

```bash
agent-hub export <name> [options]
```

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory (default: current) |
| `-m, --include-memory` | Include memory files |

**Examples:**
```bash
# Export to current directory
agent-hub export alice

# Export to specific directory
agent-hub export alice -o ~/exports/

# Include memory
agent-hub export alice --include-memory
```

---

### import

Import an agent from an archive.

```bash
agent-hub import <archive> [options]
```

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Import with a different name |
| `-f, --overwrite` | Overwrite if agent already exists |

**Examples:**
```bash
# Import with original name
agent-hub import alice.agent.tar.gz

# Import with new name
agent-hub import alice.agent.tar.gz --name alice-copy

# Overwrite existing
agent-hub import alice.agent.tar.gz --overwrite
```

---

### clone

Clone an existing agent with a new name.

```bash
agent-hub clone <source> <target> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --specialty <desc>` | New specialty description |
| `-m, --include-memory` | Copy memory from source |

**Examples:**
```bash
# Basic clone
agent-hub clone alice alice-experimental

# Clone with new specialty
agent-hub clone alice alice-frontend -s "Frontend specialist"

# Clone with memory
agent-hub clone alice alice-backup --include-memory
```

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

Every agent comes with 24 built-in slash commands:

### Planning & Architecture

| Command | Description |
|---------|-------------|
| `/plan` | Create implementation plan (uses planner agent) |
| `/orchestrate` | Coordinate multi-agent workflows |

### Code Quality

| Command | Description |
|---------|-------------|
| `/code-review` | Security and quality review of changes |
| `/python-review` | Python-specific code review |
| `/go-review` | Go-specific code review |
| `/refactor-clean` | Refactoring assistance |

### Testing

| Command | Description |
|---------|-------------|
| `/tdd` | Test-driven development workflow |
| `/e2e` | End-to-end testing |
| `/test-coverage` | Check test coverage |
| `/verify` | Pre-commit verification |

### Build & Fix

| Command | Description |
|---------|-------------|
| `/build-fix` | Fix build errors |
| `/go-build` | Go build assistance |
| `/go-test` | Go test runner |

### Documentation

| Command | Description |
|---------|-------------|
| `/update-docs` | Update documentation |
| `/update-codemaps` | Update code maps |

### Learning & Memory

| Command | Description |
|---------|-------------|
| `/extract-session` | Extract and summarize session logs |
| `/checkpoint` | Save progress checkpoint |

> **Note:** The continuous learning commands (`/evolve`, `/instinct-*`) have been archived. See `docs/archived-skills/continuous-learning-v2/` for details.

### Utilities

| Command | Description |
|---------|-------------|
| `/skill-create` | Create new skill |
| `/eval` | Evaluate expressions |
