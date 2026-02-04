# Extract Session Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert Claude session JSONL transcripts to readable markdown session logs

**Architecture:** Single Node.js script called by SessionEnd hook or `/extract-session` command. Reads JSONL, filters noise, outputs formatted markdown.

**Tech Stack:** Node.js (no dependencies), cross-platform

---

## Task 1: Create extract-session.js Script

**Files:**
- Create: `src/templates/scripts/hooks/extract-session.js`

**Step 1: Create the script with config section**

```javascript
#!/usr/bin/env node
/**
 * Extract Session - Convert JSONL transcript to markdown
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Usage:
 *   - Auto: Runs on SessionEnd hook
 *   - Manual: node .claude/scripts/hooks/extract-session.js
 *   - With path: node extract-session.js /path/to/transcript.jsonl
 */

const fs = require('fs');
const path = require('path');
const {
  getSessionsDir,
  ensureDir,
  writeFile,
  log
} = require('../lib/utils.js');

// Configuration - customize what gets extracted
const config = {
  // Tools to include in output (file modifications, key actions)
  includedTools: ['Edit', 'Write', 'NotebookEdit', 'Bash'],

  // Bash commands to capture (regex patterns)
  bashPatterns: [
    /git commit/,
    /git push/,
    /git checkout/,
    /git merge/,
    /npm run build/,
    /npm test/,
    /pnpm |yarn |bun /
  ],

  // Skip user messages containing these (system noise)
  skipUserPatterns: [
    '<local-command',
    '<system-reminder',
    '<tool_result',
    '<command-name>/',
    'tool_use_id'
  ],

  // Max content length before truncation
  maxContentLength: 1000,
  maxToolOutputLength: 200
};
```

**Step 2: Add JSONL parsing function**

```javascript
function parseJsonl(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(Boolean);
  const entries = [];

  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}
```

**Step 3: Add extraction logic**

```javascript
function extractSession(entries) {
  const result = {
    sessionId: null,
    startTime: null,
    messages: []
  };

  for (const entry of entries) {
    // Capture session metadata from first entry
    if (!result.sessionId && entry.sessionId) {
      result.sessionId = entry.sessionId;
    }
    if (!result.startTime && entry.timestamp) {
      result.startTime = entry.timestamp;
    }

    // Extract user messages (skip meta and noise)
    if (entry.type === 'user' && !entry.isMeta) {
      const content = getTextContent(entry.message?.content);
      if (content && !shouldSkipUser(content)) {
        result.messages.push({
          type: 'user',
          time: entry.timestamp,
          content: truncate(content, config.maxContentLength)
        });
      }
    }

    // Extract assistant responses
    if (entry.type === 'assistant' && entry.message?.content) {
      const blocks = Array.isArray(entry.message.content)
        ? entry.message.content
        : [];

      // Text responses
      for (const block of blocks) {
        if (block.type === 'text' && block.text?.trim()) {
          result.messages.push({
            type: 'claude',
            time: entry.timestamp,
            content: truncate(block.text, config.maxContentLength)
          });
        }

        // Tool calls (filtered)
        if (block.type === 'tool_use' && config.includedTools.includes(block.name)) {
          const toolMsg = extractToolInfo(block);
          if (toolMsg) {
            result.messages.push({
              type: 'tool',
              time: entry.timestamp,
              ...toolMsg
            });
          }
        }
      }
    }
  }

  return result;
}

function getTextContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textBlock = content.find(b => b.type === 'text');
    return textBlock?.text || '';
  }
  return '';
}

function shouldSkipUser(content) {
  return config.skipUserPatterns.some(p => content.includes(p));
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max) + '...';
}

function extractToolInfo(block) {
  const { name, input } = block;

  if (name === 'Edit' || name === 'Write' || name === 'NotebookEdit') {
    const file = input?.file_path?.replace(/.*[\\\/]/, '') || 'unknown';
    return { tool: name, file };
  }

  if (name === 'Bash') {
    const cmd = input?.command || '';
    // Only include matching bash commands
    if (config.bashPatterns.some(p => p.test(cmd))) {
      return { tool: 'Bash', command: truncate(cmd, config.maxToolOutputLength) };
    }
  }

  return null;
}
```

