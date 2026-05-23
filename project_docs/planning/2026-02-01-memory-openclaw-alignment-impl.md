# Memory OpenClaw Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align agent-hub memory system with real OpenClaw by removing write tools and consolidating code into `src/memory/`.

**Architecture:** Model writes to markdown via filesystem tools. File watcher syncs markdown to SQLite. MCP provides read-only search tools.

**Tech Stack:** TypeScript, chokidar, better-sqlite3, MCP SDK

---

## Task 1: Create Embeddings Subfolder Structure

**Files:**
- Create: `src/memory/embeddings/` directory

**Step 1: Create the embeddings directory**

```bash
mkdir -p src/memory/embeddings
```

**Step 2: Verify directory exists**

Run: `ls src/memory/embeddings`
Expected: Empty directory exists

**Step 3: Commit**

```bash
git add src/memory/embeddings/.gitkeep 2>/dev/null || echo "Directory created"
```

---

## Task 2: Move Embedding Files

**Files:**
- Move: `src/embeddings/*.ts` → `src/memory/embeddings/`

**Step 1: Move all embedding files**

```bash
mv src/embeddings/provider.ts src/memory/embeddings/
mv src/embeddings/provider-key.ts src/memory/embeddings/
mv src/embeddings/openai.ts src/memory/embeddings/
mv src/embeddings/gemini.ts src/memory/embeddings/
mv src/embeddings/local.ts src/memory/embeddings/
mv src/embeddings/batch-openai.ts src/memory/embeddings/
mv src/embeddings/batch-gemini.ts src/memory/embeddings/
mv src/embeddings/batch-failure.ts src/memory/embeddings/
mv src/embeddings/batch-manager.ts src/memory/embeddings/
mv src/embeddings/fallback.ts src/memory/embeddings/
mv src/embeddings/index.ts src/memory/embeddings/
```

**Step 2: Delete empty src/embeddings folder**

```bash
rmdir src/embeddings
```

**Step 3: Commit**

```bash
git add -A && git commit -m "refactor: move embeddings to src/memory/embeddings"
```

---

## Task 3: Update Embedding Internal Imports

**Files:**
- Modify: `src/memory/embeddings/*.ts` (update relative imports)

**Step 1: Update imports in embedding files**

The embedding files reference each other with relative imports. Since they're in the same folder, no changes needed for internal imports.

**Step 2: Verify no broken internal imports**

Run: `npx tsc --noEmit 2>&1 | grep embeddings | head -20`
Expected: Errors about external imports (will fix in later task)

---

## Task 4: Move Sync to Memory Folder

**Files:**
- Move: `src/agent/sync.ts` → `src/memory/sync.ts`

**Step 1: Move sync.ts**

```bash
mv src/agent/sync.ts src/memory/sync.ts
```

**Step 2: Update imports in sync.ts**

Change:
- `from "../memory/..."` → `from "./..."`
- `from "../embeddings/..."` → `from "./embeddings/..."`

**Step 3: Commit**

```bash
git add -A && git commit -m "refactor: move sync.ts to src/memory"
```

---

## Task 5: Merge Watchers into Memory Folder

**Files:**
- Move: `src/agent/watcher.ts` → `src/memory/watcher.ts`
- Delete: `src/agent/file-watcher.ts` (merge into watcher.ts)

**Step 1: Move watcher.ts**

```bash
mv src/agent/watcher.ts src/memory/watcher.ts
```

**Step 2: Review file-watcher.ts for unique functionality**

Check if `src/agent/file-watcher.ts` has any functionality not in `watcher.ts`. If unique, merge it.

**Step 3: Delete file-watcher.ts**

```bash
rm src/agent/file-watcher.ts
```

**Step 4: Update imports in watcher.ts**

