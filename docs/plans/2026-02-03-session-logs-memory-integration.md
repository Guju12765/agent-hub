# Session Logs Memory Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate session logs into the memory system so they're indexed and searchable alongside daily logs and MEMORY.md.

**Architecture:** Session files move to `.claude/memory/sessions/`, created at first PreCompact with timestamp-based naming, and automatically indexed by the memory sync system.

**Tech Stack:** Node.js scripts, TypeScript (memory system), SQLite with vector embeddings

---

## Task 1: Update Session Directory Path

**Files:**
- Modify: `src/templates/scripts/lib/utils.js:33-35`

**Step 1: Update getSessionsDir function**

Change the sessions directory from `.claude/sessions/` to `.claude/memory/sessions/`:

```javascript
/**
 * Get the sessions directory
 */
function getSessionsDir() {
  return path.join(process.cwd(), '.claude', 'memory', 'sessions');
}
```

**Step 2: Verify no other references**

Run: `grep -r "\.claude/sessions" src/`
Expected: No hardcoded references outside utils.js

**Step 3: Commit**

```bash
git add src/templates/scripts/lib/utils.js
git commit -m "refactor: move sessions dir to .claude/memory/sessions/"
```

---

## Task 2: Update Pre-Compact Hook with Session Logic

**Files:**
- Modify: `src/templates/scripts/hooks/pre-compact.js`

**Step 1: Rewrite pre-compact.js to handle session file creation/update**

Replace the current pre-compact.js with logic that:
1. On first compaction: creates session file with timestamp in filename
2. On subsequent compactions: **APPENDS** compaction marker (append-only)

```javascript
#!/usr/bin/env node
/**
 * PreCompact Hook - Save session state before context compaction
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Creates or updates session log file (APPEND-ONLY):
 * - First compaction: creates YYYY-MM-DD-HHmmss-{sessionId}.md
 * - Later compactions: APPENDS compaction marker to existing file
 */

const path = require('path');
const fs = require('fs');
const {
  getSessionsDir,
  getDateString,
  getTimeString,
  getSessionIdShort,
  findFiles,
  ensureDir,
  writeFile,
  appendFile,
  log
} = require('../lib/utils.js');

/**
 * Get timestamp string for filename (YYYY-MM-DD-HHmmss format)
 */
function getFilenameTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Find existing session file by session ID
 */
function findSessionFile(sessionsDir, sessionId) {
  const files = findFiles(sessionsDir, `*-${sessionId}.md`);
  return files.length > 0 ? files[0].path : null;
}

async function main() {
  const sessionsDir = getSessionsDir();
  const sessionId = getSessionIdShort();

  ensureDir(sessionsDir);

  const currentTime = getTimeString();
  const today = getDateString();

  // Try to find existing session file
  const existingFile = findSessionFile(sessionsDir, sessionId);

  if (existingFile) {
    // APPEND compaction marker (append-only behavior)
    appendFile(existingFile, `\n---\n**[Compaction ${currentTime}]**\n`);
    log(`[PreCompact] Appended to session file: ${path.basename(existingFile)}`);
  } else {
    // Create new session file with timestamp in filename
    const timestamp = getFilenameTimestamp();
    const sessionFile = path.join(sessionsDir, `${timestamp}-${sessionId}.md`);

    const template = `# Session: ${today}

**Session ID:** ${sessionId}
**Date:** ${today}
**Started:** ${currentTime}

---

**[Compaction ${currentTime}]**

## Session State

[Claude will fill this in during compaction]

### Work Done
-

### In Progress
-

### Notes for Next Session
-

