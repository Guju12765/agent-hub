# Agent Hub Cleanup & Interactive Conflict Resolution

**Date:** 2026-02-04
**Status:** Design Complete
**Goal:** Clean up templates and add interactive conflict resolution to hire command

---

## Overview

This design covers two major areas:

1. **Template Cleanup** - Archive continuous-learning-v2 system, delete unused skills and commands
2. **Interactive Conflict Resolution** - Transform hire command from silent-skip to interactive prompts

---

## 1. Template Cleanup Tasks

### 1.1 Archive continuous-learning-v2 System

**What to archive:**
- Skill: `src/templates/skills/continuous-learning-v2/`
- Commands: `evolve.md`, `instinct-export.md`, `instinct-import.md`, `instinct-status.md`
- Hook references in `src/templates/hooks/default.json` (lines 9, 45, 55)

**Archive location:** `docs/archived-skills/continuous-learning-v2/`

**Archive structure:**
```
docs/archived-skills/
├── README.md (explains archival policy)
└── continuous-learning-v2/
    ├── ARCHIVED.md (why archived, date, alternatives)
    ├── skill/
    │   ├── SKILL.md
    │   ├── config.json
    │   ├── hooks/observe.js
    │   ├── agents/observer.md, start-observer.js
    │   └── scripts/instinct-cli.js
    └── commands/
        ├── evolve.md
        ├── instinct-export.md
        ├── instinct-import.md
        └── instinct-status.md
```

**ARCHIVED.md template:**
```markdown
# Continuous Learning v2 - Archived

**Archived on:** 2026-02-04
**Reason:** System complexity vs. adoption trade-off

## What it was
Automatic instinct learning and clustering system with observer daemon,
session observation hooks, and evolution capabilities.

## Why archived
- Removed from template defaults to simplify base agent setup
- High complexity for questionable value-add in most use cases
- Alternative: Manual memory management with extract-session skill

## Migration
Existing agents with this skill can continue using it. New agents won't
include it by default.
```

### 1.2 Delete Skills Completely

**Skills to delete:**
- `src/templates/skills/coding-standards/`
- `src/templates/skills/python-patterns/`

**Rationale:** No references found in agents, rules, hooks, or other skills.

### 1.3 Delete suggest-compact System

**Files to delete:**
- `src/templates/scripts/hooks/suggest-compact.js`
- Hook reference in `default.json` line 37 (PreToolUse hook)

**Rationale:** Replaced by manual compaction workflow.

### 1.4 Delete Commands (Keep Only extract-session.md)

**Commands to delete:**
- `build-fix.md`
- `checkpoint.md`
- `code-review.md`
- `orchestrate.md`
- `plan.md`
- `tdd.md`
- `test-coverage.md`
- `verify.md`

**Command to keep:**
- `extract-session.md`

**Verification:** No references found in agents, skills, rules, or hooks.

### 1.5 Update hooks/default.json

**Final state after cleanup:**
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

**Removed:**
- SessionStart: continuous-learning observer start (lines 4-12)
- PreToolUse: suggest-compact hook (lines 32-40)
- PreToolUse: continuous-learning observe (lines 41-49)
- PostToolUse: continuous-learning observe (lines 51-58)

---

## 2. Interactive Conflict Resolution

### 2.1 Current vs New Behavior

**Current behavior:**
```
File exists? → Skip silently
```

**New behavior:**
```
File exists?
  → Show conflict prompt [K/R/M/D/S/A]
  → Handle based on user choice
  → Continue to next file
  → Show summary of skipped files at end
```

### 2.2 Architecture

**New module:** `src/cli/conflict-resolver.ts`

**Core class:**
```typescript
class ConflictResolver {
  private skipped: string[] = [];
  private backup: Map<string, string> = new Map();
  private newFiles: string[] = [];
  private editor: string;

  constructor(
    private agentName: string,
    private isDryRun: boolean = false,
    private forceMode?: 'keep' | 'replace'
  ) {
    this.editor = this.detectEditor();
  }

  async handleConflict(
    targetPath: string,
    agentPath: string,
    type: 'file' | 'skill-dir'
  ): Promise<'keep' | 'replace' | 'merge' | 'skip' | 'abort'>

  async showSummary(): Promise<void>

  async rollback(): Promise<void>
}
```

