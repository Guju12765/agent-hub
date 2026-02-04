# Continuous Learning v2 - Archived

**Archived on:** 2026-02-04
**Reason:** System complexity vs. adoption trade-off

## What it was

Automatic instinct learning and clustering system with:
- Observer daemon that monitored tool usage and sessions
- Session observation hooks (PreToolUse, PostToolUse)
- Instinct clustering and evolution capabilities
- Export/import system for sharing learned patterns

## Why archived

- Removed from template defaults to simplify base agent setup
- High complexity for questionable value-add in most use cases
- Maintenance overhead vs. actual usage was unfavorable
- Alternative approach (manual memory with extract-session) proved more practical

## Migration

Existing agents with this skill can continue using it. New agents won't include it by default.

If you want to add this skill to an existing agent, manually copy the archived files to your agent's directory.

## Components

- **Skill:** `skill/` - Main skill implementation with observer daemon
- **Commands:** `commands/` - evolve, instinct-export, instinct-import, instinct-status
- **Hooks:** SessionStart (observer start), PreToolUse/PostToolUse (observation)
