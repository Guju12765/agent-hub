# Continuous Learning

## Overview

Agent Hub supports continuous learning through its persistent memory system. Your agent accumulates knowledge across sessions by writing to memory files that persist between conversations.

## How It Works

```
┌─────────────┐    session     ┌─────────────┐     saves     ┌─────────────┐
│  Your Work  │ ───────────►   │   Claude    │ ───────────►  │   Memory    │
│  Sessions   │                │   Agent     │               │   Files     │
└─────────────┘                └─────────────┘               └─────────────┘
       │                             │                             │
       │                             │                             │
       └─── PreCompact hook ─────────┘                             │
                                                                   ▼
                                                          Better context
                                                          in future sessions
```

## Components

### Memory Files

Your agent's knowledge is stored in markdown files:

- **MEMORY.md** - Long-term durable facts, preferences, and decisions
- **memory/YYYY-MM-DD.md** - Daily logs with timestamped learnings
- **sessions/\*-session.tmp** - Session state for context continuity

### Memory Summarization Skill

The built-in `/memory-summarization` skill guides your agent to save:

- Session logs (current state, progress, decisions)
- Daily logs (timestamped learnings)
- MEMORY.md updates (durable facts and preferences)

### PreCompact Hook

Before context compaction, the default hook prompts:

```
[Memory] Pre-compaction. Use /memory-summarization to save session state,
daily learnings, and durable memories.
```

This ensures knowledge is captured before the context window resets.

## Using the Memory System

### Saving Memories

Use the `/memory-summarization` skill when prompted at PreCompact, or anytime you want to persist knowledge:

```
/memory-summarization
```

### Recalling Memories

Your agent automatically reads memory files at session start (configured in CLAUDE.md):

1. Recent session files
2. Today's and yesterday's daily logs
3. MEMORY.md for long-term memory

### Explicit Remember

Tell your agent to remember something:

```
Remember that I prefer tabs over spaces
```

The agent will write this to MEMORY.md immediately.

## File Locations

```
.claude/
├── memory/
│   ├── MEMORY.md         # Long-term memory
│   ├── 2026-02-01.md     # Daily logs
│   └── 2026-02-02.md
├── sessions/
│   └── 2026-02-01-abc-session.tmp
└── skills/
    └── memory-summarization/
        └── SKILL.md      # Memory saving guidance
```

## Best Practices

1. **Use PreCompact prompts** - Don't dismiss the memory reminder
2. **Be explicit** - Say "remember this" for important preferences
3. **Review periodically** - Check MEMORY.md for outdated info
4. **Daily summaries** - Let daily logs capture session learnings

## Privacy

All memory is stored locally in your project's `.claude/` directory. Nothing leaves your machine unless you explicitly share it.
