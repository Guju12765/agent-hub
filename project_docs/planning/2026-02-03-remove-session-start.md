# Remove session-start.js and Add Memory Guidelines to CLAUDE.md

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove unnecessary session-start.js hook and replace with declarative memory guidelines in CLAUDE.md template.

**Architecture:** Delete session-start.js and its hook entry, update CLAUDE.md template with memory section that instructs Claude what to read at session start.

**Tech Stack:** Node.js, Markdown

---

## Task 1: Remove session-start.js Hook from default.json

**Files:**
- Modify: `src/templates/hooks/default.json`

**Step 1: Remove SessionStart hook for session-start.js**

Remove this entry from the `SessionStart` array:
```json
{
  "matcher": "*",
  "hooks": [{
    "type": "command",
    "command": "node .claude/scripts/hooks/session-start.js"
  }],
  "description": "Load previous context and detect package manager on session start"
}
```

Keep the observer auto-start hook:
```json
"SessionStart": [{
  "matcher": "*",
  "hooks": [{
    "type": "command",
    "command": "node .claude/skills/continuous-learning-v2/agents/start-observer.js start"
  }],
  "description": "Ensure observer daemon is running for continuous learning"
}]
```

**Step 2: Verify JSON is valid**

Run: `node -e "require('./src/templates/hooks/default.json')"`

**Step 3: Commit**

```bash
git add src/templates/hooks/default.json
git commit -m "refactor: remove session-start.js hook from default.json"
```

---

## Task 2: Delete session-start.js File

**Files:**
- Delete: `src/templates/scripts/hooks/session-start.js`

**Step 1: Delete the file**

```bash
rm src/templates/scripts/hooks/session-start.js
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: delete session-start.js (replaced by CLAUDE.md guidelines)"
```

---

## Task 3: Update CLAUDE.md Template with Memory Guidelines

**Files:**
- Modify: `src/templates/CLAUDE.md`

**Step 1: Read current CLAUDE.md template**

Check current content to understand structure.

**Step 2: Add Memory & Context section**

Add after the main description section:

```markdown
## Memory & Context

At session start, check for and read these files if they exist:

### Session Continuity
- `.claude/sessions/` - Recent session files (last 2-3) for context from previous work

### Project Memory
- `.claude/memory.md` - Persistent project memory and decisions
- `.claude/memory/` - Additional memory files if present

### Daily Logs
- `.claude/logs/` - Daily activity logs if maintained

Only read files that exist. Use this context to understand recent work and maintain continuity.
```

**Step 3: Build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/templates/CLAUDE.md
git commit -m "docs: add memory guidelines to CLAUDE.md template"
```

---

## Task 4: Clean Up Unused Utilities

**Files:**
- Modify: `src/templates/scripts/lib/utils.js`

**Step 1: Check if getLearnedSkillsDir is still used**

Search for `getLearnedSkillsDir` in all template files. If not used anywhere, remove it.

**Step 2: Check if package-manager.js is still used**

Search for `package-manager` imports. If not used anywhere, delete:
- `src/templates/scripts/lib/package-manager.js`

**Step 3: Remove unused exports from utils.js if any**

**Step 4: Build and commit**

```bash
npm run build
git add -A
git commit -m "refactor: remove unused utilities (getLearnedSkillsDir, package-manager)"
```

---

## Task 5: Test Changes

**Step 1: Clean and rebuild**

```bash
rm -rf dist/templates
npm run build
```

**Step 2: Create test agent**

```bash
echo "yes" | npx agent-hub delete test-memory-agent 2>/dev/null || true
npx agent-hub create test-memory-agent
```

**Step 3: Verify no session-start.js**

```bash
ls ~/.agent-hub/agents/test-memory-agent/.claude/scripts/hooks/
```
Expected: session-end.js, pre-compact.js, suggest-compact.js (NO session-start.js)

**Step 4: Verify default.json only has observer in SessionStart**

```bash
grep -A5 "SessionStart" ~/.agent-hub/agents/test-memory-agent/.claude/settings.json
```
Expected: Only start-observer.js hook

**Step 5: Verify CLAUDE.md has memory guidelines**

```bash
grep -A10 "Memory & Context" ~/.agent-hub/agents/test-memory-agent/CLAUDE.md
```
Expected: Shows memory guidelines section

**Step 6: Test session-end.js still works**

```bash
cd ~/.agent-hub/agents/test-memory-agent
node .claude/scripts/hooks/session-end.js
ls .claude/sessions/
```
Expected: Creates session file

**Step 7: Clean up**

```bash
cd ~
echo "yes" | npx agent-hub delete test-memory-agent
```

---

## Summary

After completion:
- session-start.js removed (was redundant)
- CLAUDE.md template has memory guidelines (declarative approach)
- Claude reads memory/session files based on CLAUDE.md instructions
- Package manager detection removed (Claude does this naturally)
- Observer still auto-starts on SessionStart
- session-end.js still writes session logs
