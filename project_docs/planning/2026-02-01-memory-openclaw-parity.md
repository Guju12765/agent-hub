# Memory OpenClaw Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Achieve exact parity between agent-hub and OpenClaw memory systems by fixing defaults, removing extras, and adding missing features.

**Architecture:** Align all constants, algorithms, and features with OpenClaw's implementation. Remove agent-hub-specific additions. Add missing OpenClaw features.

**Tech Stack:** TypeScript, better-sqlite3, chokidar

---

## Task 1: Fix Search Defaults

**Files:**
- Modify: `src/memory/search.ts:30-37`

**Step 1: Update DEFAULT_OPTIONS**

Change from:
```typescript
const DEFAULT_OPTIONS: Required<SearchOptions> = {
  limit: 10,
  minScore: 0.1,
  useVector: true,
  useKeyword: true,
  vectorWeight: 0.7,
  textWeight: 0.3,
};
```

To:
```typescript
const DEFAULT_OPTIONS: Required<SearchOptions> = {
  limit: 6,
  minScore: 0.35,
  useVector: true,
  useKeyword: true,
  vectorWeight: 0.7,
  textWeight: 0.3,
};
```

**Step 2: Update snippet length in vectorSearch and keywordSearch**

Change all `createSnippet(row.text, 300)` to `createSnippet(row.text, 700)`.

Locations:
- Line ~184: `createSnippet(row.text, 300)` → `createSnippet(row.text, 700)`
- Line ~215: `createSnippet(row.text, 300)` → `createSnippet(row.text, 700)`
- Line ~268: `createSnippet(row.text, 300)` → `createSnippet(row.text, 700)`
- Line ~362: `createSnippet(row.text, 300)` → `createSnippet(row.text, 700)`

**Step 3: Update candidate multiplier from 2x to 4x**

Change:
```typescript
const results = await this.vectorSearch(query, opts.limit * 2);
```
To:
```typescript
const results = await this.vectorSearch(query, opts.limit * 4);
```

And same for keywordSearch.

**Step 4: Commit**

```bash
git add src/memory/search.ts && git commit -m "fix: align search defaults with OpenClaw (limit=6, minScore=0.35, snippet=700, multiplier=4x)"
```

---

## Task 2: Fix Token Estimation

**Files:**
- Modify: `src/memory/chunking.ts:21`

**Step 1: Change CHARS_PER_TOKEN from 4 to 1**

OpenClaw uses 1 char = 1 token for embedding estimation.

Change:
```typescript
const CHARS_PER_TOKEN = 4;
```

To:
```typescript
const CHARS_PER_TOKEN = 1;
```

**Step 2: Update estimateTokens function comment**

```typescript
/**
 * Estimate token count from text
 * OpenClaw uses 1 char ≈ 1 token for conservative estimation
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
```

**Step 3: Commit**

```bash
git add src/memory/chunking.ts && git commit -m "fix: align token estimation with OpenClaw (1 char = 1 token)"
```

---

## Task 3: Remove Extra Markdown Heading Split Logic

**Files:**
- Modify: `src/memory/chunking.ts:105-182`

**Step 1: Simplify chunkMarkdown to match OpenClaw**

OpenClaw's chunkMarkdown does NOT split on headings or clear overlap on new sections. It simply accumulates lines.

Replace the entire `chunkMarkdown` function with OpenClaw's version:

