# Cleanup _example.json and Test Hooks Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove unnecessary `_example.json` hook file and test all Node.js hook scripts work correctly.

**Architecture:** Remove `getDefaultHookTemplate()` and `_example.json` creation since we now have `default.json` with real hooks. Test each hook script in isolation.

**Tech Stack:** TypeScript, Node.js

---

## Task 1: Remove _example.json Creation and Unused Function

**Files:**
- Modify: `src/agent/templates.ts`

**Step 1: Remove getDefaultHookTemplate function**

Delete the entire function (lines ~112-129):

```typescript
/**
 * Default hook template
 */
export function getDefaultHookTemplate(): object {
  return {
    _comment: "Hook configurations. Merged into settings.json on hire.",
    _example: {
      PreCompact: [
        {
          matcher: "manual|auto",
          hooks: [
            {
              type: "command",
              command: "echo 'Your pre-compact message here'",
            },
          ],
        },
      ],
    },
  };
}
```

**Step 2: Remove _example.json creation**

Delete these lines:

```typescript
  // Create hooks/_example.json
  const hookPath = join(hooksDestDir, "_example.json");
  if (!existsSync(hookPath)) {
    writeFileSync(hookPath, JSON.stringify(getDefaultHookTemplate(), null, 2) + "\n");
  }
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/agent/templates.ts
git commit -m "refactor: remove hooks/_example.json in favor of default.json"
```

---

## Task 2: Test Hook Scripts

**Step 1: Create test project**

```bash
mkdir -p /tmp/hook-test && cd /tmp/hook-test
npx agent-hub create test-hooks-agent
npx agent-hub hire test-hooks-agent
```

**Step 2: Test session-start.js**

```bash
cd /tmp/hook-test
node .claude/scripts/hooks/session-start.js
```

Expected: Outputs like `[SessionStart] Package manager: npm (fallback)` or similar. No errors.

**Step 3: Test session-end.js**

```bash
cd /tmp/hook-test
node .claude/scripts/hooks/session-end.js
```

Expected: Creates `.claude/memory/sessions/YYYY-MM-DD-XXXX-session.tmp`. Outputs `[SessionEnd] Created session file: ...`

**Step 4: Test pre-compact.js**

```bash
cd /tmp/hook-test
node .claude/scripts/hooks/pre-compact.js
```

Expected: Creates `.claude/memory/sessions/compaction-log.txt`. Outputs `[PreCompact] State saved before compaction`

**Step 5: Test suggest-compact.js**

```bash
cd /tmp/hook-test
node .claude/scripts/hooks/suggest-compact.js
```

Expected: Runs silently (no output until threshold reached). No errors.

**Step 6: Clean up**

```bash
rm -rf /tmp/hook-test
echo "yes" | npx agent-hub delete test-hooks-agent
```

---

## Summary

After completion:
- Removed `getDefaultHookTemplate()` function
- Removed `hooks/_example.json` creation
- `default.json` is the single source of truth for default hooks
- All 4 Node.js hook scripts verified working
- Note: `observe.sh` for continuous-learning-v2 is bash-only (Windows compat deferred)
