# Session Logs Project Level & SKILL.md Update Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change session logs from global (`~/.claude/sessions/`) to project level (`.claude/sessions/`), and update SKILL.md to reflect auto-start observer and pre-configured hooks.

**Architecture:** Modify `getSessionsDir()` in utils.js to return project-level path. Update SKILL.md Quick Start section.

**Tech Stack:** Node.js

---

## Task 1: Change Session Logs to Project Level

**Files:**
- Modify: `src/templates/scripts/lib/utils.js`

**Step 1: Update getSessionsDir() function**

Change from:
```javascript
function getSessionsDir() {
  return path.join(getClaudeDir(), 'sessions');
}
```

To:
```javascript
function getSessionsDir() {
  return path.join(process.cwd(), '.claude', 'sessions');
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/templates/scripts/lib/utils.js
git commit -m "feat: change session logs to project level (.claude/sessions/)"
```

---

## Task 2: Update SKILL.md with Auto-Start and Pre-Configured Hooks

**Files:**
- Modify: `src/templates/skills/continuous-learning-v2/SKILL.md`

**Step 1: Update Quick Start section**

Replace the entire "## Quick Start" section (lines 91-159) with:

```markdown
## Quick Start

When using agent-hub, continuous learning works **out-of-the-box**:

### Pre-Configured (No Setup Required)

1. **Observation hooks** - PreToolUse/PostToolUse hooks are pre-configured to capture all tool calls
2. **Observer auto-starts** - Background daemon starts automatically on SessionStart
3. **Cross-platform** - Works on Windows, macOS, and Linux (Node.js, no bash/python dependencies)

### Using Instinct Commands

Once you have some session activity, use these commands:

```bash
/instinct-status     # Show learned instincts with confidence scores
/evolve              # Cluster related instincts into skills/commands
/instinct-export     # Export instincts for sharing
/instinct-import     # Import instincts from others
```

### Manual Setup (Alternative)

If not using agent-hub, add these hooks to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node <path-to>/start-observer.js start"
      }]
    }],
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node <path-to>/hooks/observe.js"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node <path-to>/hooks/observe.js"
      }]
    }]
  }
}
```
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/templates/skills/continuous-learning-v2/SKILL.md
git commit -m "docs: update SKILL.md with auto-start observer and pre-configured hooks"
```

---

## Task 3: Test Changes

**Step 1: Clean and rebuild**

```bash
rm -rf dist/templates
npm run build
```

**Step 2: Create test agent**

```bash
echo "yes" | npx agent-hub delete test-session-agent 2>/dev/null || true
npx agent-hub create test-session-agent
```

**Step 3: Verify utils.js has project-level sessions**

```bash
grep -A2 "getSessionsDir" ~/.agent-hub/agents/test-session-agent/.claude/scripts/lib/utils.js
```

Expected: Shows `path.join(process.cwd(), '.claude', 'sessions')`

**Step 4: Verify SKILL.md has updated Quick Start**

```bash
grep -A5 "Quick Start" ~/.agent-hub/agents/test-session-agent/.claude/skills/continuous-learning-v2/SKILL.md
```

Expected: Shows "out-of-the-box" and "Pre-Configured"

**Step 5: Test session-end.js creates project-level session file**

```bash
cd ~/.agent-hub/agents/test-session-agent
node .claude/scripts/hooks/session-end.js
ls -la .claude/sessions/
```

Expected: Creates `.claude/sessions/YYYY-MM-DD-<id>-session.tmp` in project directory

**Step 6: Clean up**

```bash
cd ~
echo "yes" | npx agent-hub delete test-session-agent
```

---

## Summary

After completion:
- Session logs stored at project level (`.claude/sessions/`) instead of global
- Each project has isolated session history
- SKILL.md documents out-of-box experience with auto-start observer
- No manual setup required when using agent-hub