**Editor detection priority:**
```typescript
detectEditor(): string {
  return process.env.EDITOR
    || process.env.VISUAL
    || (platform === 'win32' ? 'notepad' : 'vim')
    || (existsSync('/usr/bin/nano') ? 'nano' : null)
    || throw new Error('No editor found');
}
```

### 2.3 Prompt Options

**[K]eep existing** - Skip this file, keep what's already there
**[R]eplace** - Overwrite with agent's version
**[M]erge** - Open in editor with conflict markers
**[D]iff** - Show diff, then re-prompt
**[S]kip** - Defer decision, continue with other files
**[A]bort** - Cancel entire hire operation

### 2.4 Conflict Marker Format (Side-by-Side)

```markdown
# ============================================
# CONFLICT: Choose one or combine both
# ============================================

# --- YOUR VERSION ---
...existing content...

# --- AGENT VERSION (alice) ---
...agent's content...

# ============================================
# Delete markers and unwanted sections above
# ============================================
```

### 2.5 Interaction Flow

**Basic conflict:**
```
Conflict: .claude/CLAUDE.md already exists
  [K]eep existing    [R]eplace with agent's
  [M]erge in editor  [D]iff first
  [S]kip for now     [A]bort hire
Choice:
```

**Diff workflow:**
```bash
# Show diff using git diff --no-index
git diff --no-index --color=always \
  .claude/CLAUDE.md \
  ~/.agent-hub/agents/alice/CLAUDE.md

# Then re-prompt
Conflict: .claude/CLAUDE.md
  [K]eep  [R]eplace  [M]erge  [S]kip  [A]bort
Choice:
```

**Merge workflow:**
1. Create temp file with conflict markers
2. Open in $EDITOR, wait for close
3. Validate result (check for remaining markers)
4. If markers still present: "Merge incomplete. [R]etry [K]eep [R]eplace?"
5. If empty file: Treat as [K]eep
6. Otherwise: Save merged content

**Abort confirmation:**
```
Abort hire operation?
  [R]ollback all changes made so far
  [K]eep changes, stop processing remaining files
  [C]ancel abort (continue hiring)
Choice:
```

**Final summary:**
```
Hire complete!

Copied: 3 skills, 2 commands
Replaced: 1 rule
Merged: CLAUDE.md
Skipped: 2 files
  - .claude/skills/custom-skill.md
  - .claude/hooks/custom-hook.json

Tip: Run 'npx agent-hub hire alice --retry-skipped' to handle skipped files
```

### 2.6 Special Handling

#### Hooks JSON Auto-Merge

**Logic:**
```typescript
function mergeHooks(existing: HooksConfig, agent: HooksConfig): HooksConfig {
  const merged = { ...existing };

  for (const [event, agentHooks] of Object.entries(agent)) {
    if (!merged[event]) {
      // New event type - just add it
      merged[event] = agentHooks;
    } else {
      // Event exists - merge hook arrays
      const existingHooks = Array.isArray(merged[event]) ? merged[event] : [merged[event]];
      const newHooks = Array.isArray(agentHooks) ? agentHooks : [agentHooks];

      // Check for duplicate hook commands/files
      const existingCommands = new Set(existingHooks.map(h => h.hooks[0].command));
      const uniqueNew = newHooks.filter(h =>
        !existingCommands.has(h.hooks[0].command)
      );

      merged[event] = [...existingHooks, ...uniqueNew];
    }
  }

  return merged;
}
```

**Only prompts if:** Same hook command/file already exists for the same event.

#### Skill Directory Handling

