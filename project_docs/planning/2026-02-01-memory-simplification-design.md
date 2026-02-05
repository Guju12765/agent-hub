# Memory System Simplification Design

## Overview

Simplify the agent-hub memory system by removing the dual master/project mechanism and unnecessary complexity. The goal is to match OpenClaw's cleaner architecture while keeping only essential features.

## Decisions Made

| Decision | Choice |
|----------|--------|
| Memory location | Project-level only (`./.claude/memory/`) |
| Features | Core only: store, search, chunking, embedding cache |
| Status reporting | Remove status.ts, inline helpers if needed |
| Progress tracking | Remove progress.ts, use inline callbacks |
| Redundancy | Consolidate all (merge cache-pruning, export hashText) |
| Sync mechanism | Single `syncMemory(workspaceDir)` function |

## File Changes

### Files to DELETE

| File | Reason |
|------|--------|
| `src/memory/progress.ts` | OpenClaw uses inline callbacks |
| `src/memory/status.ts` | OpenClaw uses simple inline helpers |
| `src/memory/cache-pruning.ts` | Merge into cache.ts |
| `src/agent/copy.ts` | No master→project copy needed |

### Files to MODIFY

| File | Changes |
|------|---------|
| `src/memory/manager.ts` | Remove progress/status imports, simplify or remove getSystemStatus() |
| `src/memory/cache.ts` | Merge pruning functions from cache-pruning.ts |
| `src/memory/chunking.ts` | Export `hashText()` for use in sync.ts |
| `src/memory/index.ts` | Remove exports for deleted modules |
| `src/agent/sync.ts` | Remove `syncAgentMemory()`, rename `syncProjectMemory()` to `syncMemory(workspaceDir)` |
| `src/agent/manager.ts` | Remove dual-level memory logic |
| `src/agent/paths.ts` | Remove master memory path helpers, rename project helpers |

### Files UNCHANGED

- `src/memory/search.ts`
- `src/memory/schema.ts`
- `src/memory/hybrid.ts`

## Simplified File Structure

**Before (10 files in memory/, ~3,000 lines):**
```
src/memory/
├── index.ts
├── manager.ts        (900 lines)
├── search.ts         (430 lines)
├── schema.ts         (170 lines)
├── cache.ts          (320 lines)
├── cache-pruning.ts  (214 lines)
├── chunking.ts       (206 lines)
├── hybrid.ts         (138 lines)
├── progress.ts       (160 lines)
└── status.ts         (418 lines)
```

**After (6 files in memory/, ~1,800 lines estimated):**
```
src/memory/
├── index.ts
├── manager.ts        (simplified)
├── search.ts         (unchanged)
├── schema.ts         (unchanged)
├── cache.ts          (merged with pruning)
├── chunking.ts       (export hashText)
└── hybrid.ts         (unchanged)
```

## Sync Function Simplification

**Before (dual mechanism):**
```typescript
export async function syncAgentMemory(agentName, db, config, provider)
export async function syncProjectMemory(projectDir, db, config, provider)
```

**After (single function, OpenClaw-style):**
```typescript
export async function syncMemory(params: {
  workspaceDir: string;
  db: DatabaseSync;
  provider: EmbeddingProvider;
  extraPaths?: string[];
  force?: boolean;
}): Promise<void>
```

## Cache Module Consolidation

Merge `cache-pruning.ts` into `cache.ts`:

```typescript
export class EmbeddingCache {
  // Existing methods
  get(textHash: string): number[] | null
  set(textHash: string, embedding: number[]): void
  getStats(): CacheStats

  // Pruning methods (moved from cache-pruning.ts)
  pruneByAge(maxAgeMs: number): number
  pruneBySize(maxEntries: number): number
  pruneIfNeeded(): void
}
```

## Path Helpers Cleanup

**Remove from `src/agent/paths.ts`:**
- `getAgentMemoryDir()`
- `getAgentMemoryDbPath()`
- Any master-level path helpers

**Rename:**
- `getProjectMemoryDir()` → `getMemoryDir()`
- `getProjectMemoryDbPath()` → `getMemoryDbPath()`

## Architecture After Simplification

```
Project uses agent
       ↓
./.claude/memory/          ← Single memory location
├── MEMORY.md              ← Agent's memory file
├── logs/*.md              ← Daily logs
└── .index/memory.db       ← SQLite with embeddings
       ↓
syncMemory(workspaceDir)   ← One sync function
       ↓
MemoryManager              ← Store, search, recall
```

## What's Removed

- Master-level memory (`~/.agent-hub/agents/<name>/`)
- Copy from master to project
- Dual sync functions
- StatusBuilder pattern
- Separate progress module
- ~1,200 lines of code (~40% reduction)

## What's Kept

- Core memory functionality (store, search, chunking, cache)
- Hybrid search (vector + keyword)
- Schema setup
- Single directory-agnostic sync function

## Implementation Notes

- Follow OpenClaw patterns: inline types, simple callbacks
- No new files (types.ts idea dropped)
- YAGNI: only keep what's actively used