```typescript
/**
 * Chunk markdown content
 * Matches OpenClaw's internal.ts implementation exactly
 */
export function chunkMarkdown(
  content: string,
  config: ChunkingConfig
): TextChunk[] {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const maxChars = Math.max(32, config.tokens * CHARS_PER_TOKEN);
  const overlapChars = Math.max(0, config.overlap * CHARS_PER_TOKEN);
  const chunks: TextChunk[] = [];

  let current: Array<{ line: string; lineNo: number }> = [];
  let currentChars = 0;

  const flush = () => {
    if (current.length === 0) return;
    const firstEntry = current[0];
    const lastEntry = current[current.length - 1];
    if (!firstEntry || !lastEntry) return;
    const text = current.map((entry) => entry.line).join("\n");
    const startLine = firstEntry.lineNo;
    const endLine = lastEntry.lineNo;
    chunks.push({
      text,
      startPos: startLine,  // Now stores line number
      endPos: endLine,      // Now stores line number
      hash: hashText(text),
    });
  };

  const carryOverlap = () => {
    if (overlapChars <= 0 || current.length === 0) {
      current = [];
      currentChars = 0;
      return;
    }
    let acc = 0;
    const kept: Array<{ line: string; lineNo: number }> = [];
    for (let i = current.length - 1; i >= 0; i -= 1) {
      const entry = current[i];
      if (!entry) continue;
      acc += entry.line.length + 1;
      kept.unshift(entry);
      if (acc >= overlapChars) break;
    }
    current = kept;
    currentChars = kept.reduce((sum, entry) => sum + entry.line.length + 1, 0);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    // Handle long lines by segmenting
    const segments: string[] = [];
    if (line.length === 0) {
      segments.push("");
    } else {
      for (let start = 0; start < line.length; start += maxChars) {
        segments.push(line.slice(start, start + maxChars));
      }
    }
    for (const segment of segments) {
      const lineSize = segment.length + 1;
      if (currentChars + lineSize > maxChars && current.length > 0) {
        flush();
        carryOverlap();
      }
      current.push({ line: segment, lineNo });
      currentChars += lineSize;
    }
  }
  flush();
  return chunks;
}
```

**Step 2: Commit**

```bash
git add src/memory/chunking.ts && git commit -m "refactor: align chunkMarkdown with OpenClaw (line-based, no heading split)"
```

---

## Task 4: Update TextChunk Interface for Line Numbers

**Files:**
- Modify: `src/memory/chunking.ts:13-18`
- Modify: `src/core/config/types.ts` (if TextChunk is defined there)

**Step 1: Rename fields to match OpenClaw**

Change:
```typescript
export interface TextChunk {
  text: string;
  startPos: number;
  endPos: number;
  hash: string;
}
```

To:
```typescript
export interface TextChunk {
  text: string;
  startLine: number;
  endLine: number;
  hash: string;
}
```

**Step 2: Update all references to startPos/endPos**

Search for `startPos` and `endPos` and rename to `startLine` and `endLine`.

Files to check:
- `src/memory/chunking.ts`
- `src/memory/sync.ts`
- `src/memory/search.ts`
- `src/memory/manager.ts`

**Step 3: Update database schema column names**

In `src/memory/schema.ts`, change:
```typescript
start_pos INTEGER NOT NULL,
end_pos INTEGER NOT NULL,
```

To:
```typescript
start_line INTEGER NOT NULL,
end_line INTEGER NOT NULL,
```

**Step 4: Run TypeScript to find all broken references**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix each one.

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor: rename startPos/endPos to startLine/endLine (match OpenClaw)"
```

---

## Task 5: Add Embedding Retry with Exponential Backoff

**Files:**
- Create: `src/memory/embeddings/retry.ts`
- Modify: `src/memory/manager.ts`

**Step 1: Create retry utility**

Create `src/memory/embeddings/retry.ts`:

```typescript
/**
 * Retry utility for embedding operations
 * Matches OpenClaw's retry logic
 */

const EMBEDDING_RETRY_MAX_ATTEMPTS = 3;
const EMBEDDING_RETRY_BASE_DELAY_MS = 500;
const EMBEDDING_RETRY_MAX_DELAY_MS = 8000;
const JITTER_FACTOR = 0.2; // ±20%

function addJitter(delay: number): number {
  const jitter = delay * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

function isRetryableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate") ||
    lower.includes("limit") ||
    lower.includes("429") ||
    lower.includes("503") ||
    lower.includes("timeout")
  );
}