When conflict is a skill directory:
1. Check if SKILL.md differs
2. If identical → silent skip
3. If different → prompt with unit options:
   - **[K]eep:** Keep entire existing skill directory
   - **[R]eplace:** Replace entire directory
   - **[D]iff:** Show diff of SKILL.md only, then re-prompt
   - **[M]erge:** Open SKILL.md in editor (directory structure from agent wins)

### 2.7 Command-Line Flags

**--dry-run:**
```bash
npx agent-hub hire alice --dry-run

# Output:
Dry run - no changes will be made

Would conflict:
  .claude/CLAUDE.md (file)
  .claude/skills/coding-standards (skill-dir)

Would auto-merge:
  .claude/hooks/default.json

Would copy:
  3 new skills, 2 new commands, 1 new rule
```

**--force-keep:**
```bash
npx agent-hub hire alice --force-keep
# Skip all conflicts, keep existing files
```

**--force-replace:**
```bash
npx agent-hub hire alice --force-replace
# Replace all conflicts with agent's version
```

### 2.8 Error Handling

#### Editor Not Found
```typescript
if (!this.editor) {
  console.error('No editor found. Set $EDITOR environment variable.');
  console.log('Falling back to [K]eep or [R]eplace options.');
  // Re-prompt without [M]erge option
  return await this.promptSimple(targetPath, agentPath);
}
```

#### Editor Crashes
```typescript
const result = spawnSync(this.editor, [tempFile], { stdio: 'inherit' });

if (result.error || result.status !== 0) {
  console.error(`Editor failed: ${result.error?.message || 'Exit code ' + result.status}`);
  console.log(`Temp file saved at: ${tempFile}`);
  console.log('Options:');
  console.log('  [R]etry merge (open editor again)');
  console.log('  [K]eep existing file');
  console.log('  [R]eplace with agent version');
  // Await user choice
}
```

#### Incomplete Merge
```typescript
const merged = readFileSync(tempFile, 'utf-8');

if (!merged.trim()) {
  console.log('Empty file - treating as [K]eep existing');
  return 'keep';
}

if (merged.includes('# --- YOUR VERSION ---')) {
  console.log('Conflict markers still present. Merge incomplete.');
  console.log('[R]etry  [K]eep existing  [R]eplace with agent\'s');
  // Await choice
}
```

#### Rollback Implementation
```typescript
class ConflictResolver {
  private backup: Map<string, string> = new Map();
  private newFiles: string[] = [];

  async handleConflict(...): Promise<Action> {
    // Before any destructive operation
    if (action === 'replace' || action === 'merge') {
      this.backup.set(targetPath, readFileSync(targetPath, 'utf-8'));
    }

    // Perform operation...
    if (action === 'replace' || action === 'merge') {
      // Track newly created file if it didn't exist
      if (!existsSync(targetPath)) {
        this.newFiles.push(targetPath);
      }
    }
  }

  async rollback(): Promise<void> {
    console.log('Rolling back changes...');

    // Restore backed-up files
    for (const [path, content] of this.backup) {
      writeFileSync(path, content);
      console.log(`  Restored: ${path}`);
    }

    // Remove newly copied files
    for (const path of this.newFiles) {
      unlinkSync(path);
      console.log(`  Removed: ${path}`);
    }
  }
}
```

### 2.9 Validation

