# Cleanup & Interactive Conflict Resolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up agent-hub templates and add interactive conflict resolution to the hire command

**Architecture:** Two-phase approach - Phase 1 handles template cleanup (archival/deletion), Phase 2 implements ConflictResolver class and integrates it into hire.ts

**Tech Stack:** TypeScript, Node.js, git operations, readline for interactive prompts

---

## Phase 1: Template Cleanup

### Task 1: Create Archive Structure

**Files:**
- Create: `docs/archived-skills/README.md`
- Create: `docs/archived-skills/continuous-learning-v2/ARCHIVED.md`
- Create: `docs/archived-skills/continuous-learning-v2/skill/` (directory)
- Create: `docs/archived-skills/continuous-learning-v2/commands/` (directory)

**Step 1: Create archive directories**

```bash
mkdir -p docs/archived-skills/continuous-learning-v2/skill
mkdir -p docs/archived-skills/continuous-learning-v2/commands
```

**Step 2: Write docs/archived-skills/README.md**

```markdown
# Archived Skills

This directory contains skills that have been archived but preserved for reference.

## Why Archive vs Delete?

- **Delete:** No value, no references, cleanly removable
- **Archive:** Had value but removed from defaults for simplification

## Archived Skills

### continuous-learning-v2 (2026-02-04)
Automatic instinct learning and clustering system with observer daemon.

**Reason:** System complexity vs. adoption trade-off
**Alternative:** Manual memory management with extract-session skill

See: `continuous-learning-v2/ARCHIVED.md`

## Using Archived Skills

Archived skills can still be manually copied to agents if needed. They are not included in new agent templates by default.
```

**Step 3: Write docs/archived-skills/continuous-learning-v2/ARCHIVED.md**

```markdown
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
```

**Step 4: Commit archive structure**

