# Hooks Configuration

Hooks are shell commands that run automatically at specific moments in Claude Code.

**Location:** `~/.agent-hub/agents/<name>/hooks/default.json`

## Default Hooks

Every agent comes with these pre-configured hooks:

```json
{
  "SessionStart": [{
    "matcher": "*",
    "hooks": [{
      "type": "command",
      "command": "node .claude/skills/continuous-learning-v2/agents/start-observer.js start"
    }],
    "description": "Start observer daemon for continuous learning"
  }],
  "PreCompact": [{
    "matcher": "manual|auto",
    "hooks": [{
      "type": "command",
      "command": "echo \"[Memory] Pre-compaction. Use /memory-summarization to save session state, daily learnings, and durable memories.\""
    }],
    "description": "Prompt Claude to save memories before compaction"
  }],
  "PreToolUse": [{
    "matcher": "tool == \"Edit\" || tool == \"Write\"",
    "hooks": [{
      "type": "command",
      "command": "node .claude/scripts/hooks/suggest-compact.js"
    }],
    "description": "Suggest compaction at logical intervals"
  }]
}
```

## Hook Types

### SessionStart

Runs when Claude Code session begins.

**Default action:** Start the continuous learning observer daemon.

The observer:
- Watches for code changes via `fs.watch()`
- Records observations for pattern learning
- Runs as singleton (one per project)
- Persists across multiple sessions

### PreCompact

Runs before context compaction.

**Default action:** Prompt Claude to save memories using the `/memory-summarization` skill.

The skill guides Claude to write:
- Session logs (current state, progress, decisions)
- Daily logs (timestamped learnings)
- MEMORY.md updates (durable facts and preferences)

All memory files are auto-indexed for `memory_search`.

### Notification

Periodic notifications during the session.

**Default action:** Suggest when context is getting large and compaction might help.

## How Hooks Get Applied

When you run `agent-hub hire` (or `agent-hub hire --update`):

1. Reads `hooks/default.json` from master
2. **Auto-merges** with any existing hooks in `.claude/settings.json`
3. Scripts are copied to `.claude/scripts/hooks/`

**Hooks are auto-merged without prompts:**
- New event types are added automatically
- New hook commands are appended to existing event types
- Duplicate hooks (same command) are detected and skipped
- No interactive conflict resolution needed for hooks

**Result in `.claude/settings.json`:**

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node .claude/skills/continuous-learning-v2/agents/start-observer.js start"
      }]
    }],
    "PreCompact": [{
      "matcher": "manual|auto",
      "hooks": [{
        "type": "command",
        "command": "echo \"[Memory] Pre-compaction. Use /memory-summarization to save memories.\""
      }]
    }]
  }
}
```

## Adding Custom Hooks

Edit `hooks/default.json` to add your own:

```json
{
  "PostToolUse": [{
    "matcher": "Write",
    "hooks": [{
      "type": "command",
      "command": "node .claude/scripts/hooks/my-custom-hook.js"
    }],
    "description": "Run after file writes"
  }]
}
```

## Available Hook Events

| Event | When |
|-------|------|
| `SessionStart` | Session begins |
| `SessionEnd` | Session ends |
| `PreToolUse` | Before a tool runs |
| `PostToolUse` | After a tool runs |
| `PreCompact` | Before context compaction |
| `Notification` | Periodic (configurable) |

## Hook Scripts Location

All hook scripts are Node.js for cross-platform compatibility:

```
.claude/scripts/
├── hooks/
│   ├── session-end.js      # Session logging
│   ├── pre-compact.js      # Pre-compaction capture
│   └── suggest-compact.js  # Compaction suggestions
└── lib/
    └── utils.js            # Shared utilities
```

## Writing Custom Hooks

Hook scripts receive context via stdin (JSON) and output to stdout:

```javascript
const { readStdinJson, output, log } = require('../lib/utils');

async function main() {
  const input = await readStdinJson();

  // Do something with input
  log('Running my hook...');

  // Output results (optional)
  output({ success: true });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

## Cross-Platform Notes

All default hooks are written in Node.js to ensure they work on:
- Windows
- macOS
- Linux

No bash scripts, no Python dependencies. Pure JavaScript.
