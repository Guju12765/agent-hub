# Create Your First Agent

## Create an Agent

```bash
agent-hub create alice -s "Full-stack engineer"
```

**Output:**
```
Created agent: alice
  Specialty: Full-stack engineer
  Location: ~/.agent-hub/agents/alice/
```

## What Gets Created

Every new agent comes with a complete setup:

```
~/.agent-hub/agents/alice/
├── agent.json            # Metadata (name, specialty, version)
├── CLAUDE.md             # Session guidelines and personality
├── MEMORY.md             # Persistent memory
├── memory/               # Daily logs directory
├── .index/               # Vector database
├── plugins.json          # Plugin dependencies
├── mcp-servers.json      # MCP server configs
├── skills/               # 2 starter skills
│   ├── memory-summarization/
│   └── skill-creator/
├── hooks/                # Hook configurations
│   └── default.json
├── commands/             # Slash commands
│   └── extract-session.md
├── rules/                # Coding rules
│   ├── coding-style.md
│   └── performance.md
└── scripts/              # Hook scripts
    ├── extract-session.js
    └── lib/utils.js
```

## Built-in Features

### Skills (3)

| Skill | Description |
|-------|-------------|
| `memory-summarization` | Save session state and memories at PreCompact |
| `skill-creator` | Helper for creating new skills |
| `docs-map` | Generate Three-Layer Pyramid documentation structure |

### Rules (2)

| Rule | Purpose |
|------|---------|
| `coding-style.md` | Code formatting and style guidelines |
| `performance.md` | Performance considerations |

### Commands (1)

| Command | Description |
|---------|-------------|
| `/extract-session` | Extract full session transcript to memory |

### Hooks (2)

Automation that runs at key moments:

| Hook | Trigger | Purpose |
|------|---------|---------|
| Session start reminder | SessionStart | Remind about memory location |
| Pre-compact prompt | PreCompact | Prompt to save memories |

### Extending Your Agent

You can easily add more:
- **Custom skills** - Create `.md` files in `skills/<skill-name>/`
- **Custom rules** - Add `.md` files to `rules/`
- **Custom commands** - Add `.md` files to `commands/`
- **Subagents** - Add `.md` files to `agents/` (empty by default)

## Configure Your Agent

Edit the files in `~/.agent-hub/agents/alice/`:

```bash
# Edit session guidelines and personality
code ~/.agent-hub/agents/alice/CLAUDE.md

# Add MCP servers (filesystem, github, etc.)
code ~/.agent-hub/agents/alice/mcp-servers.json

# Customize rules
code ~/.agent-hub/agents/alice/rules/
```

## Key Files

### CLAUDE.md

Session guidelines, personality, and memory instructions:

```markdown
# CLAUDE.md - Your Workspace

## Core Truths
- Be genuinely helpful, not performatively helpful
- Have opinions
- Be resourceful before asking

## Memory
| Tier | File | Purpose |
|------|------|---------|
| Long-term | memory/MEMORY.md | Curated wisdom, preferences |
| Daily | memory/logs/YYYY-MM-DD.md | Daily learnings |
| Session | memory/sessions/YYYY-MM-DD-HHmmss-{id}.md | Current state |

**Recall:** Before answering, run memory_search...
**Save:** At PreCompact, use /memory-summarization skill
```

### MEMORY.md

Where persistent memories are stored:

```markdown
# Alice's Memory

## Preferences
- User prefers TypeScript over JavaScript
- Use 2-space indentation

## Technical Knowledge
- Project uses React 18 with Next.js
```

## Next Steps

Once configured, you're ready to [deploy to a project](/getting-started/hire-fire).
