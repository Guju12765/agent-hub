# Default Rules and Agents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add default rules and agents from everything-claude-code as templates, replacing the _example.md pattern with actual useful files.

**Architecture:** Rules and agents are copied from `src/templates/` to agent master on create, then to project on hire. Replace _example.md generation with directory copying.

**Tech Stack:** TypeScript, Node.js

---

## Task 1: Copy Rules from everything-claude-code

**Files:**
- Create: `src/templates/rules/agents.md`
- Create: `src/templates/rules/coding-style.md`
- Create: `src/templates/rules/git-workflow.md`
- Create: `src/templates/rules/hooks.md`
- Create: `src/templates/rules/patterns.md`
- Create: `src/templates/rules/performance.md`
- Create: `src/templates/rules/security.md`
- Create: `src/templates/rules/testing.md`

**Step 1: Create directory and copy files**

```bash
mkdir -p src/templates/rules
```

Copy all 8 files from `D:/Codebase/everything-claude-code/rules/` to `src/templates/rules/`

**Step 2: Commit**

```bash
git add src/templates/rules/
git commit -m "feat: add default rules from everything-claude-code"
```

---

## Task 2: Copy Agents from everything-claude-code

**Files:**
- Create: `src/templates/agents/architect.md`
- Create: `src/templates/agents/build-error-resolver.md`
- Create: `src/templates/agents/code-reviewer.md`
- Create: `src/templates/agents/database-reviewer.md`
- Create: `src/templates/agents/doc-updater.md`
- Create: `src/templates/agents/e2e-runner.md`
- Create: `src/templates/agents/go-build-resolver.md`
- Create: `src/templates/agents/go-reviewer.md`
- Create: `src/templates/agents/planner.md`
- Create: `src/templates/agents/python-reviewer.md`
- Create: `src/templates/agents/refactor-cleaner.md`
- Create: `src/templates/agents/security-reviewer.md`
- Create: `src/templates/agents/tdd-guide.md`

**Step 1: Create directory and copy files**

```bash
mkdir -p src/templates/agents
```

Copy all 13 files from `D:/Codebase/everything-claude-code/agents/` to `src/templates/agents/`

**Step 2: Commit**

```bash
git add src/templates/agents/
git commit -m "feat: add default agents from everything-claude-code"
```

---

## Task 3: Update templates.ts to Copy Rules Directory

**Files:**
- Modify: `src/agent/templates.ts`

**Step 1: Replace rules/_example.md creation with directory copying**

Find and replace the rules section:

```typescript
  // Create rules/_example.md
  const rulePath = join(getRulesDir(agentName), "_example.md");
  if (!existsSync(rulePath)) {
    writeFileSync(rulePath, getDefaultRuleTemplate(agentName));
  }
```

With:

```typescript
  // Copy default rules from templates
  const rulesTemplateDir = getPackageTemplatePath("rules");
  const rulesDestDir = getRulesDir(agentName);
  if (existsSync(rulesTemplateDir)) {
    const ruleFiles = readdirSync(rulesTemplateDir).filter(f => f.endsWith(".md"));
    for (const file of ruleFiles) {
      const destPath = join(rulesDestDir, file);
      if (!existsSync(destPath)) {
        copyFileSync(join(rulesTemplateDir, file), destPath);
      }
    }
  }
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/agent/templates.ts
git commit -m "feat: copy default rules on agent create"
```

---

## Task 4: Update templates.ts to Copy Agents Directory

**Files:**
- Modify: `src/agent/templates.ts`

**Step 1: Replace agents/_example.md creation with directory copying**

Find and replace the agents/subagents section:

```typescript
  // Create agents/_example.md
  const subagentPath = join(getSubagentsDir(agentName), "_example.md");
  if (!existsSync(subagentPath)) {
    writeFileSync(subagentPath, getDefaultSubagentTemplate());
  }
```

With:

```typescript
  // Copy default agents from templates
  const agentsTemplateDir = getPackageTemplatePath("agents");
  const agentsDestDir = getSubagentsDir(agentName);
  if (existsSync(agentsTemplateDir)) {
    const agentFiles = readdirSync(agentsTemplateDir).filter(f => f.endsWith(".md"));
    for (const file of agentFiles) {
      const destPath = join(agentsDestDir, file);
      if (!existsSync(destPath)) {
        copyFileSync(join(agentsTemplateDir, file), destPath);
      }
    }
  }
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/agent/templates.ts
git commit -m "feat: copy default agents on agent create"
```

---

## Task 5: Clean Up Unused Template Functions

**Files:**
- Modify: `src/agent/templates.ts`

**Step 1: Remove unused template functions**

The following functions are no longer used and can be removed:
- `getDefaultRuleTemplate(agentName: string)`
- `getDefaultSubagentTemplate()`

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/agent/templates.ts
git commit -m "refactor: remove unused template functions"
```

---

## Task 6: Test Full Flow

**Step 1: Build**

Run: `npm run build`

**Step 2: Delete existing test agent**

Run: `echo "yes" | npx agent-hub delete test-rules-agent 2>/dev/null; true`

**Step 3: Create new agent**

Run: `npx agent-hub create test-rules-agent`

**Step 4: Verify rules copied to master**

Run: `ls ~/.agent-hub/agents/test-rules-agent/rules/`
Expected: 8 rule files (agents.md, coding-style.md, etc.)

**Step 5: Verify agents copied to master**

Run: `ls ~/.agent-hub/agents/test-rules-agent/agents/`
Expected: 13 agent files (architect.md, code-reviewer.md, etc.)

**Step 6: Test hire**

Run: `mkdir -p /tmp/test-rules && cd /tmp/test-rules && npx agent-hub hire test-rules-agent`

**Step 7: Verify rules copied to project**

Run: `ls /tmp/test-rules/.claude/rules/`
Expected: 8 rule files

**Step 8: Verify agents copied to project**

Run: `ls /tmp/test-rules/.claude/agents/`
Expected: 13 agent files

**Step 9: Clean up**

Run: `rm -rf /tmp/test-rules && echo "yes" | npx agent-hub delete test-rules-agent`

---

## Summary

After completion:
- 8 default rules from everything-claude-code
- 13 default agents from everything-claude-code
- Rules and agents copied on `agent create` (to master)
- Rules and agents copied on `hire` (to project via existing copyConfigFiles)
- Removed _example.md pattern for rules and agents
- Cleaned up unused template functions