```bash
git add docs/archived-skills/
git commit -m "docs: create archived skills structure

Preparing to archive continuous-learning-v2 system.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Move continuous-learning-v2 Skill to Archive

**Files:**
- Move: `src/templates/skills/continuous-learning-v2/` → `docs/archived-skills/continuous-learning-v2/skill/`

**Step 1: Copy skill to archive**

```bash
cp -r src/templates/skills/continuous-learning-v2/* docs/archived-skills/continuous-learning-v2/skill/
```

**Step 2: Verify copy was successful**

```bash
ls -la docs/archived-skills/continuous-learning-v2/skill/
# Should show: SKILL.md, config.json, hooks/, agents/, scripts/
```

**Step 3: Delete original skill**

```bash
rm -rf src/templates/skills/continuous-learning-v2/
```

**Step 4: Commit move**

```bash
git add src/templates/skills/ docs/archived-skills/continuous-learning-v2/skill/
git commit -m "refactor: archive continuous-learning-v2 skill

Moved to docs/archived-skills/ for reference.
Removed from default templates.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Move continuous-learning-v2 Commands to Archive

**Files:**
- Move: `src/templates/commands/evolve.md` → `docs/archived-skills/continuous-learning-v2/commands/`
- Move: `src/templates/commands/instinct-export.md` → `docs/archived-skills/continuous-learning-v2/commands/`
- Move: `src/templates/commands/instinct-import.md` → `docs/archived-skills/continuous-learning-v2/commands/`
- Move: `src/templates/commands/instinct-status.md` → `docs/archived-skills/continuous-learning-v2/commands/`

**Step 1: Copy commands to archive**

```bash
cp src/templates/commands/evolve.md docs/archived-skills/continuous-learning-v2/commands/
cp src/templates/commands/instinct-export.md docs/archived-skills/continuous-learning-v2/commands/
cp src/templates/commands/instinct-import.md docs/archived-skills/continuous-learning-v2/commands/
cp src/templates/commands/instinct-status.md docs/archived-skills/continuous-learning-v2/commands/
```

**Step 2: Verify copy**

```bash
ls -la docs/archived-skills/continuous-learning-v2/commands/
# Should show 4 .md files
```

**Step 3: Delete original commands**

```bash
rm src/templates/commands/evolve.md
rm src/templates/commands/instinct-export.md
rm src/templates/commands/instinct-import.md
rm src/templates/commands/instinct-status.md
```

**Step 4: Commit move**

```bash
git add src/templates/commands/ docs/archived-skills/continuous-learning-v2/commands/
git commit -m "refactor: archive continuous-learning-v2 commands

Moved evolve, instinct-* commands to archived-skills.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Delete Unused Skills

**Files:**
- Delete: `src/templates/skills/coding-standards/`
- Delete: `src/templates/skills/python-patterns/`

**Step 1: Delete coding-standards skill**

```bash
rm -rf src/templates/skills/coding-standards/
```

**Step 2: Delete python-patterns skill**

```bash
rm -rf src/templates/skills/python-patterns/
```

**Step 3: Verify deletion**

```bash
ls -la src/templates/skills/
# Should show: memory-summarization, skill-creator (continuous-learning-v2 already removed)
```

**Step 4: Commit deletion**

```bash
git add src/templates/skills/
git commit -m "refactor: delete unused skills

Removed coding-standards and python-patterns skills.
No references found in agents, rules, or hooks.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Delete Unused Commands

**Files:**
- Delete: `src/templates/commands/build-fix.md`
- Delete: `src/templates/commands/checkpoint.md`
- Delete: `src/templates/commands/code-review.md`
- Delete: `src/templates/commands/orchestrate.md`
- Delete: `src/templates/commands/plan.md`
- Delete: `src/templates/commands/tdd.md`
- Delete: `src/templates/commands/test-coverage.md`
- Delete: `src/templates/commands/verify.md`

**Step 1: Delete command files**

```bash
rm src/templates/commands/build-fix.md
rm src/templates/commands/checkpoint.md
rm src/templates/commands/code-review.md
rm src/templates/commands/orchestrate.md
rm src/templates/commands/plan.md
rm src/templates/commands/tdd.md
rm src/templates/commands/test-coverage.md
rm src/templates/commands/verify.md
```

**Step 2: Verify only extract-session.md remains**

```bash
ls -la src/templates/commands/
# Should show only: extract-session.md
```

**Step 3: Commit deletion**

```bash
git add src/templates/commands/
git commit -m "refactor: delete unused commands

Removed 8 commands, keeping only extract-session.md.
No references found in agents, skills, rules, or hooks.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Delete suggest-compact System

**Files:**
- Delete: `src/templates/scripts/hooks/suggest-compact.js`

**Step 1: Delete suggest-compact script**

```bash
rm src/templates/scripts/hooks/suggest-compact.js
```

**Step 2: Verify deletion**

```bash
ls -la src/templates/scripts/hooks/
# suggest-compact.js should be gone
```

**Step 3: Commit deletion**

```bash
git add src/templates/scripts/hooks/
git commit -m "refactor: delete suggest-compact system

Removed strategic compact suggester script.
Hook reference will be removed in next task.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Update hooks/default.json

**Files:**
- Modify: `src/templates/hooks/default.json`

**Step 1: Read current hooks/default.json**

```bash
cat src/templates/hooks/default.json
```

**Step 2: Create new hooks/default.json with only memory hooks**

Content:
```json
{
  "_comment": "Default hooks for agent-hub. Injected into settings.json on hire.",

  "SessionStart": [
    {
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "echo \"[Memory] Memory available at .claude/memory/ (MEMORY.md, logs/, sessions/). Use /memory-summarization at PreCompact to save.\""
      }],
      "description": "Remind Claude about memory location"
    }
  ],

  "PreCompact": [{
    "matcher": "manual|auto",
    "hooks": [{
      "type": "command",
      "command": "echo \"[Memory] Pre-compaction. Use /memory-summarization to save session state, daily learnings, and durable memories. If nothing to save, NO REPLY needed.\""
    }],
    "description": "Prompt Claude to save memories before compaction"
  }]
}
```

**Step 3: Write updated hooks/default.json**

Use editor or write tool to replace entire file with content above.

**Step 4: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/templates/hooks/default.json', 'utf-8')); console.log('Valid JSON')"
```

Expected: "Valid JSON"

**Step 5: Commit update**

```bash
git add src/templates/hooks/default.json
git commit -m "refactor: remove continuous-learning and suggest-compact hooks

Cleaned up default.json to only include memory reminders.

Removed:
- SessionStart: continuous-learning observer start
- PreToolUse: suggest-compact hook
- PreToolUse: continuous-learning observe
- PostToolUse: continuous-learning observe

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Interactive Conflict Resolution

### Task 8: Create ConflictResolver Utility Functions

**Files:**
- Create: `src/cli/conflict-resolver.ts`

**Step 1: Create file with editor detection**

```typescript
import { existsSync } from "node:fs";
import { platform } from "node:os";

/**
 * Detect available text editor
 */
