# Default Hooks Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add default hooks as templates (not hardcoded in TS), including session lifecycle hooks, memory-system hooks, strategic compact suggestions, and continuous-learning-v2 observation.

**Architecture:** Hooks are defined in `src/templates/hooks/default.json` and scripts live in `src/templates/scripts/`. On agent create, these are copied to master. On hire, scripts are copied to `.claude/scripts/` and hooks are injected into settings.json.

**Tech Stack:** TypeScript, Node.js, JavaScript (hook scripts)

---

## Task 1: Copy Scripts from everything-claude-code

**Files:**
- Create: `src/templates/scripts/lib/utils.js`
- Create: `src/templates/scripts/lib/package-manager.js`
- Create: `src/templates/scripts/hooks/session-start.js`
- Create: `src/templates/scripts/hooks/session-end.js`
- Create: `src/templates/scripts/hooks/pre-compact.js`
- Create: `src/templates/scripts/hooks/suggest-compact.js`

**Step 1: Create directory structure**

```bash
mkdir -p src/templates/scripts/lib
mkdir -p src/templates/scripts/hooks
```

**Step 2: Copy lib files from everything-claude-code**

Copy these files:
- `D:/Codebase/everything-claude-code/scripts/lib/utils.js` → `src/templates/scripts/lib/utils.js`
- `D:/Codebase/everything-claude-code/scripts/lib/package-manager.js` → `src/templates/scripts/lib/package-manager.js`

**Step 3: Copy hook scripts from everything-claude-code**

Copy these files:
- `D:/Codebase/everything-claude-code/scripts/hooks/session-start.js` → `src/templates/scripts/hooks/session-start.js`
- `D:/Codebase/everything-claude-code/scripts/hooks/session-end.js` → `src/templates/scripts/hooks/session-end.js`
- `D:/Codebase/everything-claude-code/scripts/hooks/pre-compact.js` → `src/templates/scripts/hooks/pre-compact.js`
- `D:/Codebase/everything-claude-code/scripts/hooks/suggest-compact.js` → `src/templates/scripts/hooks/suggest-compact.js`

**Step 4: Update require paths in hook scripts**

The scripts use `require('../lib/utils')`. Since they'll be in `.claude/scripts/hooks/`, update the paths:

In each hook script, change:
```javascript
require('../lib/utils')
```
To:
```javascript
require('../lib/utils.js')
```

(Add `.js` extension for ESM compatibility)

**Step 5: Commit**

```bash
git add src/templates/scripts/
git commit -m "feat: add hook scripts from everything-claude-code"
```

---

## Task 2: Create Default Hooks Configuration

**Files:**
- Create: `src/templates/hooks/default.json`

**Step 1: Create default.json with all hook configurations**

```json
{
  "_comment": "Default hooks for agent-hub. Injected into settings.json on hire.",

  "SessionStart": [{
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/scripts/hooks/session-start.js"
    }],
    "description": "Load previous context and detect package manager on session start"
  }],

  "SessionEnd": [{
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/scripts/hooks/session-end.js"
    }],
    "description": "Persist session state on end"
  }],

  "PreCompact": [
    {
      "matcher": "manual|auto",
      "hooks": [{
        "type": "command",
        "command": "echo \"[Memory] Pre-compaction flush. Store durable memories now (use memory/YYYY-MM-DD.md). If nothing to store, NO REPLY needed.\""
      }],
      "description": "Remind agent to save memories before compaction"
    },
    {
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node .claude/scripts/hooks/pre-compact.js"
      }],
      "description": "Save state before context compaction"
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
        "command": ".claude/skills/continuous-learning-v2/hooks/observe.sh pre"
      }],
      "description": "Continuous learning observation (pre)"
    }
  ],

  "PostToolUse": [{
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": ".claude/skills/continuous-learning-v2/hooks/observe.sh post"
    }],
    "description": "Continuous learning observation (post)"
  }]
}
```

**Step 2: Commit**

```bash
git add src/templates/hooks/default.json
git commit -m "feat: add default hooks configuration template"
```

---

## Task 3: Remove Hardcoded Hook from claude.ts

**Files:**
- Modify: `src/targets/claude.ts:12-14, 178-194`

**Step 1: Remove PRE_COMPACT_HOOK_COMMAND constant**

Delete lines 12-14:
```typescript
/**
 * PreCompact hook command to remind agent to save memories.
 */
const PRE_COMPACT_HOOK_COMMAND = `echo "Pre-compaction memory flush. Store durable memories now (use memory/YYYY-MM-DD.md); If nothing to store, NO REPLY is needed."`;
```

**Step 2: Remove hardcoded PreCompact injection from injectHooks**

In the `injectHooks` method, remove the hardcoded PreCompact hook logic (lines ~178-194):

Delete:
```typescript
    // Add PreCompact hook if not present
    const hasPreCompactHook = settings.hooks.PreCompact?.some(
      (h) => h.hooks?.some((hook) => hook.command?.includes("Pre-compaction memory flush"))
    );

    if (!hasPreCompactHook) {
      if (!settings.hooks.PreCompact) {
        settings.hooks.PreCompact = [];
      }
      settings.hooks.PreCompact.push({
        matcher: "manual|auto",
        hooks: [{
          type: "command",
          command: PRE_COMPACT_HOOK_COMMAND
        }]
      });
    }
```

