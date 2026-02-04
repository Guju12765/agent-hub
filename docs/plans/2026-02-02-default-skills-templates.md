# Default Skills Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add default skill directories (coding-standards, python-patterns, continuous-learning-v2) that are copied when an agent is created, and set up hooks via hooks config.

**Architecture:** Skills are directories containing SKILL.md (not flat .md files). Template skills are copied to master on create, then to project on hire. Hooks for continuous-learning-v2 are defined in a hooks JSON file.

**Tech Stack:** TypeScript, Node.js fs module

---

## Task 1: Update copy-templates Script

**Files:**
- Modify: `package.json:12`

**Step 1: Update copy-templates to recursively copy directories**

Change the `copy-templates` script from flat file copy to recursive directory copy.

Current:
```json
"copy-templates": "node -e \"const fs=require('fs');const path=require('path');fs.mkdirSync('dist/templates',{recursive:true});fs.readdirSync('src/templates').forEach(f=>fs.copyFileSync(path.join('src/templates',f),path.join('dist/templates',f)))\""
```

New:
```json
"copy-templates": "node -e \"const fs=require('fs');const path=require('path');function cpR(s,d){fs.mkdirSync(d,{recursive:true});fs.readdirSync(s,{withFileTypes:true}).forEach(e=>{const sp=path.join(s,e.name),dp=path.join(d,e.name);e.isDirectory()?cpR(sp,dp):fs.copyFileSync(sp,dp)})};cpR('src/templates','dist/templates')\""
```

**Step 2: Verify build works**

Run: `npm run build`
Expected: Build succeeds, `dist/templates/skills/` contains all three skill directories

**Step 3: Commit**

```bash
git add package.json
git commit -m "build: update copy-templates to recursively copy directories"
```

---

## Task 2: Add copyDirRecursive Helper to templates.ts

**Files:**
- Modify: `src/agent/templates.ts:5-6`

**Step 1: Add mkdirSync and readdirSync to imports**

Change:
```typescript
import { writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
```

To:
```typescript
import { writeFileSync, readFileSync, existsSync, copyFileSync, mkdirSync, readdirSync } from "node:fs";
```

**Step 2: Add copyDirRecursive helper function after getPackageTemplatePath**

Add after line 28:
```typescript
/**
 * Recursively copy a directory
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/agent/templates.ts
git commit -m "feat: add copyDirRecursive helper to templates"
```

---

## Task 3: Update createDefaultTemplates to Copy Skill Directories

**Files:**
- Modify: `src/agent/templates.ts:218-222`

**Step 1: Replace _example.md creation with skill directory copy**

Change:
```typescript
  // Create skills/_example.md
  const skillPath = join(getSkillsDir(agentName), "_example.md");
  if (!existsSync(skillPath)) {
    writeFileSync(skillPath, getDefaultSkillTemplate(agentName));
  }
```

To:
```typescript
  // Copy default skill directories from templates
  const skillsTemplateDir = getPackageTemplatePath("skills");
  const skillsDestDir = getSkillsDir(agentName);
  if (existsSync(skillsTemplateDir)) {
    const skillDirs = readdirSync(skillsTemplateDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
    for (const skillName of skillDirs) {
      const destSkillDir = join(skillsDestDir, skillName);
      if (!existsSync(destSkillDir)) {
        copyDirRecursive(join(skillsTemplateDir, skillName), destSkillDir);
      }
    }
  }
```

**Step 2: Verify build works**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/agent/templates.ts
git commit -m "feat: copy default skill directories on agent create"
```

---

## Task 4: Update getSkillFiles to Handle Skill Directories

**Files:**
- Modify: `src/agent/config-loader.ts:158-160`

**Step 1: Update getSkillFiles to find SKILL.md in subdirectories**

Change:
```typescript
export function getSkillFiles(agentName: string): string[] {
  return listConfigFiles(getSkillsDir(agentName), ".md");
}
```

To:
```typescript
/**
 * Get all skill files for an agent
 * Skills can be either:
 * - Flat files: skills/my-skill.md
 * - Directories: skills/my-skill/SKILL.md
 */
export function getSkillFiles(agentName: string): string[] {
  const skillsDir = getSkillsDir(agentName);
  if (!existsSync(skillsDir)) return [];

  const results: string[] = [];
  try {
    const entries = readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith("_")) continue;

      const fullPath = join(skillsDir, entry.name);
      if (entry.isDirectory()) {
        // Check for SKILL.md inside directory
        const skillMd = join(fullPath, "SKILL.md");
        if (existsSync(skillMd)) {
          results.push(fullPath); // Return directory path
        }
      } else if (entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }
  return results;
}
```

**Step 2: Commit**

```bash
git add src/agent/config-loader.ts
git commit -m "feat: support skill directories with SKILL.md"
```

---

## Task 5: Update hire.ts to Copy Skill Directories

**Files:**
- Modify: `src/cli/commands/hire.ts:5-7, 50-64, 144`

**Step 1: Add readdirSync to imports**

Change:
```typescript
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
```

To:
```typescript
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
```

**Step 2: Add copyDirRecursive helper function after copyConfigFiles**

Add after line 64:
```typescript
/**
 * Recursively copy a directory
 */