export async function retryEmbedding<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, delay: number, error: Error) => void;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? EMBEDDING_RETRY_MAX_ATTEMPTS;
  const baseDelay = options?.baseDelay ?? EMBEDDING_RETRY_BASE_DELAY_MS;
  const maxDelay = options?.maxDelay ?? EMBEDDING_RETRY_MAX_DELAY_MS;

  let attempt = 0;
  let delayMs = baseDelay;

  while (true) {
    attempt++;
    try {
      return await operation();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (!isRetryableError(message) || attempt >= maxAttempts) {
        throw err;
      }

      const waitMs = addJitter(Math.min(delayMs, maxDelay));
      options?.onRetry?.(attempt, waitMs, err as Error);

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      delayMs *= 2; // Exponential backoff
    }
  }
}
```

**Step 2: Export from embeddings index**

Add to `src/memory/embeddings/index.ts`:
```typescript
export * from "./retry.js";
```

**Step 3: Commit**

```bash
git add src/memory/embeddings/retry.ts src/memory/embeddings/index.ts && git commit -m "feat: add embedding retry with exponential backoff"
```

---

## Task 6: Add Embedding Timeouts

**Files:**
- Create: `src/memory/embeddings/timeout.ts`
- Modify: `src/memory/manager.ts`

**Step 1: Create timeout utility**

Create `src/memory/embeddings/timeout.ts`:

```typescript
/**
 * Timeout utilities for embedding operations
 * Matches OpenClaw's timeout configuration
 */

// Timeout values from OpenClaw
export const VECTOR_LOAD_TIMEOUT_MS = 30_000;
export const EMBEDDING_QUERY_TIMEOUT_REMOTE_MS = 60_000;
export const EMBEDDING_QUERY_TIMEOUT_LOCAL_MS = 5 * 60_000;
export const EMBEDDING_BATCH_TIMEOUT_REMOTE_MS = 2 * 60_000;
export const EMBEDDING_BATCH_TIMEOUT_LOCAL_MS = 10 * 60_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return await promise;
  }

  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function resolveEmbeddingTimeout(
  kind: "query" | "batch",
  isLocal: boolean
): number {
  if (kind === "query") {
    return isLocal ? EMBEDDING_QUERY_TIMEOUT_LOCAL_MS : EMBEDDING_QUERY_TIMEOUT_REMOTE_MS;
  }
  return isLocal ? EMBEDDING_BATCH_TIMEOUT_LOCAL_MS : EMBEDDING_BATCH_TIMEOUT_REMOTE_MS;
}
```

**Step 2: Export from embeddings index**

Add to `src/memory/embeddings/index.ts`:
```typescript
export * from "./timeout.js";
```

**Step 3: Commit**

```bash
git add src/memory/embeddings/timeout.ts src/memory/embeddings/index.ts && git commit -m "feat: add embedding timeout utilities"
```

---

## Task 7: Add Embedding Batch Configuration

**Files:**
- Modify: `src/memory/manager.ts`

**Step 1: Add batch constants**

Add at top of manager.ts:
```typescript
// Embedding batch configuration (from OpenClaw)
const EMBEDDING_BATCH_MAX_TOKENS = 8000;
const EMBEDDING_APPROX_CHARS_PER_TOKEN = 1;
const INDEX_CONCURRENCY = 4;
const BATCH_CONCURRENCY = 2;
const BATCH_POLL_INTERVAL_MS = 2000;
const BATCH_TIMEOUT_MINUTES = 60;
const BATCH_FAILURE_LIMIT = 2;
```

**Step 2: Add batch settings interface**

```typescript
interface BatchSettings {
  enabled: boolean;
  wait: boolean;
  concurrency: number;
  pollIntervalMs: number;
  timeoutMs: number;
  failureLimit: number;
}