The `injectHooks` method should now only merge hooks from the config parameter.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/targets/claude.ts
git commit -m "refactor: remove hardcoded PreCompact hook from claude.ts"
```

---

## Task 4: Update templates.ts to Copy Scripts Directory

**Files:**
- Modify: `src/agent/templates.ts`

**Step 1: Add function to copy scripts directory**

After the skills copying logic in `createDefaultTemplates`, add:

```typescript
  // Copy default scripts from templates
  const scriptsTemplateDir = getPackageTemplatePath("scripts");
  const scriptsDestDir = join(getAgentDir(agentName), "scripts");
  if (existsSync(scriptsTemplateDir)) {
    copyDirRecursive(scriptsTemplateDir, scriptsDestDir);
  }
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/agent/templates.ts
git commit -m "feat: copy scripts directory on agent create"
```

---

## Task 5: Update loadHooksConfig to Load default.json

**Files:**
- Modify: `src/agent/config-loader.ts:94-134`

**Step 1: Update loadHooksConfig to also load default.json**

The current function only loads `.json` files that don't start with `_`. Update it to explicitly load `default.json` first if it exists:

Add at the beginning of the function, after getting hooksDir:

```typescript
  // Load default.json first if it exists
  const defaultHooksPath = join(hooksDir, "default.json");
  if (existsSync(defaultHooksPath)) {
    try {
      const content = readFileSync(defaultHooksPath, "utf-8");
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
      // Skip invalid file
    }
  }
```

And update the loop to skip `default.json` (since we already loaded it):

```typescript
      if (file.startsWith("_") || !file.endsWith(".json") || file === "default.json") {
        continue;
      }
```

**Step 2: Commit**

```bash
git add src/agent/config-loader.ts
git commit -m "feat: load default.json hooks configuration"
```

---

## Task 6: Update hire.ts to Copy Scripts Directory

**Files:**
- Modify: `src/cli/commands/hire.ts`

**Step 1: Add getScriptsDir to imports**

Add to the imports from agent:
```typescript
import {
  // ... existing imports
  getScriptsDir,  // Add this - we need to create this function first
} from "../../agent/index.js";
```

**Step 2: Add getScriptsDir to paths.ts**

In `src/agent/paths.ts`, add:

```typescript
/**
 * Get scripts directory for an agent
 */
export function getScriptsDir(agentName: string): string {
  return join(getAgentDir(agentName), "scripts");
}
```

And export it from `src/agent/index.ts`.

**Step 3: Copy scripts directory on hire**

In the hire command, after copying skills, add:

```typescript
    // Copy scripts directory
    const scriptsSource = getScriptsDir(name);
    const scriptsTarget = join(settingsDir, "scripts");
    if (existsSync(scriptsSource) && !existsSync(scriptsTarget)) {
      copyDirRecursive(scriptsSource, scriptsTarget);
      console.log("Copied scripts directory.");
    }
```

**Step 4: Commit**

```bash
git add src/agent/paths.ts src/agent/index.ts src/cli/commands/hire.ts
git commit -m "feat: copy scripts directory on hire"
```

---

## Task 7: Test Full Flow

**Step 1: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Delete existing test agent**

Run: `echo "yes" | npx agent-hub delete test-hooks-agent 2>/dev/null; true`

**Step 3: Create new agent**

Run: `npx agent-hub create test-hooks-agent`
Expected: Agent created with hooks and scripts

**Step 4: Verify hooks copied to master**

Run: `cat ~/.agent-hub/agents/test-hooks-agent/hooks/default.json`
Expected: Shows the default hooks configuration

**Step 5: Verify scripts copied to master**

Run: `ls ~/.agent-hub/agents/test-hooks-agent/scripts/hooks/`
Expected: `session-start.js  session-end.js  pre-compact.js  suggest-compact.js`

**Step 6: Test hire**

Run: `mkdir -p /tmp/test-hooks && cd /tmp/test-hooks && npx agent-hub hire test-hooks-agent`

**Step 7: Verify scripts copied to project**

Run: `ls /tmp/test-hooks/.claude/scripts/hooks/`
Expected: `session-start.js  session-end.js  pre-compact.js  suggest-compact.js`

**Step 8: Verify hooks injected into settings.json**

Run: `cat /tmp/test-hooks/.claude/settings.json | grep -A2 SessionStart`
Expected: Shows SessionStart hook configuration

**Step 9: Clean up**

Run: `rm -rf /tmp/test-hooks && echo "yes" | npx agent-hub delete test-hooks-agent`

**Step 10: Final commit**

```bash
git add -A
git commit -m "feat: add default hooks templates with session lifecycle and memory persistence"
```

---

## Summary

After completion:
- Default hooks defined in `src/templates/hooks/default.json` (not hardcoded)
- Hook scripts in `src/templates/scripts/` (lib + hooks)
- Session lifecycle: SessionStart, SessionEnd, PreCompact
- Memory system: PreCompact reminder for durable memories
- Strategic compact: suggest-compact.js on Edit/Write
- Continuous learning: PreToolUse/PostToolUse observation
- On `agent create`: hooks and scripts copied to master
- On `hire`: scripts copied to `.claude/scripts/`, hooks injected to settings.json