`;

    writeFile(sessionFile, template);
    log(`[PreCompact] Created session file: ${path.basename(sessionFile)}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[PreCompact] Error:', err.message);
  process.exit(0);
});
```

**Step 2: Test the script manually**

Run: `node src/templates/scripts/hooks/pre-compact.js`
Expected: Creates file in `.claude/memory/sessions/` with correct naming

**Step 3: Run again to test append behavior**

Run: `node src/templates/scripts/hooks/pre-compact.js`
Expected: Appends `**[Compaction HH:MM]**` to existing file (not replace)

**Step 4: Commit**

```bash
git add src/templates/scripts/hooks/pre-compact.js
git commit -m "feat: create session files on PreCompact with append-only updates"
```

---

## Task 3: Remove SessionEnd Hook for Session Files

**Files:**
- Modify: `src/templates/hooks/default.json`
- Modify: `src/templates/scripts/hooks/session-end.js`

**Step 1: Update default.json to remove SessionEnd session logging**

The SessionEnd hook currently creates session files. Since we now do this in PreCompact, we can simplify or remove it. Keep the hook but make it a no-op or log-only:

```json
{
  "_comment": "Default hooks for agent-hub. Injected into settings.json on hire.",

  "SessionStart": [{
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/skills/continuous-learning-v2/agents/start-observer.js start"
    }],
    "description": "Ensure observer daemon is running for continuous learning"
  }],

  "PreCompact": [
    {
      "matcher": "manual|auto",
      "hooks": [{
        "type": "command",
        "command": "echo \"[Memory] Pre-compaction flush. Store durable memories now (use memory/logs/YYYY-MM-DD.md). If nothing to store, NO REPLY needed.\""
      }],
      "description": "Remind agent to save memories before compaction"
    },
    {
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node .claude/scripts/hooks/pre-compact.js"
      }],
      "description": "Create/update session log before context compaction"
    }
  ],

  "PreToolUse": [
    {
      "matcher": "tool == \"Edit\" || tool == \"Write\"",
      "hooks": [{
        "type": "command",
        "command": "node .claude/scripts/hooks/suggest-compact.js"
      }],
      "description": "Suggest manual compaction at logical intervals"
    },
    {
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node .claude/skills/continuous-learning-v2/hooks/observe.js"
      }],
      "description": "Continuous learning observation (pre)"
    }
  ],

  "PostToolUse": [{
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/skills/continuous-learning-v2/hooks/observe.js"
    }],
    "description": "Continuous learning observation (post)"
  }]
}
```

**Step 2: Simplify session-end.js to just log session end (no file creation)**

```javascript
#!/usr/bin/env node
/**
 * SessionEnd Hook - Log when session ends
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Note: Session files are now created by pre-compact.js
 * This hook just logs the session end event.
 */

const { log } = require('../lib/utils.js');

async function main() {
  log('[SessionEnd] Session ended');
  process.exit(0);
}

main().catch(err => {
  console.error('[SessionEnd] Error:', err.message);
  process.exit(0);
});
```

**Step 3: Commit**

```bash
git add src/templates/hooks/default.json src/templates/scripts/hooks/session-end.js
git commit -m "refactor: move session file creation from SessionEnd to PreCompact"
```

---

## Task 4: Update Memory Sync to Include Sessions

**Files:**
- Modify: `src/memory/sync.ts:71-93`
- Modify: `src/agent/paths.ts`

**Step 1: Add getSessionsDir to paths.ts**

Add a new function to get the sessions directory path:

```typescript
/**
 * Get sessions directory
 */
export function getSessionsDir(workspaceDir?: string): string {
  return join(getMemoryDir(workspaceDir), "sessions");
}
```

**Step 2: Update listMemoryFiles in sync.ts**

Modify the function to also list session files:

```typescript
/**
 * List all markdown files in memory directory
 */
export function listMemoryFiles(workspaceDir?: string): string[] {
  const memoryDir = getMemoryDir(workspaceDir);
  const files: string[] = [];

  // Check MEMORY.md
  const memoryPath = getConsolidatedPath(workspaceDir);
  if (existsSync(memoryPath)) {
    files.push(memoryPath);
  }

  // Check logs/ directory
  const logsDir = getDailyLogsDir(workspaceDir);
  if (existsSync(logsDir)) {
    const entries = readdirSync(logsDir);
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        files.push(join(logsDir, entry));
      }
    }
  }

  // Check sessions/ directory
  const sessionsDir = join(memoryDir, "sessions");
  if (existsSync(sessionsDir)) {
    const entries = readdirSync(sessionsDir);
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        files.push(join(sessionsDir, entry));
      }
    }
  }

  return files;
}
```

**Step 3: Add import for getSessionsDir**

Update imports at top of sync.ts:

```typescript
import {
  getMemoryDir,
  getConsolidatedPath,
  getDailyLogsDir,
  getSessionsDir,
} from "../agent/paths.js";
```

**Step 4: Commit**

```bash
git add src/agent/paths.ts src/memory/sync.ts
git commit -m "feat: include sessions directory in memory indexing"
```

---

## Task 5: Update File Watcher to Watch Sessions

**Files:**
- Modify: `src/memory/watcher.ts:50-64`

**Step 1: Import getSessionsDir**

Add import at top of watcher.ts:

```typescript
import { getMemoryDir, getConsolidatedPath, getDailyLogsDir, getSessionsDir } from "../agent/paths.js";
```

**Step 2: Update start() method to watch sessions directory**

Modify the start() method to also watch the sessions directory:

```typescript
/**
 * Start watching memory files
 */
