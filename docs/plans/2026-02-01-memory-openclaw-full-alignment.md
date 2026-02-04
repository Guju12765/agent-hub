# Memory System Full OpenClaw Alignment

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fully align agent-hub's memory system with OpenClaw's implementation, including design decisions.

**Architecture:** Remove the `memories` table abstraction and switch to OpenClaw's file-path-centric design. Chunks reference file paths directly, not memory IDs. Remove category/importance fields.

**Tech Stack:** better-sqlite3, sqlite-vec, FTS5

---

## Summary of Changes

### Schema Changes
1. Rename `embedding_cache.dimensions` → `dims`
2. Make `meta.value` NOT NULL
3. Add memory index metadata tracking (`memory_index_meta_v1`)
4. Update FTS5 to match OpenClaw (more indexed columns, no triggers)
5. Make `chunks.embedding` and `chunks.model` NOT NULL
6. Change `chunks.memory_id` → `chunks.path` (file-centric)
7. Remove `memories` table entirely
8. Remove category/importance from all code

### Code Changes
1. Remove Memory type's category/importance fields
2. Update all search/store/recall functions
3. Remove foreign key constraints
4. Switch FTS from trigger-based to direct insert

---

## Task 1: Update embedding_cache.dimensions → dims

**Files:**
- Modify: `src/memory/schema.ts`
- Modify: `src/memory/cache.ts`

**Step 1: Update schema definition**

In `schema.ts`, change EMBEDDING_CACHE_TABLE:
```typescript
const EMBEDDING_CACHE_TABLE = `
  CREATE TABLE IF NOT EXISTS embedding_cache (
    provider TEXT NOT NULL DEFAULT 'openai',
    model TEXT NOT NULL,
    provider_key TEXT NOT NULL DEFAULT '',
    hash TEXT NOT NULL,
    embedding TEXT NOT NULL,
    dims INTEGER,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (provider, model, provider_key, hash)
  )
`;
```

**Step 2: Add migration for version 6**

Add to migrateSchema():
```typescript
if (currentVersion < 6) {
  try {
    db.exec(`ALTER TABLE embedding_cache RENAME COLUMN dimensions TO dims`);
  } catch {
    // Column may already have new name
  }
}
```

Update SCHEMA_VERSION to 6.

**Step 3: Update cache.ts INSERT statements**

Change `dimensions` to `dims` in all SQL statements.

**Step 4: Commit**
```bash
git add src/memory/schema.ts src/memory/cache.ts
git commit -m "refactor: rename embedding_cache.dimensions to dims for OpenClaw parity"
```

---

## Task 2: Make meta.value NOT NULL

**Files:**
- Modify: `src/memory/schema.ts`

**Step 1: Update META_TABLE definition**

```typescript
const META_TABLE = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`;
```

**Step 2: Add migration for version 7**

Note: SQLite doesn't support ALTER COLUMN for NOT NULL. For existing databases, we need to handle this gracefully - the constraint only applies to new inserts.

Update SCHEMA_VERSION to 7 (or combine with Task 1 as version 6).

**Step 3: Commit**
```bash
git add src/memory/schema.ts
git commit -m "refactor: make meta.value NOT NULL for OpenClaw parity"
```

---

## Task 3: Add memory index metadata tracking

**Files:**
- Modify: `src/memory/schema.ts`
- Modify: `src/memory/manager.ts`

**Step 1: Add META_KEY constant**

In schema.ts or manager.ts:
```typescript
export const META_KEY = "memory_index_meta_v1";

export interface MemoryIndexMeta {
  model: string;
  provider: string;
  providerKey?: string;
  chunkTokens: number;
  chunkOverlap: number;
  vectorDims?: number;
}
```

**Step 2: Add save/load functions**

```typescript
export function saveIndexMeta(db: Database.Database, meta: MemoryIndexMeta): void {
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)")
    .run(META_KEY, JSON.stringify(meta));
}

export function loadIndexMeta(db: Database.Database): MemoryIndexMeta | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(META_KEY) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}
```

**Step 3: Use in manager initialization**

Save metadata when index is created/rebuilt.

**Step 4: Commit**
```bash
git add src/memory/schema.ts src/memory/manager.ts
git commit -m "feat: add memory index metadata tracking (META_KEY)"
```

---

## Task 4: Update FTS5 schema to match OpenClaw

**Files:**
- Modify: `src/memory/schema.ts`
- Modify: `src/memory/search.ts`
- Modify: `src/memory/manager.ts`
- Modify: `src/memory/sync.ts`

**Step 1: Update FTS5 table definition**

Remove trigger-based sync, use OpenClaw's direct approach:
```typescript
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    text,
    id UNINDEXED,
    path UNINDEXED,
    source UNINDEXED,
    model UNINDEXED,
    start_line UNINDEXED,
    end_line UNINDEXED
  )
`);
```

**Step 2: Remove FTS triggers**

Delete the three trigger creation statements.

**Step 3: Add direct FTS insert after chunk insert**

Wherever chunks are inserted, also insert into chunks_fts:
```typescript
db.prepare(`
  INSERT INTO chunks_fts (text, id, path, source, model, start_line, end_line)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(text, id, path, source, model, startLine, endLine);