const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  enabled: true,
  wait: true,
  concurrency: BATCH_CONCURRENCY,
  pollIntervalMs: BATCH_POLL_INTERVAL_MS,
  timeoutMs: BATCH_TIMEOUT_MINUTES * 60 * 1000,
  failureLimit: BATCH_FAILURE_LIMIT,
};
```

**Step 3: Commit**

```bash
git add src/memory/manager.ts && git commit -m "feat: add embedding batch configuration constants"
```

---

## Task 8: Add Sync Debounce Configuration

**Files:**
- Modify: `src/memory/watcher.ts`
- Modify: `src/memory/manager.ts`

**Step 1: Add sync constants**

Add to manager.ts or create new config file:
```typescript
// Sync configuration (from OpenClaw)
const WATCH_DEBOUNCE_MS = 1500;
const SESSION_DIRTY_DEBOUNCE_MS = 5000;
const WATCH_POLL_INTERVAL_MS = 100;
```

**Step 2: Update watcher to use configurable debounce**

In watcher.ts, change chokidar options:
```typescript
const watcher = chokidar.watch(watchPaths, {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: debounceMs ?? 1500,
    pollInterval: 100,
  },
});
```

**Step 3: Commit**

```bash
git add src/memory/watcher.ts src/memory/manager.ts && git commit -m "feat: add configurable sync debounce (1500ms default)"
```

---

## Task 9: Add Cache Lookup Batch Size

**Files:**
- Modify: `src/memory/cache.ts`

**Step 1: Add cache batch size constant**

```typescript
const CACHE_LOOKUP_BATCH_SIZE = 400;
```

**Step 2: Update cache lookup to batch queries**

When looking up multiple hashes, batch them in groups of 400:
```typescript
async getMultiple(hashes: string[]): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();

  // Batch lookups in groups of CACHE_LOOKUP_BATCH_SIZE
  for (let i = 0; i < hashes.length; i += CACHE_LOOKUP_BATCH_SIZE) {
    const batch = hashes.slice(i, i + CACHE_LOOKUP_BATCH_SIZE);
    const placeholders = batch.map(() => "?").join(",");
    const stmt = this.db.prepare(`
      SELECT hash, embedding FROM embedding_cache
      WHERE provider = ? AND model = ? AND provider_key = ?
      AND hash IN (${placeholders})
    `);
    const rows = stmt.all(this.provider, this.model, this.providerKey, ...batch);
    for (const row of rows) {
      results.set(row.hash, JSON.parse(row.embedding));
    }
  }

  return results;
}
```

**Step 3: Commit**

```bash
git add src/memory/cache.ts && git commit -m "feat: add cache lookup batching (400 per query)"
```

---

## Task 10: Add UTF-16 Safe Truncation

**Files:**
- Modify: `src/memory/chunking.ts`

**Step 1: Add truncateUtf16Safe function**

Add to chunking.ts:
```typescript
/**
 * Truncate string safely for UTF-16 (avoids splitting surrogate pairs)
 * Matches OpenClaw's utils.ts implementation
 */
export function truncateUtf16Safe(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  let end = maxChars;
  // Check if we're in the middle of a surrogate pair
  const charCode = text.charCodeAt(end - 1);
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    // High surrogate - include the low surrogate too or back up
    end--;
  }

  return text.slice(0, end);
}
```

**Step 2: Update createSnippet to use it**

Change createSnippet:
```typescript
export function createSnippet(text: string, maxLength: number = 700): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Use UTF-16 safe truncation
  let snippet = truncateUtf16Safe(text, maxLength);

  // Try to break at a sentence or word boundary
  const lastSentence = snippet.lastIndexOf(". ");
  const lastWord = snippet.lastIndexOf(" ");

  if (lastSentence > maxLength * 0.7) {
    snippet = snippet.slice(0, lastSentence + 1);
  } else if (lastWord > maxLength * 0.8) {
    snippet = snippet.slice(0, lastWord);
  }

  return snippet + "...";
}
```

**Step 3: Commit**

```bash
git add src/memory/chunking.ts && git commit -m "feat: add UTF-16 safe string truncation"
```

---

## Task 11: Update Schema for Line Numbers

**Files:**
- Modify: `src/memory/schema.ts`

**Step 1: Update chunks table schema**

Change:
```typescript
start_pos INTEGER NOT NULL,
end_pos INTEGER NOT NULL,
```

To:
```typescript
start_line INTEGER NOT NULL,
end_line INTEGER NOT NULL,
```

**Step 2: Add migration logic**

Add schema version check and migration:
```typescript
const SCHEMA_VERSION = 2;

