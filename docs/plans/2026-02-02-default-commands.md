# Default Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add default commands from everything-claude-code as templates, replacing the _example.md pattern with actual useful command files.

**Architecture:** Commands are copied from `src/templates/` to agent master on create, then to project on hire. Replace _example.md generation with directory copying.

**Tech Stack:** TypeScript, Node.js

---

## Task 1: Copy Commands from everything-claude-code

**Files:**
- Create: `src/templates/commands/` (25 files)

**Step 1: Create directory and copy files**

```bash
mkdir -p src/templates/commands
```

Copy all 25 files from `D:/Codebase/everything-claude-code/commands/` to `src/templates/commands/`:
- build-fix.md
- checkpoint.md
- code-review.md
- e2e.md
- eval.md
- evolve.md
- go-build.md
- go-review.md
- go-test.md
- instinct-export.md
- instinct-import.md
- instinct-status.md
- learn.md
- orchestrate.md
- plan.md
- python-review.md
- refactor-clean.md
- setup-pm.md
- skill-create.md
- tdd.md
- test-coverage.md
- update-codemaps.md
- update-docs.md
- verify.md

**Step 2: Commit**

```bash
git add src/templates/commands/
git commit -m "feat: add default commands from everything-claude-code"
```

---

## Task 2: Update templates.ts to Copy Commands Directory

**Files:**
- Modify: `src/agent/templates.ts`

**Step 1: Replace commands/_example.md creation with directory copying**

Find and replace the commands section:

```typescript
  // Create commands/_example.md
  const commandPath = join(getCommandsDir(agentName), "_example.md");
  if (!existsSync(commandPath)) {
    writeFileSync(commandPath, getDefaultCommandTemplate(agentName));
  }
```

With:

```typescript
  // Copy default commands from templates
  const commandsTemplateDir = getPackageTemplatePath("commands");
  const commandsDestDir = getCommandsDir(agentName);
  if (existsSync(commandsTemplateDir)) {
    const commandFiles = readdirSync(commandsTemplateDir).filter(f => f.endsWith(".md"));
    for (const file of commandFiles) {
      const destPath = join(commandsDestDir, file);
      if (!existsSync(destPath)) {
        copyFileSync(join(commandsTemplateDir, file), destPath);
      }
    }
  }
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/agent/templates.ts
git commit -m "feat: copy default commands on agent create"
```

---

## Task 3: Clean Up Unused Template Function

**Files:**
- Modify: `src/agent/templates.ts`

**Step 1: Remove unused template function**

Remove the `getDefaultCommandTemplate(agentName: string)` function (no longer used).

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/agent/templates.ts
git commit -m "refactor: remove unused getDefaultCommandTemplate function"
```

---

## Task 4: Test Full Flow

**Step 1: Build**

Run: `npm run build`

**Step 2: Delete existing test agent**

Run: `echo "yes" | npx agent-hub delete test-commands-agent 2>/dev/null; true`

**Step 3: Create new agent**

Run: `npx agent-hub create test-commands-agent`

**Step 4: Verify commands copied to master**

Run: `ls ~/.agent-hub/agents/test-commands-agent/commands/`
Expected: 25 command files

**Step 5: Test hire**

Run: `mkdir -p /tmp/test-commands && cd /tmp/test-commands && npx agent-hub hire test-commands-agent`

**Step 6: Verify commands copied to project**

Run: `ls /tmp/test-commands/.claude/commands/`
Expected: 25 command files

**Step 7: Clean up**

Run: `rm -rf /tmp/test-commands && echo "yes" | npx agent-hub delete test-commands-agent`

---

## Summary

After completion:
- 25 default commands from everything-claude-code
- Commands copied on `agent create` (to master)
- Commands copied on `hire` (to project via existing copyConfigFiles)
- Removed _example.md pattern for commands
- Cleaned up unused template function