Change:
- `from "../memory/..."` → `from "./..."`
- `from "./paths.js"` → `from "../agent/paths.js"`

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor: consolidate watchers into src/memory/watcher.ts"
```

---

## Task 6: Create Internal Helpers

**Files:**
- Create: `src/memory/internal.ts`

**Step 1: Create internal.ts with file listing helpers**

```typescript
/**
 * Internal helpers for memory system
 * Adapted from OpenClaw's internal.ts
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export interface MemoryFileEntry {
  path: string;
  absPath: string;
  mtimeMs: number;
  size: number;
  hash: string;
}

export function hashText(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function isMemoryPath(relPath: string): boolean {
  const normalized = relPath.trim().replace(/^[./]+/, "").replace(/\\/g, "/");
  if (!normalized) return false;
  if (normalized === "MEMORY.md" || normalized === "memory.md") return true;
  return normalized.startsWith("memory/");
}

export async function listMemoryFiles(
  workspaceDir: string,
  extraPaths?: string[]
): Promise<string[]> {
  const result: string[] = [];
  const memoryFile = path.join(workspaceDir, "MEMORY.md");
  const altMemoryFile = path.join(workspaceDir, "memory.md");
  const memoryDir = path.join(workspaceDir, "memory");

  // Add MEMORY.md if exists
  try {
    const stat = await fs.lstat(memoryFile);
    if (stat.isFile()) result.push(memoryFile);
  } catch {}

  // Add memory.md if exists
  try {
    const stat = await fs.lstat(altMemoryFile);
    if (stat.isFile()) result.push(altMemoryFile);
  } catch {}

  // Add all .md files in memory/ directory
  try {
    const stat = await fs.lstat(memoryDir);
    if (stat.isDirectory()) {
      await walkDir(memoryDir, result);
    }
  } catch {}

  // Add extra paths
  if (extraPaths?.length) {
    for (const extraPath of extraPaths) {
      const resolved = path.isAbsolute(extraPath)
        ? extraPath
        : path.resolve(workspaceDir, extraPath);
      try {
        const stat = await fs.lstat(resolved);
        if (stat.isDirectory()) {
          await walkDir(resolved, result);
        } else if (stat.isFile() && resolved.endsWith(".md")) {
          result.push(resolved);
        }
      } catch {}
    }
  }

  return [...new Set(result)];
}

async function walkDir(dir: string, files: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      await walkDir(full, files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
}

export async function buildFileEntry(
  absPath: string,
  workspaceDir: string
): Promise<MemoryFileEntry> {
  const content = await fs.readFile(absPath, "utf-8");
  const stat = await fs.stat(absPath);
  return {
    path: path.relative(workspaceDir, absPath).replace(/\\/g, "/"),
    absPath,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    hash: hashText(content),
  };
}
```

**Step 2: Commit**

```bash
git add src/memory/internal.ts && git commit -m "feat: add internal helpers to memory module"
```

---

## Task 7: Delete Store Tool

**Files:**
- Delete: `src/server/tools/store.ts`

**Step 1: Delete store.ts**

```bash
rm src/server/tools/store.ts
```

**Step 2: Commit**

```bash
git add -A && git commit -m "refactor: remove memory_store tool (model uses filesystem)"
```

---

## Task 8: Delete Flush Tool

**Files:**
- Delete: `src/server/tools/flush.ts`

**Step 1: Delete flush.ts**

```bash
rm src/server/tools/flush.ts
```

**Step 2: Commit**

```bash
git add -A && git commit -m "refactor: remove memory_flush tool (model uses filesystem)"
```

---

## Task 9: Delete Capture Folder

**Files:**
- Delete: `src/capture/categories.ts`
- Delete: `src/capture/` folder

**Step 1: Delete capture folder**

```bash
rm -rf src/capture
```

**Step 2: Commit**

```bash
git add -A && git commit -m "refactor: remove auto-categorization (model decides)"
```

---

## Task 10: Delete Markdown Writers

**Files:**
- Delete: `src/agent/markdown.ts`

**Step 1: Delete markdown.ts**

```bash
rm src/agent/markdown.ts
```

**Step 2: Commit**

```bash
git add -A && git commit -m "refactor: remove markdown writers (model uses filesystem)"
```

---

## Task 11: Update Server to Remove Store/Flush

**Files:**
- Modify: `src/server/index.ts`

**Step 1: Remove store/flush imports**

Delete these lines:
```typescript
import {
  STORE_TOOL_DEFINITION,
  executeStore,
  type StoreToolInput,
} from "./tools/store.js";
import {
  FLUSH_TOOL_DEFINITION,
  executeFlush,
  type FlushToolInput,
} from "./tools/flush.js";
```

**Step 2: Remove storeAgentMemory/storeProjectMemory imports**

Delete from agent imports:
```typescript
storeAgentMemory,
storeProjectMemory,
```

**Step 3: Remove from tools list**

Change:
```typescript
tools: [
  SEARCH_TOOL_DEFINITION,
  STORE_TOOL_DEFINITION,
  GET_TOOL_DEFINITION,
  STATUS_TOOL_DEFINITION,
  FLUSH_TOOL_DEFINITION,
],
```

To:
```typescript
tools: [
  SEARCH_TOOL_DEFINITION,
  GET_TOOL_DEFINITION,
  STATUS_TOOL_DEFINITION,
],
```

**Step 4: Remove case handlers**

Delete entire `case "memory_store":` block (lines ~182-210).
Delete entire `case "memory_flush":` block (lines ~238-268).

**Step 5: Commit**

```bash
git add src/server/index.ts && git commit -m "refactor: remove store/flush from MCP server"
```

---

## Task 12: Update Agent Index Exports

**Files:**
- Modify: `src/agent/index.ts`

**Step 1: Remove exports for deleted/moved files**

Remove exports for:
- `sync.ts` (moved to memory)
- `watcher.ts` (moved to memory)
- `file-watcher.ts` (deleted)
- `markdown.ts` (deleted)

Keep exports for:
- `paths.ts`
- Other remaining files

**Step 2: Commit**

```bash
git add src/agent/index.ts && git commit -m "refactor: update agent exports for moved files"
```

---

## Task 13: Update Memory Index Exports

**Files:**
- Modify: `src/memory/index.ts`

**Step 1: Add exports for new files**

```typescript
// Core
export * from "./manager.js";
export * from "./search.js";
export * from "./schema.js";
export * from "./cache.js";
export * from "./chunking.js";
export * from "./hybrid.js";

// Sync and watcher
export * from "./sync.js";
export * from "./watcher.js";
export * from "./internal.js";

// Embeddings
export * from "./embeddings/index.js";
```

**Step 2: Commit**

```bash
git add src/memory/index.ts && git commit -m "refactor: update memory exports for consolidated structure"
```

---

## Task 14: Fix All Import Paths

**Files:**
- Modify: All files with broken imports

**Step 1: Find all broken imports**

Run: `npx tsc --noEmit 2>&1 | head -50`

**Step 2: Fix imports in each file**

Common patterns to fix:
- `from "../embeddings/..."` → `from "../memory/embeddings/..."`
- `from "../agent/sync.js"` → `from "../memory/sync.js"`
- `from "../agent/watcher.js"` → `from "../memory/watcher.js"`
- `from "./tools/store.js"` → DELETE
- `from "./tools/flush.js"` → DELETE

**Step 3: Iterate until clean**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor: fix all import paths for new structure"
```

---

## Task 15: Verify Compilation

**Files:**
- None (verification only)

**Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run build**

Run: `npm run build` or `npx tsc`
Expected: Build succeeds

---

## Task 16: Final Commit

**Step 1: Check git status**

Run: `git status`
Expected: Clean working directory

**Step 2: Verify final structure**

Run: `ls src/memory/`
Expected:
```
cache.ts
chunking.ts
embeddings/
hybrid.ts
index.ts
internal.ts
manager.ts
schema.ts
search.ts
sync.ts
watcher.ts
```

Run: `ls src/memory/embeddings/`
Expected:
```
batch-failure.ts
batch-gemini.ts
batch-manager.ts
batch-openai.ts
fallback.ts
gemini.ts
index.ts
local.ts
openai.ts
provider-key.ts
provider.ts
```

**Step 3: Create summary commit if needed**

```bash
git log --oneline -10
```

---

## Summary

After completion:
- `memory_store` and `memory_flush` tools removed
- All memory code consolidated in `src/memory/`
- Embeddings in `src/memory/embeddings/`
- Model uses filesystem tools to write markdown
- File watcher syncs markdown → SQLite
- Read-only MCP tools: `memory_search`, `memory_get`, `memory_status`