```

**Step 4: Update FTS queries in search.ts**

Change `memory_id` references to `path`.

**Step 5: Commit**
```bash
git add src/memory/schema.ts src/memory/search.ts src/memory/manager.ts src/memory/sync.ts
git commit -m "refactor: update FTS5 schema to match OpenClaw (direct insert, more columns)"
```

---

## Task 5: Make chunks.embedding and chunks.model NOT NULL

**Files:**
- Modify: `src/memory/schema.ts`
- Modify: `src/memory/manager.ts`

**Step 1: Update CHUNKS_TABLE definition**

```typescript
const CHUNKS_TABLE = `
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'memory',
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    hash TEXT NOT NULL,
    model TEXT NOT NULL,
    text TEXT NOT NULL,
    embedding TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`;
```

Note: This also changes `memory_id` to `path` and reorders columns to match OpenClaw.

**Step 2: Update all INSERT statements**

Ensure embedding and model are always provided (no nulls).

**Step 3: Commit**
```bash
git add src/memory/schema.ts src/memory/manager.ts
git commit -m "refactor: make chunks.embedding/model NOT NULL, rename memory_id to path"
```

---

## Task 6: Remove memories table

**Files:**
- Modify: `src/memory/schema.ts`
- Modify: `src/memory/manager.ts`
- Modify: `src/memory/search.ts`
- Modify: `src/memory/sync.ts`
- Modify: `src/core/config/types.ts`
- Modify: `src/server/tools/search.ts`
- Modify: `src/server/tools/status.ts`

**Step 1: Remove MEMORIES_TABLE from schema.ts**

Delete the MEMORIES_TABLE constant and db.exec(MEMORIES_TABLE) call.

**Step 2: Remove category/importance from Memory type**

In `src/core/config/types.ts`:
```typescript
export interface Memory {
  id: string;
  text: string;
  source: string;
  createdAt: number;
  updatedAt: number;
}
```

Remove category and importance fields.

**Step 3: Update manager.ts**

- Remove all category/importance handling
- Remove StoreOptions.category and StoreOptions.importance
- Remove RecallOptions.minImportance
- Remove MemoryRow.category and MemoryRow.importance
- Update store() to work with chunks directly
- Update recall() to not use importance filtering

**Step 4: Update search.ts**

- Remove category from SearchResult
- Update formatResults to not query memories table

**Step 5: Update sync.ts**

- Remove memories table inserts
- Work directly with chunks

**Step 6: Update server tools**

- Remove category/importance from search tool results
- Update status tool if it references memories

**Step 7: Remove indexes for category**

In schema.ts INDEXES array, remove:
```typescript
"CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)",
```

**Step 8: Commit**
```bash
git add src/memory/schema.ts src/memory/manager.ts src/memory/search.ts \
        src/memory/sync.ts src/core/config/types.ts src/server/tools/search.ts \
        src/server/tools/status.ts
git commit -m "refactor: remove memories table, switch to path-centric design"
```

---

## Task 7: Remove foreign key constraint

**Files:**
- Modify: `src/memory/schema.ts`

**Step 1: Update CHUNKS_TABLE**

Already done in Task 5 - the new schema doesn't have FOREIGN KEY.

**Step 2: Verify no foreign key references remain**

Search for FOREIGN KEY and ensure none exist.

**Step 3: Commit** (if separate changes needed)

---

## Task 8: Update all code references

**Files:**
- Modify: `src/agent/sync-sessions.ts`
- Modify: `src/agent/types.ts`
- Modify: `src/targets/claude.ts`

**Step 1: Search for remaining category/importance references**

```bash
grep -r "category\|importance" src/
```

**Step 2: Update each file**

Remove or update all remaining references to category and importance.

**Step 3: Commit**
```bash
git add src/agent/sync-sessions.ts src/agent/types.ts src/targets/claude.ts
git commit -m "refactor: remove remaining category/importance references"
```

---

## Task 9: Update types and exports

**Files:**
- Modify: `src/memory/index.ts`
- Modify: `src/core/config/types.ts`

**Step 1: Update Memory interface**

Ensure Memory interface matches OpenClaw's file-entry structure.

**Step 2: Update exports**

Add META_KEY and MemoryIndexMeta exports.

**Step 3: Commit**
```bash
git add src/memory/index.ts src/core/config/types.ts
git commit -m "refactor: update memory types for OpenClaw parity"
```

---

## Task 10: Build and test

**Step 1: Run build**
```bash
npm run build
```

**Step 2: Fix any type errors**

Address all TypeScript compilation errors.

**Step 3: Run tests if available**
```bash
npm test
```

**Step 4: Final commit**
```bash
git add -A
git commit -m "fix: resolve build errors from OpenClaw alignment"
```

---

## Migration Notes

### Breaking Changes
1. `Memory.category` removed - no longer available
2. `Memory.importance` removed - no longer available
3. `RecallOptions.minImportance` removed
4. `StoreOptions.category` removed
5. `StoreOptions.importance` removed
6. Chunks now reference `path` instead of `memory_id`

### Database Migration
- Existing databases will need reindexing after this update
- The `memories` table data will be lost
- Chunks will need to be recreated with path references

### Recommended Upgrade Path
1. Export existing memories if needed
2. Update to new version
3. Reindex all memory sources
