# Memory System

## Overview

Agent Hub provides persistent memory across sessions using markdown files with vector-indexed semantic search.

## Three-Tier Memory Architecture

| Tier | Location | Purpose | Written By |
|------|----------|---------|------------|
| **Short-term** | `memory/sessions/*.md` | Per-session state, progress, decisions | LLM (at PreCompact) |
| **Mid-term** | `memory/logs/*.md` | Daily learnings, context | LLM (at PreCompact) |
| **Long-term** | `memory/MEMORY.md` | Consolidated wisdom, preferences | LLM (at PreCompact) |

## Storage Structure

```
.claude/memory/
├── MEMORY.md              # Long-term consolidated memory
├── logs/
│   ├── 2026-02-01.md      # Daily logs (mid-term)
│   ├── 2026-02-02.md
│   └── 2026-02-03.md
├── sessions/
│   ├── 2026-02-03-091542-a1b2c3d4.md  # Session logs (short-term)
│   └── 2026-02-03-143025-b2c3d4e5.md
└── .index/
    └── memory.db          # SQLite + vector embeddings
```

## Session Logs

Session logs are written by Claude at PreCompact using the `/memory-summarization` skill:

| Aspect | Value |
|--------|-------|
| **Location** | `.claude/memory/sessions/` |
| **Naming** | `YYYY-MM-DD-{sessionId}-session.md` |
| **Trigger** | PreCompact hook prompts Claude |
| **Indexed** | Yes, searchable via `memory_search` |

### Session Log Behavior

- **At PreCompact:** Claude uses `/memory-summarization` skill to write structured session state
- **Multiple compactions:** Each compaction updates the session file with current state
- **Content:** Claude-summarized progress, decisions, blockers, notes for next session

### Session Log Content

```markdown
# Session: 2026-02-03

**Date:** 2026-02-03
**Session ID:** a1b2c3d4
**Started:** 09:15
**Last Updated:** 14:45

---

## Current State

[Session context goes here]

### Completed
- [x] Implemented user authentication
- [x] Fixed login bug

### In Progress
- [ ] Adding OAuth support

### Notes for Next Session
- Need to test with Google OAuth

### Context to Load
```
src/auth/oauth.ts
src/auth/providers/google.ts
```

---
**[Compaction occurred at 11:30]** - Context was summarized

---
**[Compaction occurred at 14:45]** - Context was summarized
```

## Session Extraction (Backup)

For archival purposes, you can extract the raw session transcript to markdown:

### Manual (/extract-session)

Run `/extract-session` to generate a full transcript extraction from the current conversation. This is useful for:
- Archiving complete session history
- Debugging or reviewing what happened
- Backup when summarization wasn't done

### What Gets Extracted

| Included | Excluded |
|----------|----------|
| User messages | System reminders |
| Claude responses | Meta messages |
| File edits (Edit, Write) | Read/Glob/Grep calls |
| Git operations | Task agent dispatches |

### Output

`.claude/memory/sessions/YYYY-MM-DD-HHmmss-{sessionId}-session.md`

Re-running overwrites the file with updated content.

## Daily Logs (Mid-Term)

Daily logs capture learnings and context written by the LLM:

```markdown
# 2026-02-03

## 10:30
Working on user authentication feature. User wants OAuth with Google.

## 14:15
Finished OAuth implementation. User confirmed it works.
Used next-auth library as requested.

## Learnings
- NextAuth requires specific callback URL format
- Google OAuth needs verified domain for production
```

## MEMORY.md (Long-Term)

Consolidated memory with preferences, decisions, and learnings:

```markdown
# Alice's Memory

## Preferences
- User prefers TypeScript over JavaScript
- Use 2-space indentation
- Always add explicit return types

## Technical Knowledge
- Project uses React 18 with Next.js 14
- Database is PostgreSQL with Prisma ORM

## Decisions Made
- 2026-01-15: Chose Tailwind CSS over styled-components
- 2026-01-20: Decided to use server components by default

## Learnings
- React Server Components can't use hooks
- Prisma requires running `prisma generate` after schema changes
```

## Memory Tools (via MCP)

### memory_search

Semantic search across all memory files (MEMORY.md, logs, sessions):

```
Search: "React preferences"

Results:
  MEMORY.md:15 - User prefers functional components
  logs/2026-02-03.md:12 - Discussed React 18 features
  sessions/2026-02-03-091542-a1b2c3d4.md:8 - Working on React component
```

### memory_get

Retrieve specific file or lines:

```
Get: MEMORY.md lines 15-20

Result:
  15: - User prefers functional components
  16: - Always use TypeScript with React
  17: - Prefer named exports over default
```

### memory_status

Check memory statistics:

```
Status:
  Total entries: 47
  MEMORY.md: 23 entries
  Daily logs: 18 entries
  Session logs: 6 entries
  Index: up to date
```

## Automatic Indexing

All memory files are automatically indexed for search:

1. **File watcher** monitors `.claude/memory/` directory
2. **Sync process** chunks content and generates embeddings
3. **Vector index** enables semantic similarity search
4. **FTS index** enables keyword search

Changes to memory files are automatically re-indexed within ~1.5 seconds.

## Memory Guidelines

The default CLAUDE.md includes memory guidelines:

**Recall:** Before answering about prior work, decisions, preferences:
1. Run `memory_search` on relevant terms
2. Use `memory_get` to retrieve specific lines
3. If low confidence after search, acknowledge you checked

**Save:**
- Durable facts/preferences → MEMORY.md
- Session notes → memory/logs/YYYY-MM-DD.md
- Session state is auto-saved at compaction
