# Memory Summarization Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a skill that guides Claude to write structured memory summaries (session logs, daily logs, MEMORY.md) at PreCompact

**Architecture:** Skill with templates and examples from everything-claude-code. Invoked via PreCompact hook prompt. Replaces script-based session logging with LLM-driven summarization.

**Tech Stack:** Markdown skill file, hook configuration

---

## Task 1: Read Templates and Examples from everything-claude-code

**Files to read:**
- `D:/Codebase/everything-claude-code/scripts/hooks/session-end.js` - template structure
- `D:/Codebase/everything-claude-code/examples/sessions/*.tmp` - example session logs

**Purpose:** Extract the template format and examples to include in the skill.

**No files to create** - just research.

---

## Task 2: Create memory-summarization Skill

**Files:**
- Create: `src/templates/skills/memory-summarization/SKILL.md`

**Content structure:**

```markdown
---
name: memory-summarization
description: Save memories to session logs, daily logs, and MEMORY.md at compaction time
---

# Memory Summarization

Use this skill at PreCompact to save important context before compaction.

## Three-Tier Memory System

| Tier | File | When to Write | What to Write |
|------|------|---------------|---------------|
| **Session** | `memory/sessions/{date}-{id}-session.md` | Every compaction | Current state, progress, decisions |
| **Daily** | `memory/logs/{date}.md` | Significant events | Learnings, context, timestamps |
| **Long-term** | `memory/MEMORY.md` | Durable facts | Preferences, patterns, key decisions |

## Session Log Template

[Include template from session-end.js]

## Session Log Examples

[Include 1-2 examples from everything-claude-code/examples/sessions/]

## Daily Log Format

[Simple timestamped entries]

## MEMORY.md Guidelines

[What belongs in long-term memory]

## Quick Reference

At each compaction:
1. Update session log (append current state)
2. Add to daily log if significant event
3. Update MEMORY.md if durable fact learned
```

---

## Task 3: Update PreCompact Hook

**Files:**
- Modify: `src/templates/hooks/default.json`

**Changes:**
- Update PreCompact echo to mention the skill
- Remove session file manipulation from pre-compact.js (or remove script entirely)

**New PreCompact hook:**
```json
{
  "matcher": "manual|auto",
  "hooks": [{
    "type": "command",
    "command": "echo \"[Memory] Pre-compaction. Use /memory-summarization to save session state, daily learnings, and durable memories. If nothing to save, NO REPLY needed.\""
  }],
  "description": "Prompt Claude to save memories before compaction"
}
```

---

## Task 4: Update SessionEnd Hook - Remove extract-session

**Files:**
- Modify: `src/templates/hooks/default.json`

**Changes:**
- Remove extract-session.cjs from SessionEnd hooks
- Keep only session-end.js OR remove it too (skill handles session logs now)

**Decision:** Remove session-end.js - the skill handles session log creation.

---

## Task 5: Rename extract-session.cjs to .js for Manual Command

**Files:**
- Rename: `src/templates/scripts/hooks/extract-session.cjs` → `src/templates/scripts/extract-session.js`
- Modify: `src/templates/commands/extract-session.md` - update path

**Changes:**
- Move script out of hooks folder (it's not a hook anymore)
- Update command to reference new location
- Script runs in target project context where .js works fine

---

## Task 6: Clean Up Unused Scripts

**Files:**
- Remove: `src/templates/scripts/hooks/session-end.js` (skill replaces it)
- Remove: `src/templates/scripts/hooks/pre-compact.js` (just echo now)

---

## Task 7: Update templates.ts for Skills Directory

**Files:**
- Modify: `src/agent/templates.ts`

**Changes:**
- Ensure skills directory is copied on agent create
- Add `copySkillsFiles()` function if not exists

---

## Task 8: Update Documentation

**Files:**
- Modify: `docs/concepts/memory.md`
- Modify: `docs/configuration/hooks.md`

**Changes:**
- Document the memory-summarization skill
- Update hook documentation
- Explain LLM-driven vs script-based approach

---

## Summary

| Task | Files | Purpose |
|------|-------|---------|
| 1 | (research) | Read templates/examples |
| 2 | `skills/memory-summarization/SKILL.md` | Create the skill |
| 3 | `hooks/default.json` | Update PreCompact prompt |
| 4 | `hooks/default.json` | Remove extract-session from SessionEnd |
| 5 | `scripts/extract-session.js` | Rename for manual command |
| 6 | Remove `session-end.js`, `pre-compact.js` | Clean up |
| 7 | `templates.ts` | Copy skills on create |
| 8 | `docs/*.md` | Update documentation |

**Result:** Claude-driven memory summarization at PreCompact, with manual extract-session as backup archive tool.