function migrateSchema(db: Database.Database): void {
  const versionRow = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
  const currentVersion = versionRow ? parseInt(versionRow.value) : 1;

  if (currentVersion < 2) {
    // Rename columns
    db.exec(`
      ALTER TABLE chunks RENAME COLUMN start_pos TO start_line;
      ALTER TABLE chunks RENAME COLUMN end_pos TO end_line;
    `);
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)").run(SCHEMA_VERSION.toString());
  }
}
```

**Step 3: Commit**

```bash
git add src/memory/schema.ts && git commit -m "refactor: update schema to use start_line/end_line"
```

---

## Task 12: Remove Importance and Category Fields

**Files:**
- Modify: `src/memory/schema.ts`
- Modify: `src/memory/manager.ts`
- Modify: `src/memory/search.ts`
- Modify: `src/core/config/types.ts`

**Step 1: Check if OpenClaw has importance/category**

OpenClaw does NOT have importance or category fields in chunks. These are agent-hub additions.

**Step 2: Remove from schema**

Remove from memories table:
```typescript
category TEXT DEFAULT 'other'
importance REAL DEFAULT 0.7
```

**Step 3: Remove from types**

Update Memory interface to remove category and importance if not in OpenClaw.

**Step 4: Update search.ts to not use these fields**

Remove any filtering by importance or category.

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor: remove importance/category fields (not in OpenClaw)"
```

---

## Task 13: Add Index Concurrency

**Files:**
- Modify: `src/memory/sync.ts`

**Step 1: Add concurrency constant**

```typescript
const INDEX_CONCURRENCY = 4;
```

**Step 2: Update sync to process files concurrently**

```typescript
import pLimit from "p-limit";

const limit = pLimit(INDEX_CONCURRENCY);

const indexTasks = filesToIndex.map((file) =>
  limit(() => indexFile(file))
);

await Promise.all(indexTasks);
```

Note: May need to add `p-limit` dependency:
```bash
npm install p-limit
```

**Step 3: Commit**

```bash
git add src/memory/sync.ts package.json package-lock.json && git commit -m "feat: add concurrent file indexing (4 parallel)"
```

---

## Task 14: Fix All TypeScript Errors

**Files:**
- All modified files

**Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit 2>&1 | head -100
```

**Step 2: Fix each error**

Common fixes:
- Update function signatures
- Update interface usages
- Fix import paths

**Step 3: Iterate until clean**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add -A && git commit -m "fix: resolve all TypeScript errors after alignment"
```

---

## Task 15: Verify Build

**Files:**
- None (verification only)

**Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Verify final structure**

```bash
ls src/memory/embeddings/
```

Expected to include:
- retry.ts
- timeout.ts

---

## Task 16: Update Exports

**Files:**
- Modify: `src/memory/index.ts`
- Modify: `src/memory/embeddings/index.ts`

**Step 1: Ensure all new utilities are exported**

In `src/memory/embeddings/index.ts`:
```typescript
export * from "./retry.js";
export * from "./timeout.js";
```

In `src/memory/chunking.ts` exports:
```typescript
export { truncateUtf16Safe } from "./chunking.js";
```

**Step 2: Commit**

```bash
git add -A && git commit -m "chore: update exports for new utilities"
```

---

## Summary

After completion:
- Search defaults match OpenClaw (limit=6, minScore=0.35, snippet=700)
- Token estimation matches (1 char = 1 token)
- Chunking uses line numbers instead of character positions
- No extra markdown heading split logic
- Embedding retry with exponential backoff (3 attempts, 500ms base, 8s max)
- Embedding timeouts (30s vector load, 60s/5m query, 2m/10m batch)
- Batch configuration (8000 tokens, 4 concurrent, 2s poll)
- Sync debounce (1500ms watch, 5000ms session)
- UTF-16 safe truncation
- Concurrent file indexing (4 parallel)
