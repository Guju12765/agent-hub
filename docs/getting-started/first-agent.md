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
├── IDENTITY.md           # Personality, tenets, principles
├── MEMORY.md             # Persistent memory
├── CLAUDE.md             # Session guidelines
├── plugins.json          # Plugin dependencies
├── mcp-servers.json      # MCP server configs
├── skills/               # 3 built-in skills
│   ├── coding-standards/
│   ├── python-patterns/
│   └── continuous-learning-v2/
├── hooks/                # 4 automation hooks
│   └── default.json
├── agents/               # 14 subagent definitions
│   ├── architect.md
│   ├── code-reviewer.md
│   └── ...
├── commands/             # 24 custom commands
│   ├── plan.md
│   ├── code-review.md
│   └── ...
├── rules/                # 8 coding rules
│   ├── security.md
│   ├── testing.md
│   └── ...
└── scripts/              # Hook scripts
    ├── hooks/
    └── lib/
```

## Built-in Features

### Skills (3)

| Skill | Description |
|-------|-------------|
| `coding-standards` | Best practices for code quality |
| `python-patterns` | Python-specific patterns and idioms |
| `continuous-learning-v2` | Auto-learning from your coding patterns |

### Rules (8)

| Rule | Purpose |
|------|---------|
| `security.md` | Security best practices |
| `testing.md` | Testing guidelines |
| `performance.md` | Performance considerations |
| `git-workflow.md` | Git commit and branch rules |
| `coding-style.md` | Code formatting and style |
| `patterns.md` | Design patterns |
| `hooks.md` | Hook development rules |
| `agents.md` | Subagent guidelines |

### Subagents (14)

Ready-to-use specialist agents:

- **Code Review**: `code-reviewer.md`, `security-reviewer.md`, `go-reviewer.md`, `python-reviewer.md`, `database-reviewer.md`
- **Build/Test**: `build-error-resolver.md`, `go-build-resolver.md`, `e2e-runner.md`, `tdd-guide.md`
- **Planning**: `architect.md`, `planner.md`
- **Maintenance**: `doc-updater.md`, `refactor-cleaner.md`

### Commands (24)

Common workflows as slash commands:

| Command | Description |
|---------|-------------|
| `/plan` | Create implementation plans |
| `/code-review` | Review code changes |
| `/tdd` | Test-driven development workflow |
| `/verify` | Verify changes before commit |
| `/build-fix` | Fix build errors |
| `/checkpoint` | Save progress checkpoint |
| `/evolve` | Evolve instincts from observations |

[See full command list →](/commands/)

### Hooks (4)

Automation that runs at key moments:

| Hook | Trigger | Purpose |
|------|---------|---------|
| Observer auto-start | SessionStart | Start the learning daemon |
| Session logger | SessionEnd | Save session summary |
| Pre-compact | PreCompact | Capture context before compaction |
| Suggest compact | Notification | Suggest when to compact |

## Configure Your Agent

Edit the files in `~/.agent-hub/agents/alice/`:

```bash
# Edit identity and personality
code ~/.agent-hub/agents/alice/IDENTITY.md

# Add MCP servers (filesystem, github, etc.)
code ~/.agent-hub/agents/alice/mcp-servers.json

# Customize rules
code ~/.agent-hub/agents/alice/rules/
```

## Key Files

### IDENTITY.md

Defines your agent's personality and principles:

```markdown
# Alice

## Identity
I am Alice, a Full-stack engineer...

## Tenets
1. Correctness over cleverness
2. Ask before making significant changes

## Memory
**Recall:** Before answering, run memory_search first...
**Save:** Durable facts → MEMORY.md, daily notes → memory/*.md
```

### CLAUDE.md

Session guidelines for memory continuity:

```markdown
## Every Session
Before doing anything else:
1. Read `sessions/YYYY-MM-DD-xxx-xxx-session.tmp` (recent 2-3)
2. Read `memory/YYYY-MM-DD.md` (today + yesterday)
3. Read `MEMORY.md` for long term memory
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
