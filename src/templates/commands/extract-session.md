Extract the current session transcript to a readable markdown file.

## Usage

Run `/extract-session` anytime to generate a session log from the current conversation.

## Output

`.claude/memory/sessions/YYYY-MM-DD-HHmmss-{sessionId}-session.md`

## What Gets Extracted

| Included | Excluded |
|----------|----------|
| User messages | System reminders |
| Claude responses | Meta messages |
| File edits (Edit, Write) | Read/Glob/Grep calls |
| Git operations | Task agent dispatches |

## Behavior

Re-running overwrites the previous extraction with updated content.

```bash
node .claude/scripts/extract-session.js "$CLAUDE_TRANSCRIPT_PATH"
```
