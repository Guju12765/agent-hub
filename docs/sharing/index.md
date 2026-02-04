# Sharing Agents

Agent Hub lets you package, share, and duplicate agents.

## Export an Agent

Package an agent as a shareable `.tar.gz` archive:

```bash
agent-hub export alice
```

**Output:**
```
Exported agent: alice
  Archive: ./alice.agent.tar.gz
  Files: 45
  Size: 12.4 KB

Note: Memory was excluded for privacy.
Use --include-memory to include memory files.
```

### Export Options

| Flag | Description |
|------|-------------|
| `-o, --output <dir>` | Output directory (default: current) |
| `-m, --include-memory` | Include MEMORY.md and daily logs |

### Examples

```bash
# Export to current directory
agent-hub export alice

# Export to specific directory
agent-hub export alice -o ~/shared-agents/

# Include memory files
agent-hub export alice --include-memory
```

### What Gets Exported

| Included by Default | Excluded by Default |
|---------------------|---------------------|
| agent.json | MEMORY.md |
| IDENTITY.md | memory/*.md |
| CLAUDE.md | sessions/*.tmp |
| plugins.json | .index/ (database) |
| mcp-servers.json | |
| skills/* (3 default) | |
| hooks/* | |
| agents/* (14 default) | |
| commands/* (24 default) | |
| rules/* (8 default) | |
| scripts/* | |

---

## Import an Agent

Install an agent from an archive:

```bash
agent-hub import alice.agent.tar.gz
```

**Output:**
```
Imported agent: alice
  Files: 45

The agent is ready to use:
  agent-hub hire alice
```

### Import Options

| Flag | Description |
|------|-------------|
| `-n, --name <name>` | Import with a different name |
| `-f, --overwrite` | Overwrite if agent already exists |

### Examples

```bash
# Import with original name
agent-hub import alice.agent.tar.gz

# Import with new name
agent-hub import alice.agent.tar.gz --name alice-v2

# Overwrite existing agent
agent-hub import alice.agent.tar.gz --overwrite
```

---

## Clone an Agent

Duplicate an existing agent locally:

```bash
agent-hub clone alice alice-experimental
```

**Output:**
```
Cloned agent: alice → alice-experimental

Note: Memory was not copied (fresh start).
Use --include-memory to copy memory from source.

The cloned agent is ready to use:
  agent-hub hire alice-experimental
```

### Clone Options

| Flag | Description |
|------|-------------|
| `-s, --specialty <desc>` | New specialty description |
| `-m, --include-memory` | Copy memory from source agent |

### Examples

```bash
# Basic clone
agent-hub clone alice alice-test

# Clone with new specialty
agent-hub clone alice alice-frontend -s "Frontend specialist"

# Clone with memory
agent-hub clone alice alice-backup --include-memory
```

### Use Cases

- **Experimentation** - Clone before making risky changes
- **Specialization** - Create variants for different roles
- **Backup** - Keep a copy before major updates
- **Templates** - Create base agents to clone for new projects

---

## Privacy Note

::: warning Memory Privacy
By default, **export** and **clone** exclude memory files. This protects
sensitive information that may be stored in your agent's memory.

Only use `--include-memory` when:
- Sharing with trusted parties
- Creating personal backups
- The memory contains no sensitive data
:::

## Sharing Workflow

### Share with a Teammate

```bash
# You: Export the agent
agent-hub export alice -o ~/Desktop/

# Send alice.agent.tar.gz to teammate

# Teammate: Import the agent
agent-hub import ~/Downloads/alice.agent.tar.gz --name alice
agent-hub hire alice
```

### Create a Template Agent

```bash
# Create a base agent with common config
agent-hub create base-fullstack -s "Full-stack template"

# Configure it with common skills, hooks, etc.
code ~/.agent-hub/agents/base-fullstack/

# Clone for each new project
agent-hub clone base-fullstack project-alpha -s "Project Alpha engineer"
agent-hub clone base-fullstack project-beta -s "Project Beta engineer"
```

### Team Standard Agent

```bash
# Team lead creates and configures the standard
agent-hub create team-standard -s "Team coding assistant"
# ... configure skills, rules, etc.

# Export and share
agent-hub export team-standard -o ./team-agents/

# Team members import
agent-hub import team-agents/team-standard.agent.tar.gz
agent-hub hire team-standard
```
