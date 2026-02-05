# Project Mode Simplification Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify codebase to always run in project mode, remove dead folders, and add placeholders for future master-level promotion.

**Architecture:** MCP server always operates on project-level memory (`.claude/memory/`). Master-level (`~/.agent-hub/agents/<name>/`) stores agent configs and future promoted memories. Watcher always runs for real-time project memory indexing.

**Tech Stack:** TypeScript, Node.js, chokidar (file watching)

---

## Task 1: Delete Empty Folders

**Files:**
- Delete: `src/core/embeddings/` (empty folder)
- Delete: `src/core/memory/` (empty folder)
- Delete: `src/core/storage/` (empty folder)
- Delete: `src/test/` (empty folder)

**Step 1: Verify folders are empty**

Run: `ls src/core/embeddings src/core/memory src/core/storage src/test 2>&1`
Expected: Empty or "No such file or directory" for each

**Step 2: Delete empty folders**

Run: `rm -rf src/core/embeddings src/core/memory src/core/storage src/test`

**Step 3: Verify deletion**

Run: `ls src/core/`
Expected: Only `types.ts`, `defaults.ts`, `index.ts` remain

**Step 4: Build to confirm no breaks**

Run: `npm run build`
Expected: Success

**Step 5: Commit**

```bash
git add -A && git commit -m "chore: remove empty placeholder folders"
```

---

## Task 2: Simplify Server to Always Project Mode

**Files:**
- Modify: `src/server/index.ts`

**Step 1: Read current server implementation**

Read `src/server/index.ts` to understand current flag handling and projectMode logic.

**Step 2: Remove --project flag and projectMode variable**

Remove:
- `--project` from argument parsing
- `projectMode` variable declaration
- Any `if (projectMode)` conditionals

Keep:
- `--agent <name>` flag
- `--project-dir <dir>` flag (for explicit path override)

**Step 3: Update memory path logic**

Replace conditional path logic with always-project:
```typescript
// Always use project-level memory
const memoryDir = projectDir
  ? join(projectDir, ".claude", "memory")
  : join(process.cwd(), ".claude", "memory");
```

**Step 4: Ensure watcher always starts**

Remove any conditional around watcher start:
```typescript
// Always start watcher for project memory
startWatcher(memoryDir, db, embeddingProvider);
```

**Step 5: Update help text if present**

Remove references to `--project` flag in any help/usage text.

**Step 6: Build and verify**

Run: `npm run build`
Expected: Success

**Step 7: Commit**

```bash
git add src/server/index.ts && git commit -m "refactor: always use project mode, remove --project flag"
```

---

## Task 3: Create Placeholder for Master Promotion

**Files:**
- Create: `src/agent/promote.ts`
- Modify: `src/agent/index.ts`

**Step 1: Create promote.ts placeholder**

```typescript
/**
 * Future: Promote project memory to master level
 *
 * This will extract, summarize, and upload selected project-level
 * memories to agent master storage as long-term assets.
 */

/**
 * Promote project memory to master level (NOT IMPLEMENTED)
 * @param agentName - The agent name
 * @param projectDir - The project directory
 * @throws Error - Always throws, not yet implemented
 */
export async function promoteToMaster(
  agentName: string,
  projectDir: string
): Promise<void> {
  // TODO: Future implementation
  // - Extract key learnings from project memory
  // - Summarize and deduplicate with existing master memory
  // - Merge into master-level MEMORY.md
  // - Update master-level index
  throw new Error("promoteToMaster is not implemented yet - future feature");
}
```

**Step 2: Export from agent/index.ts**

Add to `src/agent/index.ts`:
```typescript
export * from "./promote.js";
```

**Step 3: Build and verify**

Run: `npm run build`
Expected: Success

**Step 4: Commit**

```bash
git add src/agent/promote.ts src/agent/index.ts && git commit -m "feat: add promoteToMaster placeholder for future master-level memory promotion"
```

---

## Task 4: Add Config Sync Placeholder Comment

**Files:**
- Modify: `src/agent/sync.ts`

**Step 1: Read current sync.ts**

Read `src/agent/sync.ts` to find appropriate location for placeholder comment.

**Step 2: Add placeholder comment at top of file**

Add after imports:
```typescript
/**
 * TODO: Future - Config sync with diff/confirmation
 *
 * syncConfigToProject(agentName: string, projectDir: string, options?: SyncOptions)
 * - Compare master config files vs project config files
 * - Show diff to user for each changed file
 * - User confirms which changes to apply
 * - Apply selected changes with backup
 *
 * Use case: After agent master configs are updated, user can manually
 * sync changes to existing projects with review/confirmation.
 */
```

**Step 3: Build and verify**

Run: `npm run build`
Expected: Success

**Step 4: Commit**

```bash
git add src/agent/sync.ts && git commit -m "docs: add placeholder for future config sync with diff/confirmation"
```

---

## Task 5: Final Verification

**Step 1: Full build**

Run: `npm run build`
Expected: Success with no errors

**Step 2: Check folder structure**

Run: `ls src/core/`
Expected: Only `types.ts`, `defaults.ts`, `index.ts`

**Step 3: Verify exports work**

Run: `node -e "import('./dist/agent/index.js').then(m => console.log('promoteToMaster:', typeof m.promoteToMaster))"`
Expected: `promoteToMaster: function`

**Step 4: Git status**

Run: `git log --oneline -5`
Expected: See all commits from this plan

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Delete empty folders | 4 folders deleted |
| 2 | Always project mode | server/index.ts |
| 3 | Promote placeholder | agent/promote.ts, agent/index.ts |
| 4 | Config sync placeholder | agent/sync.ts |
| 5 | Final verification | None (verification only) |

**Total: 5 tasks, ~30 minutes**