**Before starting:**
- Check agent exists
- Check target directory is writable
- Validate $EDITOR if merge might be needed (only warn, don't fail)

**During operations:**
- Validate JSON after hooks merge
- Check file permissions before write
- Verify paths are within .claude/ directory (security check)

**After merge:**
- Check for remaining conflict markers
- Validate file is not empty (unless intentional)

---

## 3. Implementation Changes

### 3.1 Files to Modify

**`src/cli/commands/hire.ts`:**
- Import ConflictResolver
- Replace direct `copyFileSync` calls with `resolver.handleConflict()`
- Add flag parsing for --dry-run, --force-keep, --force-replace
- Call `resolver.showSummary()` at end

**`src/templates/hooks/default.json`:**
- Remove continuous-learning-v2 references
- Remove suggest-compact reference
- Keep only memory reminders

### 3.2 Files to Create

**`src/cli/conflict-resolver.ts`:**
- ConflictResolver class
- Helper functions for conflict markers, diff display, hooks merge
- Editor detection and validation
- Rollback logic

**`docs/archived-skills/README.md`:**
- Explain archival policy
- List archived skills with dates and reasons

**`docs/archived-skills/continuous-learning-v2/ARCHIVED.md`:**
- Document why archived
- Provide alternatives
- Migration path

**`docs/cli/hire.md` (or update existing):**
- Document new interactive conflict resolution
- Explain all prompt options
- Document flags

### 3.3 Files to Delete

**Skills:**
- `src/templates/skills/coding-standards/`
- `src/templates/skills/python-patterns/`

**Commands:**
- `src/templates/commands/build-fix.md`
- `src/templates/commands/checkpoint.md`
- `src/templates/commands/code-review.md`
- `src/templates/commands/orchestrate.md`
- `src/templates/commands/plan.md`
- `src/templates/commands/tdd.md`
- `src/templates/commands/test-coverage.md`
- `src/templates/commands/verify.md`

**Scripts:**
- `src/templates/scripts/hooks/suggest-compact.js`

### 3.4 Files to Archive (Move)

**From `src/templates/` to `docs/archived-skills/continuous-learning-v2/`:**
- `skills/continuous-learning-v2/` → `skill/`
- `commands/evolve.md` → `commands/`
- `commands/instinct-export.md` → `commands/`
- `commands/instinct-import.md` → `commands/`
- `commands/instinct-status.md` → `commands/`

---

## 4. Testing Strategy

### 4.1 Unit Tests

**`src/cli/conflict-resolver.test.ts`:**
- ConflictResolver class methods
- Hooks auto-merge logic
- Conflict marker generation
- Editor detection fallbacks
- Rollback functionality

### 4.2 Integration Tests

**`tests/hire-conflicts.test.ts`:**
- Simulate conflicts with mock file system
- Test each prompt option (K/R/M/D/S/A)
- Verify rollback works correctly
- Test --dry-run, --force-keep, --force-replace flags
- Test hooks auto-merge scenarios
- Test skill directory handling

### 4.3 Manual Testing Scenarios

```bash
# 1. Fresh project (no conflicts)
npx agent-hub hire alice

# 2. Existing files (trigger conflicts)
# Pre-populate .claude/ with files, then hire

# 3. Dry run
npx agent-hub hire alice --dry-run

# 4. Force modes
npx agent-hub hire alice --force-keep
npx agent-hub hire alice --force-replace

# 5. Abort and rollback
# Start hire, make changes, abort with rollback option

# 6. Merge workflow
# Create conflict, choose [M]erge, edit in editor, save

# 7. Diff workflow
# Create conflict, choose [D]iff, view diff, then choose action
```

---

## 5. Documentation Updates

### 5.1 Files to Update

**README.md:**
- Update skill list (remove archived/deleted)
- Note about interactive conflict resolution

**docs/configuration/skills.md:**
- Remove coding-standards, python-patterns, continuous-learning-v2
- Add note about archived skills

**docs/commands/index.md:**
- Update command list (only extract-session remains)
- Note about archived commands

**docs/getting-started/first-agent.md:**
- Update examples if they reference removed skills
- Add section about conflict handling during hire

**docs/plans/ (various files):**
- Update references to removed skills/commands in historical plans

### 5.2 New Documentation

**docs/cli/hire.md:**
```markdown
# Hire Command

## Basic Usage
npx agent-hub hire <agent-name>

## Handling Conflicts

When hiring an agent to a project with existing files, you'll be prompted
for each conflict.

### Interactive Prompts

- [K]eep existing - Keep your current file
- [R]eplace - Use agent's version
- [M]erge - Open in editor with conflict markers
- [D]iff - View differences first
- [S]kip - Defer decision
- [A]bort - Cancel hire (with rollback option)

### Special Handling

**Hooks:** Automatically merged (combined arrays)
**Skills:** Treated as single units
**Files:** Individual handling

### Flags

--dry-run          Preview conflicts without prompting
--force-keep       Keep all existing files
--force-replace    Replace all with agent's versions
```

**docs/archived-skills/README.md:**
```markdown
# Archived Skills

This directory contains skills that have been archived but preserved for reference.

## Why Archive vs Delete?

- Delete: No value, no references, cleanly removable
- Archive: Had value but removed from defaults for simplification

## Archived Skills

### continuous-learning-v2 (2026-02-04)
Automatic instinct learning system. Archived due to complexity vs. adoption.
Alternative: Manual memory with extract-session.

See: `continuous-learning-v2/ARCHIVED.md`
```

---

## 6. Migration Path

### 6.1 For Existing Agents

**No breaking changes:**
- Agents already created keep all their skills/commands
- Existing .claude/ directories unaffected
- Archive is for reference, not a forced migration

### 6.2 For Users Updating agent-hub

```bash
# After npm update agent-hub
npm install -g agent-hub@latest

# Existing projects are unaffected
# Only new 'hire' operations use new templates

# Optional: Re-hire to use new conflict resolution
cd my-project
npx agent-hub hire my-agent
# Will prompt for conflicts, allowing updates
```

### 6.3 Backward Compatibility

- Old agents work unchanged
- New hire behavior is opt-in (only triggered by conflicts)
- --force-keep flag replicates old silent-skip behavior

---

## 7. Success Criteria

**Cleanup:**
- [ ] continuous-learning-v2 system archived with ARCHIVED.md
- [ ] coding-standards and python-patterns deleted
- [ ] suggest-compact deleted
- [ ] 8 commands deleted, extract-session.md remains
- [ ] hooks/default.json cleaned up
- [ ] Documentation updated
- [ ] No broken references

**Conflict Resolution:**
- [ ] ConflictResolver class implemented
- [ ] All prompt options (K/R/M/D/S/A) working
- [ ] Hooks auto-merge working
- [ ] Skill directory handling working
- [ ] All 3 flags working (--dry-run, --force-keep, --force-replace)
- [ ] Rollback on abort working
- [ ] Error handling comprehensive
- [ ] Tests passing (unit + integration)
- [ ] Documentation complete

---

## 8. Timeline

**Phase 1: Cleanup (Low Risk)**
- Archive continuous-learning-v2
- Delete skills and commands
- Update hooks/default.json
- Update documentation

**Phase 2: Conflict Resolution (Higher Complexity)**
- Implement ConflictResolver class
- Refactor hire.ts
- Add tests
- Manual testing
- Documentation

**Phase 3: Polish**
- Edge case handling
- Error message improvements
- Documentation refinements

---

## Appendix: Design Decisions

### Why Archive vs Delete continuous-learning-v2?

**Decision:** Archive
**Rationale:**
- System has value for specific use cases
- Significant effort went into development
- Users might want to reference or restore it
- Deletion is irreversible, archival is safe

### Why Side-by-Side Conflict Markers vs Git-Style?

**Decision:** Side-by-side with clear labels
**Rationale:**
- More readable for non-git users
- Clear instructions ("delete markers and unwanted sections")
- Less cryptic than <<<< ==== >>>>
- Git-style assumes familiarity with git conflicts

### Why Auto-Merge Hooks?

**Decision:** Automatically merge hook arrays
**Rationale:**
- Hooks are designed to be composable
- Multiple handlers per event is the normal case
- Reduces prompt fatigue
- Only prompts on actual conflicts (same hook file)

### Why Treat Skills as Units?

**Decision:** Whole directory replace/keep
**Rationale:**
- Skills are cohesive packages
- Partial replacement could break functionality
- Simpler UX (one decision per skill)
- Diff on SKILL.md provides enough information

### Why --force-keep Instead of --yes?

**Decision:** Explicit flag names
**Rationale:**
- --yes is ambiguous (yes to what?)
- --force-keep/--force-replace are self-documenting
- Prevents accidental data loss from misunderstood flags
