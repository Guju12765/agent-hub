# Cleanup Dead Commands Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove dead commands and update commands that reference Python scripts to use Node.js.

**Architecture:** Delete unused command files, update instinct commands to reference instinct-cli.js instead of instinct-cli.py.

**Tech Stack:** Markdown

---

## Task 1: Delete Dead Commands

**Files:**
- Delete: `src/templates/commands/learn.md` (references v1 learned skills)
- Delete: `src/templates/commands/setup-pm.md` (references deleted package-manager.js)

**Step 1: Delete files**

```bash
rm src/templates/commands/learn.md
rm src/templates/commands/setup-pm.md
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: remove dead commands (learn.md, setup-pm.md)"
```

---

## Task 2: Update instinct-status.md to Use Node.js

**Files:**
- Modify: `src/templates/commands/instinct-status.md`

**Step 1: Replace python3 with node**

Change all occurrences of:
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" status
```

To:
```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.js" status
```

And:
```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py status
```

To:
```bash
node ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.js status
```

**Step 2: Commit**

```bash
git add src/templates/commands/instinct-status.md
git commit -m "fix: update instinct-status.md to use Node.js CLI"
```

---

## Task 3: Update instinct-import.md to Use Node.js

**Files:**
- Modify: `src/templates/commands/instinct-import.md`

**Step 1: Replace python3 with node**

Change all occurrences of:
- `python3 ... instinct-cli.py` → `node ... instinct-cli.js`

**Step 2: Commit**

```bash
git add src/templates/commands/instinct-import.md
git commit -m "fix: update instinct-import.md to use Node.js CLI"
```

---

## Task 4: Update evolve.md to Use Node.js

**Files:**
- Modify: `src/templates/commands/evolve.md`

**Step 1: Replace python3 with node**

Change all occurrences of:
- `python3 ... instinct-cli.py` → `node ... instinct-cli.js`

**Step 2: Commit**

```bash
git add src/templates/commands/evolve.md
git commit -m "fix: update evolve.md to use Node.js CLI"
```

---

## Task 5: Build and Verify

**Step 1: Build**

```bash
npm run build
```

**Step 2: Verify commands in dist**

```bash
ls dist/templates/commands/
```

Expected: No learn.md or setup-pm.md

**Step 3: Verify Node.js references**

```bash
grep -l "instinct-cli.js" dist/templates/commands/*.md
```

Expected: evolve.md, instinct-status.md, instinct-import.md

```bash
grep -l "instinct-cli.py" dist/templates/commands/*.md
```

Expected: No matches (no Python references)

---

## Summary

After completion:
- Removed: learn.md (v1 deprecated), setup-pm.md (script deleted)
- Updated: evolve.md, instinct-status.md, instinct-import.md to use Node.js
- All instinct commands now reference instinct-cli.js