**Step 4: Add markdown formatting**

```javascript
function formatMarkdown(session) {
  const lines = [];

  // Header
  const startDate = session.startTime ? new Date(session.startTime) : new Date();
  const dateStr = startDate.toISOString().slice(0, 10);
  const timeStr = startDate.toISOString().slice(11, 19).replace(/:/g, '');
  const shortId = session.sessionId?.slice(0, 8) || 'unknown';

  lines.push(`# Session: ${dateStr}`);
  lines.push('');
  lines.push(`**Session ID:** ${shortId}`);
  lines.push(`**Started:** ${startDate.toISOString().slice(11, 19)}`);
  lines.push(`**Extracted:** ${new Date().toISOString().slice(11, 19)}`);
  lines.push(`**Messages:** ${session.messages.filter(m => m.type === 'user').length} user, ${session.messages.filter(m => m.type === 'claude').length} assistant`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Conversation');
  lines.push('');

  // Messages
  let lastTime = '';
  for (const msg of session.messages) {
    const time = msg.time?.slice(11, 16) || '??:??';

    if (msg.type === 'user') {
      lines.push(`### ${time} - User`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    } else if (msg.type === 'claude') {
      // Avoid duplicate timestamps for consecutive claude messages
      if (time !== lastTime) {
        lines.push(`### ${time} - Claude`);
        lines.push('');
      }
      lines.push(msg.content);
      lines.push('');
    } else if (msg.type === 'tool') {
      if (msg.tool === 'Bash') {
        lines.push(`> 🔀 \`${msg.command}\``);
      } else {
        lines.push(`> 📝 **${msg.tool}:** \`${msg.file}\``);
      }
      lines.push('');
    }

    lastTime = time;
  }

  return lines.join('\n');
}
```

**Step 5: Add main function**

```javascript
async function main() {
  // Get transcript path from env or argument
  const transcriptPath = process.argv[2] || process.env.CLAUDE_TRANSCRIPT_PATH;

  if (!transcriptPath) {
    log('[ExtractSession] No transcript path provided');
    log('[ExtractSession] Usage: node extract-session.js <path> or set CLAUDE_TRANSCRIPT_PATH');
    process.exit(0);
  }

  if (!fs.existsSync(transcriptPath)) {
    log(`[ExtractSession] Transcript not found: ${transcriptPath}`);
    process.exit(0);
  }

  // Parse and extract
  log('[ExtractSession] Reading transcript...');
  const entries = parseJsonl(transcriptPath);
  log(`[ExtractSession] Parsed ${entries.length} entries`);

  const session = extractSession(entries);
  log(`[ExtractSession] Extracted ${session.messages.length} messages`);

  // Generate markdown
  const markdown = formatMarkdown(session);

  // Write output
  const sessionsDir = getSessionsDir();
  ensureDir(sessionsDir);

  const startDate = session.startTime ? new Date(session.startTime) : new Date();
  const dateStr = startDate.toISOString().slice(0, 10);
  const timeStr = startDate.toISOString().slice(11, 19).replace(/:/g, '');
  const shortId = session.sessionId?.slice(0, 8) || 'unknown';
  const outputFile = path.join(sessionsDir, `${dateStr}-${timeStr}-${shortId}-session.md`);

  writeFile(outputFile, markdown);
  log(`[ExtractSession] Written: ${outputFile}`);

  process.exit(0);
}

main().catch(err => {
  console.error('[ExtractSession] Error:', err.message);
  process.exit(0);
});
```

**Step 6: Test the script manually**

Run:
```bash
node src/templates/scripts/hooks/extract-session.js "C:\Users\liuwe\.claude\projects\D--Codebase-agent-hub\55fda4b7-3d22-4243-88a0-7abcf0831f54.jsonl"
```

Expected: Creates `.claude/memory/sessions/2026-02-02-025247-55fda4b7-session.md`

**Step 7: Commit**

```bash
git add src/templates/scripts/hooks/extract-session.js
git commit -m "feat: add extract-session script for JSONL to markdown conversion"
```

---

## Task 2: Create /extract-session Command

**Files:**
- Create: `src/templates/commands/extract-session.md`

**Step 1: Create command file**

```markdown
Extract the current session transcript to a readable markdown file.

Run this command to generate a session log from the current conversation.

Output: `.claude/memory/sessions/YYYY-MM-DD-HHmmss-{sessionId}-session.md`

```bash
node .claude/scripts/hooks/extract-session.js "$CLAUDE_TRANSCRIPT_PATH"
```

The extracted session log includes:
- User messages (filtered from system noise)
- Claude responses
- File modifications (Edit, Write)
- Git operations (commit, push)

Re-running overwrites the previous extraction with updated content.
```

**Step 2: Commit**

```bash
git add src/templates/commands/extract-session.md
git commit -m "feat: add /extract-session command"
```

---

## Task 3: Update SessionEnd Hook

**Files:**
- Modify: `src/templates/hooks/default.json`

**Step 1: Add extract-session to SessionEnd hooks**

In `default.json`, update the SessionEnd section:

```json
"SessionEnd": [
  {
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/scripts/hooks/session-end.js"
    }],
    "description": "Persist session state on end"
  },
  {
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/scripts/hooks/extract-session.js"
    }],
    "description": "Extract session transcript to markdown"
  }
]
```

**Step 2: Commit**

```bash
git add src/templates/hooks/default.json
git commit -m "feat: add extract-session to SessionEnd hook"
```

---

## Task 4: Update agent templates.ts to Copy New Files

**Files:**
- Modify: `src/agent/templates.ts`

**Step 1: Ensure extract-session.js is copied on hire**

Verify `copyScriptFiles()` includes the new script. The glob pattern `scripts/hooks/*.js` should already include it.

**Step 2: Ensure commands/ directory is copied**

Check that `copyCommandFiles()` copies the new command:

```typescript
// In copyCommandFiles or similar
const commandsDir = path.join(templatesDir, 'commands');
// Copy all .md files to .claude/commands/
```

**Step 3: Test with agent hire**

```bash
cd /tmp/test-project
agent-hub hire alice
ls -la .claude/scripts/hooks/extract-session.js
ls -la .claude/commands/extract-session.md
```

**Step 4: Commit if changes needed**

```bash
git add src/agent/templates.ts
git commit -m "fix: ensure extract-session files copied on hire"
```

---

## Task 5: Update Documentation

**Files:**
- Modify: `docs/concepts/memory.md`
- Modify: `docs/configuration/hooks.md`

**Step 1: Add session extraction to memory.md**

Add section after "Session Logs":

```markdown
## Session Extraction

Session logs can be auto-extracted from Claude's JSONL transcript:

### Automatic (SessionEnd)

When a session ends, the `extract-session.js` hook converts the transcript to markdown.

### Manual (/extract-session)

Run `/extract-session` anytime to generate a session log from the current conversation.

### What Gets Extracted

| Included | Excluded |
|----------|----------|
| User messages | System reminders |
| Claude responses | Meta messages |
| File edits (Edit, Write) | Read/Glob/Grep calls |
| Git operations | Task agent dispatches |

### Output

`.claude/memory/sessions/YYYY-MM-DD-HHmmss-{sessionId}-session.md`
```

**Step 2: Commit**

```bash
git add docs/concepts/memory.md docs/configuration/hooks.md
git commit -m "docs: add session extraction documentation"
```

---

## Summary

| Task | Files | Purpose |
|------|-------|---------|
| 1 | `extract-session.js` | Core extraction script |
| 2 | `commands/extract-session.md` | Manual command |
| 3 | `hooks/default.json` | Auto-run on SessionEnd |
| 4 | `templates.ts` | Copy files on hire |
| 5 | `docs/*.md` | Documentation |

**Total:** ~150 lines of code, 5 commits
