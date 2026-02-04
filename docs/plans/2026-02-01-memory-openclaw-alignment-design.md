# Memory System OpenClaw Alignment Design

## Overview

Align agent-hub's memory system with real OpenClaw architecture by:
1. Removing MCP write tools (model uses filesystem tools directly)
2. Consolidating all memory code into `src/memory/`
3. Keeping read-only MCP tools for search

## Background

Agent-hub was copied from `memory-mcp-server` (wrong folder) instead of real OpenClaw.

| Aspect | Agent-Hub (Current) | Real OpenClaw |
|--------|---------------------|---------------|
| Writing | `memory_store` MCP tool | Model uses filesystem tools |
| Source of truth | SQLite database | Markdown files |
| Decision logic | Code categorizes | Model decides |

## New Structure

### `src/memory/` (Consolidated)

```
src/memory/
├── index.ts              # Exports
├── manager.ts            # Main manager
├── search.ts             # Search logic
├── schema.ts             # SQLite schema
├── cache.ts              # Embedding cache
├── chunking.ts           # Text chunking + hashText
├── hybrid.ts             # Hybrid search merging
├── internal.ts           # File listing, helpers
├── sync.ts               # Sync markdown → SQLite
├── watcher.ts            # File watcher
├── embeddings/           # Subfolder for embeddings
│   ├── index.ts
│   ├── provider.ts
│   ├── openai.ts
│   ├── gemini.ts
│   ├── local.ts
│   └── batch.ts
└── status.ts             # Simple status formatting
```

## Files to Delete

| File | Reason |
|------|--------|
| `src/server/tools/store.ts` | Model uses filesystem tools |
| `src/server/tools/flush.ts` | Model uses filesystem tools |
| `src/capture/categories.ts` | No auto-categorization needed |
| `src/agent/markdown.ts` | storeAgentMemory() etc. not needed |

## Files to Move

| From | To |
|------|-----|
| `src/agent/sync.ts` | `src/memory/sync.ts` |
| `src/agent/watcher.ts` | `src/memory/watcher.ts` |
| `src/agent/file-watcher.ts` | Merge into `src/memory/watcher.ts` |
| `src/embeddings/*` | `src/memory/embeddings/*` |

## Files to Keep (Simplified)

| File | Purpose |
|------|---------|
| `src/agent/paths.ts` | Path helpers for memory directory |
| `src/agent/index.ts` | Minimal exports |

## MCP Server Changes

**Keep tools:**
- `memory_search` - Search memories
- `memory_get` - Read memory file
- `memory_status` - Get status

**Remove tools:**
- `memory_store` - Deleted
- `memory_flush` - Deleted

**Remove from server:**
- Import of `storeAgentMemory`, `storeProjectMemory`
- `case "memory_store":` handler
- `case "memory_flush":` handler

## Architecture Flow

```
Model writes via filesystem tools
       ↓
memory/YYYY-MM-DD.md  or  MEMORY.md
       ↓
File watcher detects change (chokidar)
       ↓
Debounce (1.5s default)
       ↓
syncMemory() reads markdown files
       ↓
Chunks text, generates embeddings
       ↓
Stores in SQLite (for search)
       ↓
memory_search tool can find it
```

## Watcher Configuration

Watches:
- `MEMORY.md`
- `memory.md` (alternate)
- `memory/*.md` (daily logs)
- Extra paths from config

Uses chokidar with:
- `ignoreInitial: true`
- `awaitWriteFinish` with configurable debounce
- Events: add, change, unlink

## Memory File Locations

| Content Type | Location | Who Decides |
|--------------|----------|-------------|
| Durable facts, preferences, decisions | `MEMORY.md` | Model |
| Daily notes, running context | `memory/YYYY-MM-DD.md` | Model |

The model decides where to write based on prompts/guidance, not code enforcement.

## Estimated Impact

- ~500 lines deleted (store, flush, categories, markdown writers)
- ~800 lines moved (embeddings, sync, watcher)
- ~50 lines updated (imports, server registration)

## Implementation Steps

1. Create `src/memory/embeddings/` subfolder
2. Move embedding files from `src/embeddings/` to `src/memory/embeddings/`
3. Move `src/agent/sync.ts` to `src/memory/sync.ts`
4. Merge `src/agent/watcher.ts` and `src/agent/file-watcher.ts` into `src/memory/watcher.ts`
5. Create `src/memory/internal.ts` with file listing helpers
6. Delete `src/server/tools/store.ts`
7. Delete `src/server/tools/flush.ts`
8. Delete `src/capture/` folder
9. Delete `src/agent/markdown.ts`
10. Update `src/server/index.ts` to remove store/flush
11. Update all imports throughout codebase
12. Update `src/memory/index.ts` exports
13. Verify TypeScript compiles
14. Test memory search still works
