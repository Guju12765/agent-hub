# Observer Auto-Start on SessionStart Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-start the observer daemon on SessionStart so continuous learning works out-of-the-box without manual intervention.

**Architecture:** Add a second hook entry to SessionStart in default.json that calls the existing start-observer.js. The script already handles idempotent start (no-op if already running).

**Tech Stack:** Node.js, Claude Code hooks

---

## Task 1: Add Observer Auto-Start Hook to default.json

**Files:**
- Modify: `src/templates/hooks/default.json`

**Step 1: Add the hook entry**

In the `SessionStart` array, add a second hook entry after the existing session-start.js hook:

```json
"SessionStart": [
  {
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/scripts/hooks/session-start.js"
    }],
    "description": "Load previous context and detect package manager on session start"
  },
  {
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/skills/continuous-learning-v2/agents/start-observer.js start"
    }],
    "description": "Ensure observer daemon is running for continuous learning"
  }
]
```

**Step 2: Verify JSON is valid**

Run: `node -e "require('./src/templates/hooks/default.json')"`
Expected: No error (valid JSON)

**Step 3: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/templates/hooks/default.json
git commit -m "feat: auto-start observer daemon on SessionStart"
```

---

## Task 2: Test with Fresh Agent

**Step 1: Clean dist and rebuild**

```bash
rm -rf dist/templates/skills/continuous-learning-v2
rm -rf dist/templates/hooks
npm run build
```

**Step 2: Delete any existing test agent**

```bash
echo "yes" | npx agent-hub delete test-observer-agent 2>/dev/null || true
```

**Step 3: Create fresh test agent**

```bash
npx agent-hub create test-observer-agent
```

**Step 4: Verify hook is in place**

```bash
cat ~/.agent-hub/agents/test-observer-agent/.claude/settings.json | grep -A5 "SessionStart"
```

Expected: Should show both session-start.js and start-observer.js hooks

**Step 5: Simulate SessionStart by running the hook manually**

```bash
node ~/.agent-hub/agents/test-observer-agent/.claude/skills/continuous-learning-v2/agents/start-observer.js start
```

Expected: "Observer started (PID: X)" or "Observer already running (PID: X)"

**Step 6: Check observer status**

```bash
node ~/.agent-hub/agents/test-observer-agent/.claude/skills/continuous-learning-v2/agents/start-observer.js status
```

Expected: "Observer is running (PID: X)"

**Step 7: Check log file**

```bash
cat ~/.claude/homunculus/observer.log | tail -5
```

Expected: Shows observer started message with timestamp

**Step 8: Clean up**

```bash
node ~/.agent-hub/agents/test-observer-agent/.claude/skills/continuous-learning-v2/agents/start-observer.js stop
echo "yes" | npx agent-hub delete test-observer-agent
```

---

## Summary

After completion:
- Observer daemon auto-starts on every SessionStart
- Idempotent: multiple sessions don't start multiple observers
- Global singleton at `~/.claude/homunculus/`
- Observer keeps running until manual stop or system reboot
- No code changes needed - just hook configuration
