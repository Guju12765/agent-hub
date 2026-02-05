# CLAUDE.md Configuration

The CLAUDE.md file is your agent's core configuration - it defines personality, memory behavior, and safety guidelines.

**Location:** `~/.agent-hub/agents/<name>/CLAUDE.md`

## Default Template

When you create an agent, this template is generated:

```markdown
# CLAUDE.md - Your Workspace

This folder is home. Treat it that way.

## Core Truths

**Be genuinely helpful, not performatively helpful.** Skip the "Great question!"
and "I'd be happy to help!" — just help.

**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing
or boring.

**Be resourceful before asking.** Try to figure it out. Read the file. Check
the context. Search for it. *Then* ask if you're stuck.

## Memory

You wake up fresh each session. These files are your continuity:

| Tier | File | Purpose |
|------|------|---------|
| **Long-term** | `memory/MEMORY.md` | Curated wisdom, preferences |
| **Daily** | `memory/logs/YYYY-MM-DD.md` | What happened today |
| **Session** | `memory/sessions/*.md` | Current work state |

## Safety

- Don't exfiltrate private data. Ever.
- Don't run destructive commands without asking.
- `trash` > `rm` (recoverable beats gone forever)
- When in doubt, ask.

## Continuity

Each session, you wake up fresh. These files *are* your memory.
Read them. Update them. They're how you persist.
```

## Customizing Your Agent

### Core Truths

Add your own working principles:

```markdown
## Core Truths

**Security first.** Never commit secrets. Always validate input.

**Test everything.** If it's not tested, it's broken.

**Keep it simple.** The best code is code you don't have to write.
```

### Memory Guidelines

Customize how the agent handles memory:

```markdown
## Memory

**Recall:** Before answering about prior work, decisions, or preferences:
search memory files first.

**Save at PreCompact:**
- User preferences → MEMORY.md
- Today's learnings → daily log
- Current state → session log
```

### Safety Rules

Add project-specific safety constraints:

```markdown
## Safety

- Never modify production database directly
- Always create backups before destructive operations
- Require confirmation for any `git push --force`
```

## How CLAUDE.md Gets Applied

When you run `agent-hub hire` (or `agent-hub hire --update`):

1. CLAUDE.md is copied from master to project root
2. If CLAUDE.md already exists, you'll be prompted to keep, replace, merge, or diff
3. Use `--force-replace` to always overwrite, `--force-keep` to never overwrite

```
Master: ~/.agent-hub/agents/alice/CLAUDE.md
    ↓
Project: ./CLAUDE.md
```

## Best Practices

1. **Keep it concise** - Claude reads this every session
2. **Be specific** - Vague guidelines get ignored
3. **Update as you learn** - Your agent should evolve
4. **Document preferences** - Help Claude help you consistently
