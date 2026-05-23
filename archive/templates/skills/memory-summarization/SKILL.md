---
name: memory-summarization
description: Save memories to session logs, daily logs, and MEMORY.md at compaction time
---

# Memory Summarization

Use this skill at PreCompact to save important context before compaction clears your working memory.

## Three-Tier Memory System

| Tier | File | Behavior | What to Write |
|------|------|----------|---------------|
| **Long-term** | `.claude/memory/MEMORY.md` | **Upsert** | Preferences, patterns, key decisions |
| **Daily** | `.claude/memory/logs/YYYY-MM-DD.md` | **Append-only** | Timestamped: what happened today, learnings |
| **Session** | `.claude/memory/sessions/YYYY-MM-DD-HHmmss-{id}-session.md` | **Append-only** | Current state, progress, decisions |

## Quick Decision Guide

Before saving, ask yourself:
- **MEMORY.md:** "Is this a permanent preference or pattern that applies across sessions?"
- **Daily log:** "What happened today that's worth remembering tomorrow?"
- **Session log:** "What would I need to know to continue this exact work?"

---

## MEMORY.md Guidelines (Upsert)

**File:** `.claude/memory/MEMORY.md`
**Behavior:** Update existing sections or add new ones. Remove outdated info.

Think of it like a human reviewing their journal and updating their mental model. This is your curated wisdom — the distilled essence, not raw logs.

**Question to ask:** "Will this matter next month?"

**DO add:**
- User preferences (coding style, tools, conventions)
- Project patterns (architecture decisions, naming conventions)
- Recurring solutions (fixes that apply broadly)
- Important context (team members, deployment process)
- Lessons learned (mistakes to avoid, insights gained)
- Key decisions with rationale

**DON'T add:**
- Session-specific state (use session logs)
- Temporary blockers (use daily logs)
- Anything that will change next week

**Format:**
```markdown
## Preferences
- User prefers X over Y
- Always use Z for this

## Technical Context
- Project uses A with B
- Deployment is via C

## Patterns & Solutions
- When X happens, do Y
- For Z problems, check A first

## Lessons Learned
- Mistake X led to Y — always check Z first
- Pattern A works better than B for this codebase
```

---

## Daily Log Format (Append-Only)

**File:** `.claude/memory/logs/YYYY-MM-DD.md`
**Behavior:** Append new entries at the end. Never overwrite previous entries.

**Format:**
```markdown
## HH:MM - Brief Title

What happened, what you learned, decisions made.

Key code or commands if relevant (use fenced code blocks).
```

**Examples of daily log entries:**
- Discovered a useful debugging technique
- Made an architectural decision with rationale
- Learned something about the codebase
- Resolved a tricky bug (document the solution)

---

## Session Log Template (Append-Only)

**File:** `.claude/memory/sessions/YYYY-MM-DD-HHmmss-{sessionId}-session.md`
- Filename timestamp = session start time (when first compaction creates the file)
- **Behavior:** First compaction creates file. Later compactions append new section below `---`.

**Format:**
```markdown
# Session: {Brief Description}
**Date:** YYYY-MM-DD
**Session ID:** {first 8 chars}
**Started:** HH:MM
**Last Updated:** HH:MM

---

## Current State

[1-2 sentences: What are you working on right now?]

### Completed
- [x] Task 1
- [x] Task 2

### In Progress
- [ ] Task 3

### Blockers Encountered
1. **Issue name** - What happened and how you solved it

### Key Decisions Made
- Decision 1: rationale
- Decision 2: rationale

### Code Locations Modified
- `path/to/file.ts` - What changed
- `path/to/other.ts` - What changed

### Notes for Next Session
- Important context to remember
- Open questions or blockers

### Context to Load
(list relevant file paths here)

---

## Session Log (optional - for longer sessions)

**HH:MM** - What you did
**HH:MM** - What you learned or discovered
```

---

## Session Log Examples

### Example 1: Feature Implementation

```markdown
# Session: Auth Feature Implementation
**Date:** 2026-01-20
**Session ID:** a1b2c3d4
**Started:** 14:30
**Last Updated:** 17:45

---

## Current State

Working on JWT authentication flow for the API. Main goal is replacing session-based auth with stateless tokens.

### Completed
- [x] Set up JWT signing with RS256
- [x] Created `/auth/login` endpoint
- [x] Added refresh token rotation
- [x] Fixed token expiry bug (was using seconds, needed milliseconds)

### In Progress
- [ ] Add rate limiting to auth endpoints
- [ ] Implement token blacklist for logout

### Blockers Encountered
1. **jsonwebtoken version mismatch** - v9.x changed the `verify()` signature, had to update error handling

### Key Decisions Made
- Using RS256 over HS256 for better security with distributed services
- Storing refresh tokens in Redis with 7-day TTL

### Code Locations Modified
- `src/middleware/auth.js` - JWT verification middleware
- `src/routes/auth.js` - Login/logout/refresh endpoints

### Notes for Next Session
- Need to add CSRF protection for cookie-based token storage
- Review rate limit values with team

### Context to Load
- src/middleware/auth.js
- src/routes/auth.js
```

### Example 2: Debugging Session

```markdown
# Session: Memory Leak Investigation
**Date:** 2026-01-17
**Session ID:** b2c3d4e5
**Started:** 09:00
**Last Updated:** 12:00

---

## Current State

Investigating memory leak in production. Heap growing unbounded over 24h period.

### Completed
- [x] Set up heap snapshots in staging
- [x] Identified leak source: event listeners not being cleaned up
- [x] Fixed leak in WebSocket handler
- [x] Verified fix with 4h soak test

### Root Cause
WebSocket onMessage handlers were being added on reconnect but not removed on disconnect.

### The Fix
Before (leaking): socket.on('connect', () => { socket.on('message', handleMessage) })
After (fixed): socket.on('disconnect', () => { socket.removeAllListeners('message') })

### Notes for Next Session
- Add memory monitoring alert at 1GB threshold
- Document this debugging pattern for team
```

---

## Compaction Checklist

At each compaction, quickly decide:

1. **MEMORY.md** - Update only if you discovered a durable fact/preference (upsert)
2. **Daily log** - Add entry if you learned something worth remembering tomorrow (append)
3. **Session log** - Always update if meaningful work done (append)

If nothing significant to save, that's fine - just acknowledge the compaction prompt and continue.