export function detectEditor(): string | null {
  // Check environment variables first
  if (process.env.EDITOR) return process.env.EDITOR;
  if (process.env.VISUAL) return process.env.VISUAL;

  // Platform-specific defaults
  if (platform() === "win32") {
    return "notepad";
  }

  // Unix-like: try common editors
  if (existsSync("/usr/bin/vim")) return "vim";
  if (existsSync("/usr/bin/nano")) return "nano";
  if (existsSync("/bin/nano")) return "nano";

  return null;
}

/**
 * Create conflict markers for merge
 */
export function createConflictMarkers(
  existingContent: string,
  agentContent: string,
  agentName: string
): string {
  return `# ============================================
# CONFLICT: Choose one or combine both
# ============================================

# --- YOUR VERSION ---
${existingContent}

# --- AGENT VERSION (${agentName}) ---
${agentContent}

# ============================================
# Delete markers and unwanted sections above
# ============================================
`;
}

/**
 * Check if content still has conflict markers
 */
export function hasConflictMarkers(content: string): boolean {
  return content.includes("# --- YOUR VERSION ---") ||
         content.includes("# --- AGENT VERSION");
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors

**Step 3: Commit utility functions**

```bash
git add src/cli/conflict-resolver.ts
git commit -m "feat: add conflict resolver utility functions

Added editor detection and conflict marker generation.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Add Hooks Merge Logic

**Files:**
- Modify: `src/cli/conflict-resolver.ts`

**Step 1: Add hooks merge function**

Append to conflict-resolver.ts:

```typescript
type HookConfig = {
  matcher: string;
  hooks: Array<{ type: string; command: string }>;
  description: string;
};

type HooksConfig = Record<string, HookConfig | HookConfig[]>;

/**
 * Auto-merge hooks JSON by combining arrays
 */
export function mergeHooks(existing: HooksConfig, agent: HooksConfig): HooksConfig {
  const merged = { ...existing };

  for (const [event, agentHooks] of Object.entries(agent)) {
    if (!merged[event]) {
      // New event type - just add it
      merged[event] = agentHooks;
    } else {
      // Event exists - merge hook arrays
      const existingArray = Array.isArray(merged[event])
        ? (merged[event] as HookConfig[])
        : [merged[event] as HookConfig];

      const agentArray = Array.isArray(agentHooks)
        ? (agentHooks as HookConfig[])
        : [agentHooks as HookConfig];

      // Check for duplicate hook commands
      const existingCommands = new Set(
        existingArray.flatMap((h) => h.hooks.map((hook) => hook.command))
      );

      const uniqueNew = agentArray.filter((hookConfig) =>
        hookConfig.hooks.every((hook) => !existingCommands.has(hook.command))
      );

      if (uniqueNew.length > 0) {
        merged[event] = [...existingArray, ...uniqueNew];
      }
    }
  }

  return merged;
}

/**
 * Check if hooks have conflicts (same command for same event)
 */
export function hooksHaveConflict(
  existing: HooksConfig,
  agent: HooksConfig
): boolean {
  for (const [event, agentHooks] of Object.entries(agent)) {
    if (!existing[event]) continue;

    const existingArray = Array.isArray(existing[event])
      ? (existing[event] as HookConfig[])
      : [existing[event] as HookConfig];

    const agentArray = Array.isArray(agentHooks)
      ? (agentHooks as HookConfig[])
      : [agentHooks as HookConfig];

    const existingCommands = new Set(
      existingArray.flatMap((h) => h.hooks.map((hook) => hook.command))
    );

    const hasConflict = agentArray.some((hookConfig) =>
      hookConfig.hooks.some((hook) => existingCommands.has(hook.command))
    );

    if (hasConflict) return true;
  }

  return false;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors

**Step 3: Commit hooks merge logic**

```bash
git add src/cli/conflict-resolver.ts
git commit -m "feat: add hooks auto-merge logic

Merges hook arrays and detects conflicts.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Add Interactive Prompt Infrastructure

**Files:**
- Modify: `src/cli/conflict-resolver.ts`

**Step 1: Add readline-based prompt function**

Append to conflict-resolver.ts:

```typescript
import { createInterface } from "node:readline";

/**
 * Prompt user for input with specific choices
 */
export async function prompt(
  message: string,
  choices: string[]
): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message}\nChoice: `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      const choice = choices.find((c) => c.toLowerCase().startsWith(normalized));
      if (choice) {
        resolve(choice);
      } else {
        console.log(`Invalid choice. Please enter one of: ${choices.join(", ")}`);
        // Re-prompt
        resolve(prompt(message, choices));
      }
    });
  });
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors

**Step 3: Commit prompt infrastructure**

```bash
git add src/cli/conflict-resolver.ts
git commit -m "feat: add interactive prompt infrastructure

Readline-based user prompt with validation.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Create ConflictResolver Class Structure

**Files:**
- Modify: `src/cli/conflict-resolver.ts`

**Step 1: Add ConflictResolver class skeleton**

Append to conflict-resolver.ts:

```typescript
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";

export type ConflictAction = "keep" | "replace" | "merge" | "skip" | "abort";

export class ConflictResolver {
  private skipped: string[] = [];
  private backup: Map<string, string> = new Map();
  private newFiles: string[] = [];
  private editor: string | null;
  private stats = {
    copied: 0,
    replaced: 0,
    merged: 0,
    skipped: 0,
  };

  constructor(
    private agentName: string,
    private isDryRun: boolean = false,
    private forceMode?: "keep" | "replace"
  ) {
    this.editor = detectEditor();
  }

  /**
   * Handle a file conflict
   */
  async handleConflict(
    targetPath: string,
    agentPath: string,
    type: "file" | "skill-dir"
  ): Promise<ConflictAction> {
    // If dry run, just track
    if (this.isDryRun) {
      console.log(`Would conflict: ${targetPath} (${type})`);
      return "skip";
    }

    // If force mode, return immediately
    if (this.forceMode === "keep") {
      this.stats.skipped++;
      return "keep";
    }
    if (this.forceMode === "replace") {
      this.stats.replaced++;
      return "replace";
    }

    // Interactive prompt
    return await this.promptForAction(targetPath, agentPath, type);
  }

  /**
   * Prompt user for conflict resolution action
   */
  private async promptForAction(
    targetPath: string,
    agentPath: string,
    type: "file" | "skill-dir"
  ): Promise<ConflictAction> {
    const fileName = basename(targetPath);
    console.log(`\nConflict: ${fileName} already exists`);
    console.log(`  [K]eep existing    [R]eplace with agent's`);
    console.log(`  [M]erge in editor  [D]iff first`);
    console.log(`  [S]kip for now     [A]bort hire`);

    const choice = await prompt("", ["Keep", "Replace", "Merge", "Diff", "Skip", "Abort"]);

    switch (choice) {
      case "Keep":
        this.stats.skipped++;
        return "keep";
      case "Replace":
        this.stats.replaced++;
        return "replace";
      case "Merge":
        return await this.handleMerge(targetPath, agentPath);
      case "Diff":
        return await this.handleDiff(targetPath, agentPath);
      case "Skip":
        this.skipped.push(targetPath);
        this.stats.skipped++;
        return "skip";
      case "Abort":
        return await this.handleAbort();
      default:
        return "skip";
    }
  }

  /**
   * Handle merge action
   */
  private async handleMerge(
    targetPath: string,
    agentPath: string
  ): Promise<ConflictAction> {
    if (!this.editor) {
      console.error("No editor found. Set $EDITOR environment variable.");
      console.log("Falling back to [K]eep or [R]eplace.");
      const choice = await prompt(
        "  [K]eep existing  [R]eplace with agent's",
        ["Keep", "Replace"]
      );
      return choice === "Keep" ? "keep" : "replace";
    }

    // Create temp file with conflict markers
    const existing = readFileSync(targetPath, "utf-8");
    const agent = readFileSync(agentPath, "utf-8");
    const tempFile = join(tmpdir(), `merge-${basename(targetPath)}`);

    writeFileSync(
      tempFile,
      createConflictMarkers(existing, agent, this.agentName)
    );

    // Open editor
    console.log(`Opening ${this.editor}...`);
    const result = spawnSync(this.editor, [tempFile], { stdio: "inherit" });

    if (result.error || result.status !== 0) {
      console.error(
        `Editor failed: ${result.error?.message || "Exit code " + result.status}`
      );
      console.log(`Temp file saved at: ${tempFile}`);
      const choice = await prompt(
        "  [R]etry  [K]eep existing  [R]eplace with agent's",
        ["Retry", "Keep", "Replace"]
      );
      if (choice === "Retry") return this.handleMerge(targetPath, agentPath);
      return choice === "Keep" ? "keep" : "replace";
    }

    // Read merged content
    const merged = readFileSync(tempFile, "utf-8");

    // Validate
    if (!merged.trim()) {
      console.log("Empty file - treating as [K]eep existing");
      unlinkSync(tempFile);
      return "keep";
    }

    if (hasConflictMarkers(merged)) {
      console.log("Conflict markers still present. Merge incomplete.");
      const choice = await prompt(
        "  [R]etry  [K]eep existing  [R]eplace with agent's",
        ["Retry", "Keep", "Replace"]
      );
      unlinkSync(tempFile);
      if (choice === "Retry") return this.handleMerge(targetPath, agentPath);
      return choice === "Keep" ? "keep" : "replace";
    }

    // Save merged content
    this.backup.set(targetPath, existing);
    writeFileSync(targetPath, merged);
    unlinkSync(tempFile);
    this.stats.merged++;
    return "merge";
  }

  /**
   * Handle diff action
   */
  private async handleDiff(
    targetPath: string,
    agentPath: string
  ): Promise<ConflictAction> {
    console.log("\nShowing diff...\n");
    spawnSync("git", ["diff", "--no-index", "--color=always", targetPath, agentPath], {
      stdio: "inherit",
    });

    // Re-prompt
    return await this.promptForAction(targetPath, agentPath, "file");
  }

  /**
   * Handle abort action
   */
  private async handleAbort(): Promise<ConflictAction> {
    console.log("\nAbort hire operation?");
    console.log("  [R]ollback all changes made so far");
    console.log("  [K]eep changes, stop processing remaining files");
    console.log("  [C]ancel abort (continue hiring)");

    const choice = await prompt("", ["Rollback", "Keep", "Cancel"]);

    if (choice === "Rollback") {
      await this.rollback();
      return "abort";
    } else if (choice === "Keep") {
      return "abort";
    } else {
      // Cancel abort, continue
      return await this.promptForAction("", "", "file");
    }
  }

  /**
   * Rollback all changes
   */
  async rollback(): Promise<void> {
    console.log("Rolling back changes...");

    // Restore backed-up files
    for (const [path, content] of this.backup) {
      writeFileSync(path, content);
      console.log(`  Restored: ${path}`);
    }

    // Remove newly copied files
    for (const path of this.newFiles) {
      if (existsSync(path)) {
        unlinkSync(path);
        console.log(`  Removed: ${path}`);
      }
    }
  }

  /**
   * Show summary of hire operation
   */
  showSummary(): void {
    console.log("\nHire complete!");
    console.log("");
    if (this.stats.copied > 0) console.log(`Copied: ${this.stats.copied} files`);
    if (this.stats.replaced > 0) console.log(`Replaced: ${this.stats.replaced} files`);
    if (this.stats.merged > 0) console.log(`Merged: ${this.stats.merged} files`);
    if (this.skipped.length > 0) {
      console.log(`Skipped: ${this.skipped.length} files`);
      this.skipped.forEach((path) => console.log(`  - ${path}`));
      console.log("");
      console.log(
        `Tip: Run 'npx agent-hub hire ${this.agentName} --retry-skipped' to handle skipped files`
      );
    }
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors

**Step 3: Commit ConflictResolver class**

```bash
git add src/cli/conflict-resolver.ts
git commit -m "feat: add ConflictResolver class

Interactive conflict resolution with K/R/M/D/S/A options.
Includes rollback and summary capabilities.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Integrate ConflictResolver into hire.ts

**Files:**
- Modify: `src/cli/commands/hire.ts`

**Step 1: Add imports and flag parsing**

At top of hire.ts, add:

```typescript
import { ConflictResolver } from "../conflict-resolver.js";
```

In parseArgs options, add:

```typescript
const { values, positionals } = parseArgs({
  args,
  options: {
    global: { type: "boolean", short: "g" },
    "dry-run": { type: "boolean" },
    "force-keep": { type: "boolean" },
    "force-replace": { type: "boolean" },
  },
  allowPositionals: true,
});
```

**Step 2: Create ConflictResolver instance**

After agent existence check, add:

```typescript
// Determine force mode
let forceMode: "keep" | "replace" | undefined;
if (values["force-keep"]) forceMode = "keep";
if (values["force-replace"]) forceMode = "replace";

// Create conflict resolver
const resolver = new ConflictResolver(
  name,
  !!values["dry-run"],
  forceMode
);
```

**Step 3: Replace copyFileSync calls with resolver.handleConflict**

Find the copyConfigFiles function (around line 51) and modify:

```typescript
function copyConfigFiles(files: string[], targetDir: string, resolver: ConflictResolver): Promise<number> {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  let copied = 0;
  for (const file of files) {
    const targetPath = join(targetDir, basename(file));
    if (!existsSync(targetPath)) {
      copyFileSync(file, targetPath);
      copied++;
    } else {
      // File exists - use resolver
      const action = await resolver.handleConflict(targetPath, file, "file");
      if (action === "replace" || action === "merge") {
        if (action === "replace") {
          copyFileSync(file, targetPath);
        }
        // merge already handled in resolver
        copied++;
      } else if (action === "abort") {
        throw new Error("Hire aborted by user");
      }
      // keep and skip don't copy
    }
  }
  return copied;
}
```

Make function async: `async function copyConfigFiles(...)`

**Step 4: Update function signature to accept resolver**

Similarly update copySkillFiles and copyClaudeMdFromMaster functions.

**Step 5: Add resolver.showSummary() call**

At the end of hireCommand, before the final messages:

```typescript
// Show summary
resolver.showSummary();
```

**Step 6: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors (may have some type issues to fix)

**Step 7: Commit integration**

```bash
git add src/cli/commands/hire.ts
git commit -m "feat: integrate ConflictResolver into hire command

Replaced silent-skip with interactive prompts.
Added --dry-run, --force-keep, --force-replace flags.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Add Dry-Run Output

**Files:**
- Modify: `src/cli/conflict-resolver.ts`

**Step 1: Add dry-run tracking**

In ConflictResolver class, add:

```typescript
private dryRunConflicts: string[] = [];
private dryRunAutoMerge: string[] = [];
private dryRunNewFiles: string[] = [];

/**
 * Track dry-run conflict
 */
trackDryRunConflict(path: string, type: "file" | "skill-dir"): void {
  this.dryRunConflicts.push(`${path} (${type})`);
}

/**
 * Track dry-run auto-merge
 */
trackDryRunAutoMerge(path: string): void {
  this.dryRunAutoMerge.push(path);
}

/**
 * Track dry-run new file
 */
trackDryRunNewFile(path: string): void {
  this.dryRunNewFiles.push(path);
}

/**
 * Show dry-run summary
 */
showDryRunSummary(): void {
  console.log("Dry run - no changes will be made\n");

  if (this.dryRunConflicts.length > 0) {
    console.log("Would conflict:");
    this.dryRunConflicts.forEach((c) => console.log(`  ${c}`));
    console.log("");
  }

  if (this.dryRunAutoMerge.length > 0) {
    console.log("Would auto-merge:");
    this.dryRunAutoMerge.forEach((c) => console.log(`  ${c}`));
    console.log("");
  }

  if (this.dryRunNewFiles.length > 0) {
    console.log("Would copy:");
    console.log(`  ${this.dryRunNewFiles.length} new files`);
  }
}
```

**Step 2: Update handleConflict for dry-run**

Modify handleConflict method:

```typescript
async handleConflict(
  targetPath: string,
  agentPath: string,
  type: "file" | "skill-dir"
): Promise<ConflictAction> {
  if (this.isDryRun) {
    this.trackDryRunConflict(targetPath, type);
    return "skip";
  }
  // ... rest of method
}
```

**Step 3: Update hire.ts to call showDryRunSummary**

In hire.ts, at the end:

```typescript
if (values["dry-run"]) {
  resolver.showDryRunSummary();
  return;
}

resolver.showSummary();
```

**Step 4: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors

**Step 5: Commit dry-run feature**

```bash
git add src/cli/conflict-resolver.ts src/cli/commands/hire.ts
git commit -m "feat: add dry-run output for hire command

Shows what would conflict/merge/copy without making changes.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Manual Testing & Bug Fixes

**Step 1: Build the project**

```bash
npm run build
```

**Step 2: Test dry-run**

```bash
# Create a test agent first
node dist/index.js create test-agent -s "Testing"

# Try to hire to a project with existing files
cd /path/to/test-project
node /path/to/agent-hub/dist/index.js hire test-agent --dry-run
```

Expected: Shows conflicts without prompting

**Step 3: Test interactive mode**

```bash
node /path/to/agent-hub/dist/index.js hire test-agent
# Should prompt for conflicts
# Test each option: K, R, M, D, S, A
```

**Step 4: Test force modes**

```bash
node /path/to/agent-hub/dist/index.js hire test-agent --force-keep
node /path/to/agent-hub/dist/index.js hire test-agent --force-replace
```

**Step 5: Fix any bugs found**

Fix TypeScript errors, runtime errors, or UX issues.

**Step 6: Commit bug fixes**

```bash
git add -A
git commit -m "fix: resolve issues found in manual testing

[describe specific fixes]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Update Documentation

**Files:**
- Create: `docs/cli/hire.md`
- Modify: `docs/getting-started/first-agent.md`
- Modify: `docs/configuration/skills.md`
- Modify: `docs/commands/index.md`
- Modify: `README.md`

**Step 1: Create docs/cli/hire.md**

```markdown
# Hire Command

Deploy an agent to a project by copying configuration and setting up memory.

## Basic Usage

```bash
npx agent-hub hire <agent-name>
```

## Handling Conflicts

When hiring an agent to a project with existing files, you'll be prompted for each conflict.

### Interactive Prompts

When a file already exists, you'll see:

```
Conflict: CLAUDE.md already exists
  [K]eep existing    [R]eplace with agent's
  [M]erge in editor  [D]iff first
  [S]kip for now     [A]bort hire
Choice:
```

**Options:**
- **[K]eep** - Keep your current file, don't change it
- **[R]eplace** - Overwrite with agent's version
- **[M]erge** - Open in your $EDITOR with conflict markers to manually merge
- **[D]iff** - View differences first, then decide
- **[S]kip** - Defer decision, continue with other files (listed in summary)
- **[A]bort** - Cancel entire hire operation (with rollback option)

### Special Handling

**Hooks (auto-merge):** Hook configurations are automatically merged - arrays are combined. Only prompts if the exact same hook command already exists.

**Skills (treated as units):** When a skill directory conflicts, you choose to keep or replace the entire skill, not individual files within it.

### Flags

**--dry-run:** Preview what would conflict without making any changes

```bash
npx agent-hub hire alice --dry-run

# Output:
Dry run - no changes will be made

Would conflict:
  .claude/CLAUDE.md (file)
  .claude/skills/custom-skill (skill-dir)

Would auto-merge:
  .claude/hooks/default.json

Would copy:
  3 new files
```

**--force-keep:** Keep all existing files, only copy new ones (no prompts)

```bash
npx agent-hub hire alice --force-keep
```

**--force-replace:** Replace all conflicts with agent's versions (no prompts)

```bash
npx agent-hub hire alice --force-replace
```

**--global, -g:** Add to global settings instead of project

```bash
npx agent-hub hire alice --global
```

## Examples

### Fresh project
```bash
npx agent-hub hire alice
# No conflicts, copies all files
```

### Project with existing config
```bash
npx agent-hub hire alice
# Prompts for each conflict, you choose how to resolve
```

### Preview before hiring
```bash
npx agent-hub hire alice --dry-run
# Shows what would happen, makes no changes
```

### Automated replacement
```bash
npx agent-hub hire alice --force-replace
# Replaces all conflicts, useful for updates
```
```

**Step 2: Update README.md**

Remove mentions of deleted skills (coding-standards, python-patterns, continuous-learning-v2).

**Step 3: Update docs/configuration/skills.md**

Remove sections about deleted skills, add note:

```markdown
## Archived Skills

Some skills have been archived but preserved for reference in `docs/archived-skills/`. These include:

- **continuous-learning-v2** - Automatic instinct learning system (archived 2026-02-04)

Archived skills can be manually copied to agents if needed.
```

**Step 4: Update docs/commands/index.md**

Remove deleted commands, update list to show only extract-session.

**Step 5: Update docs/getting-started/first-agent.md**

Add section about conflict resolution during hire.

**Step 6: Commit documentation**

```bash
git add docs/ README.md
git commit -m "docs: update for cleanup and conflict resolution

- Documented hire command conflict resolution
- Removed references to deleted skills/commands
- Added archived skills section

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 16: Final Build and Verification

**Step 1: Clean build**

```bash
rm -rf dist/
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Verify template files copied correctly**

```bash
ls -la dist/templates/skills/
# Should show: memory-summarization, skill-creator (no deleted skills)

ls -la dist/templates/commands/
# Should show: extract-session.md only
```

**Step 3: Verify hooks/default.json**

```bash
cat dist/templates/hooks/default.json
# Should have only SessionStart and PreCompact memory hooks
```

**Step 4: Verify archived skills**

```bash
ls -la docs/archived-skills/continuous-learning-v2/
# Should have: ARCHIVED.md, skill/, commands/
```

**Step 5: Create final commit**

```bash
git add -A
git commit -m "chore: final build verification

All cleanup and conflict resolution features complete.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

**Phase 1 (Cleanup):**
- [ ] continuous-learning-v2 archived to docs/archived-skills/
- [ ] coding-standards and python-patterns deleted
- [ ] suggest-compact deleted
- [ ] 8 commands deleted, extract-session.md remains
- [ ] hooks/default.json cleaned (only memory hooks)
- [ ] No broken references in codebase
- [ ] Documentation updated

**Phase 2 (Conflict Resolution):**
- [ ] ConflictResolver class implemented
- [ ] All prompt options working (K/R/M/D/S/A)
- [ ] Hooks auto-merge working
- [ ] Skill directory handling working
- [ ] All flags working (--dry-run, --force-keep, --force-replace)
- [ ] Rollback on abort working
- [ ] Summary display working
- [ ] Manual testing passed

**Build:**
- [ ] TypeScript compiles with no errors
- [ ] Templates copied to dist/ correctly
- [ ] npm run build succeeds

---

## Notes

- **Async changes:** Many functions will need to become async to support interactive prompts
- **Error handling:** Add try-catch around file operations
- **Cross-platform:** Test on Windows (readline, file paths, git diff)
- **Edge cases:** Empty files, missing $EDITOR, invalid JSON after merge
- **Type safety:** Ensure all TypeScript types are correct

---

## Execution Strategy

This plan is designed for task-by-task execution with frequent commits. Each task should:
1. Be completable in 5-10 minutes
2. Result in a single, atomic commit
3. Leave the codebase in a working state
4. Be testable independently

Use @superpowers:executing-plans or @superpowers:subagent-driven-development to execute this plan.