start(): void {
  if (this.watcher || this.closed) return;

  const watchPaths: string[] = [];

  // Watch MEMORY.md
  const memoryPath = getConsolidatedPath(this.workspaceDir);
  watchPaths.push(memoryPath);

  // Watch logs/ directory
  const logsDir = getDailyLogsDir(this.workspaceDir);
  if (existsSync(logsDir)) {
    watchPaths.push(logsDir);
  }

  // Watch sessions/ directory
  const sessionsDir = getSessionsDir(this.workspaceDir);
  if (existsSync(sessionsDir)) {
    watchPaths.push(sessionsDir);
  }

  // ... rest of method unchanged
}
```

**Step 3: Commit**

```bash
git add src/memory/watcher.ts
git commit -m "feat: watch sessions directory for auto-indexing"
```

---

## Task 6: Update Documentation

**Files:**
- Modify: `docs/concepts/memory.md`
- Modify: `docs/configuration/hooks.md`

**Step 1: Update memory.md to document sessions**

Add a section about session logs in the memory system documentation:

```markdown
### Session Logs

Session logs are automatically created during context compaction:

| Aspect | Value |
|--------|-------|
| Location | `.claude/memory/sessions/` |
| Naming | `YYYY-MM-DD-HHmmss-{sessionId}.md` |
| Trigger | Created on first PreCompact, updated on subsequent |
| Indexed | Yes, searchable via `memory_search` |

Session logs capture:
- Session start time
- Compaction timestamps
- Notes for context continuity

**Three-tier memory:**
| Tier | Files | Purpose |
|------|-------|---------|
| Short-term | `sessions/*.md` | Per-session state |
| Mid-term | `logs/*.md` | Daily learnings |
| Long-term | `MEMORY.md` | Consolidated wisdom |
```

**Step 2: Update hooks.md to reflect new PreCompact behavior**

Update the PreCompact hook documentation to mention session file creation.

**Step 3: Commit**

```bash
git add docs/concepts/memory.md docs/configuration/hooks.md
git commit -m "docs: document session logs in memory system"
```

---

## Task 7: Test End-to-End

**Step 1: Build the project**

Run: `npm run build`
Expected: No errors

**Step 2: Create test agent and hire to test project**

```bash
agent-hub create test-sessions -s "Test session integration"
cd /tmp/test-project
agent-hub hire test-sessions
```

**Step 3: Trigger compaction manually**

In Claude Code session, trigger /compact or wait for auto-compaction.

**Step 4: Verify session file created**

```bash
ls -la .claude/memory/sessions/
```
Expected: File with pattern `YYYY-MM-DD-HHmmss-{sessionId}.md`

**Step 5: Verify indexing**

Use `memory_search` tool to search for content in session file.

**Step 6: Commit final verification**

```bash
git add -A
git commit -m "test: verify session logs memory integration"
```

---

## Summary

After completing all tasks:

**Key Requirements Verified:**
1. ✅ **Auto-indexed and searchable/gettable** - Session files in `.claude/memory/sessions/` are:
   - Listed by `listMemoryFiles()` in sync.ts
   - Watched by `AgentMemoryWatcher` in watcher.ts
   - Searchable via `memory_search` MCP tool
   - Retrievable via `memory_get` MCP tool

2. ✅ **Append-only during same-session PreCompacts** - Each compaction:
   - First PreCompact: Creates file with initial template
   - Later PreCompacts: Appends `**[Compaction HH:MM]**` marker (never replaces)

**Changes Made:**
1. Session files live in `.claude/memory/sessions/`
2. Created on first PreCompact with timestamp naming (`YYYY-MM-DD-HHmmss-{sessionId}.md`)
3. Append-only updates on subsequent compactions
4. Automatically indexed and searchable
5. SessionEnd hook simplified (no longer creates session files)