function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy skill files/directories to target
 * Handles both flat .md files and skill directories
 */
function copySkillFiles(skillPaths: string[], targetDir: string): number {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  let copied = 0;
  for (const skillPath of skillPaths) {
    const stat = statSync(skillPath);
    const name = basename(skillPath);
    const targetPath = join(targetDir, name);

    if (!existsSync(targetPath)) {
      if (stat.isDirectory()) {
        copyDirRecursive(skillPath, targetPath);
      } else {
        copyFileSync(skillPath, targetPath);
      }
      copied++;
    }
  }
  return copied;
}
```

**Step 3: Update skills copying to use copySkillFiles**

Change line 144:
```typescript
    const skillsCopied = copyConfigFiles(getSkillFiles(name), configDirs.skills);
```

To:
```typescript
    const skillsCopied = copySkillFiles(getSkillFiles(name), configDirs.skills);
```

**Step 4: Commit**

```bash
git add src/cli/commands/hire.ts
git commit -m "feat: copy skill directories on hire"
```

---

## Task 6: Create Hooks Config for continuous-learning-v2

**Files:**
- Create: `src/templates/skills/continuous-learning-v2/hooks.json`

**Step 1: Create hooks.json with PreToolUse/PostToolUse hooks**

The hooks reference the skill's observe.sh script relative to .claude/skills/:

```json
{
  "PreToolUse": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": ".claude/skills/continuous-learning-v2/hooks/observe.sh pre"
        }
      ]
    }
  ],
  "PostToolUse": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": ".claude/skills/continuous-learning-v2/hooks/observe.sh post"
        }
      ]
    }
  ]
}
```

**Step 2: Commit**

```bash
git add src/templates/skills/continuous-learning-v2/hooks.json
git commit -m "feat: add hooks config for continuous-learning-v2"
```

---

## Task 7: Update loadHooksConfig to Load Skill Hooks

**Files:**
- Modify: `src/agent/config-loader.ts:94-134`

**Step 1: Update loadHooksConfig to also check skill directories for hooks.json**

Add before the return statement (around line 132):
```typescript
  // Also load hooks.json from skill directories
  const skillsDir = getSkillsDir(agentName);
  if (existsSync(skillsDir)) {
    try {
      const skillEntries = readdirSync(skillsDir, { withFileTypes: true });
      for (const entry of skillEntries) {
        if (!entry.isDirectory() || entry.name.startsWith("_")) continue;

        const skillHooksPath = join(skillsDir, entry.name, "hooks.json");
        if (existsSync(skillHooksPath)) {
          try {
            const content = readFileSync(skillHooksPath, "utf-8");
            const parsed = JSON.parse(content);

            for (const [event, matchers] of Object.entries(parsed)) {
              if (event.startsWith("_")) continue;
              if (!Array.isArray(matchers)) continue;

              if (!hooks[event]) {
                hooks[event] = [];
              }
              hooks[event].push(...(matchers as HookMatcher[]));
            }
          } catch {
            // Skip invalid files
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
```

**Step 2: Commit**

```bash
git add src/agent/config-loader.ts
git commit -m "feat: load hooks.json from skill directories"
```

---

## Task 8: Test Full Flow

**Step 1: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Delete existing test agent**

Run: `echo "yes" | npx agent-hub delete test-agent 2>/dev/null; true`

**Step 3: Create new agent**

Run: `npx agent-hub create test-agent`
Expected: Agent created with skill directories

**Step 4: Verify skills copied to master**

Run: `ls ~/.agent-hub/agents/test-agent/skills/`
Expected: `coding-standards/  continuous-learning-v2/  python-patterns/`

**Step 5: Test hire**

Run: `mkdir -p /tmp/test-hire && cd /tmp/test-hire && npx agent-hub hire test-agent`

**Step 6: Verify skills copied to project**

Run: `ls /tmp/test-hire/.claude/skills/`
Expected: `coding-standards/  continuous-learning-v2/  python-patterns/`

**Step 7: Verify hooks injected**

Run: `cat /tmp/test-hire/.claude/settings.json | grep -A5 PreToolUse`
Expected: Shows PreToolUse hook for continuous-learning-v2

**Step 8: Clean up**

Run: `rm -rf /tmp/test-hire && echo "yes" | npx agent-hub delete test-agent`

**Step 9: Final commit**

```bash
git add -A
git commit -m "feat: add default skills templates with hook injection"
```

---

## Summary

After completion:
- Three default skills: coding-standards, python-patterns, continuous-learning-v2
- Skills are directories with SKILL.md inside
- continuous-learning-v2 has hooks.json that auto-injects PreToolUse/PostToolUse hooks
- On `agent create`: skills copied to `~/.agent-hub/agents/{name}/skills/`
- On `hire`: skills copied to `.claude/skills/`, hooks merged to settings.json
