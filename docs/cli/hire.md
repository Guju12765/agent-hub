# hire Command

The `hire` command deploys an agent to your project or global settings, copying configuration files and setting up MCP servers and hooks.

## Usage

```bash
npx agent-hub hire <name> [options]
```

## Options

- `--global, -g` - Add to global settings instead of project
- `--dry-run` - Show what would be copied without making changes
- `--force-keep` - Keep existing files, skip conflicts
- `--force-replace` - Replace all conflicting files

## Basic Usage

### Hire for Current Project

```bash
cd your-project
npx agent-hub hire alice
```

This installs the agent in the current project at `.claude/`.

### Hire Globally

```bash
npx agent-hub hire alice --global
```

This installs the agent in your home directory at `~/.claude/`.

## Conflict Resolution

When hiring an agent, files may conflict with existing configuration. The hire command provides several ways to handle conflicts:

### Interactive Mode (Default)

When conflicts are detected, you'll be prompted with options:

```
Conflict: memory-summarization.md already exists
  [K]eep existing    [R]eplace with agent's
  [M]erge in editor  [D]iff first
  [S]kip for now     [A]bort hire
Choice:
```

#### Options Explained

- **Keep** - Keep your existing file, don't overwrite
- **Replace** - Replace with the agent's version
- **Merge** - Open both versions in your editor with conflict markers
- **Diff** - Show a diff of the two files, then re-prompt
- **Skip** - Skip this file for now, continue with others
- **Abort** - Stop the hire operation (with rollback option)

### Merge Mode

When you choose **Merge**, the hire command opens your default editor with both versions marked:

```markdown
# ============================================
# CONFLICT: Choose one or combine both
# ============================================

# --- YOUR VERSION ---
[your content here]

# --- AGENT VERSION (alice) ---
[agent's content here]

# ============================================
# Delete markers and unwanted sections above
# ============================================
```

**How to resolve:**
1. Delete the conflict markers
2. Keep the sections you want (or combine both)
3. Save and close the editor
4. The merged content will be saved

### Force Modes

Skip interactive prompts by using force flags:

```bash
# Keep all existing files (never overwrite)
npx agent-hub hire alice --force-keep

# Replace all conflicting files (always overwrite)
npx agent-hub hire alice --force-replace
```

### Dry Run

Preview what would happen without making changes:

```bash
npx agent-hub hire alice --dry-run
```

Output:
```
DRY RUN: No changes will be made

Would create .claude/CLAUDE.md from agent template.
Would copy 3 config files.
Would conflict: memory-summarization.md (file)
Would inject 2 MCP servers.
Would inject 1 hook event types.

Found 1 potential conflicts:
  - memory-summarization.md

Run without --dry-run to resolve conflicts interactively.
```

## Auto-Merge for Hooks

Hooks are automatically merged intelligently:

- **New event types** are added without conflict
- **New hook commands** are appended to existing event types
- **Duplicate hooks** are detected and skipped
- No interactive prompt needed unless there's a real conflict

Example: If you have a SessionStart hook and the agent adds a different SessionStart hook, both will run.

## What Gets Installed

When you hire an agent:

1. **CLAUDE.md** - Agent's instructions (if not exists)
2. **Skills** - `.claude/skills/`
3. **Agents** - `.claude/agents/`
4. **Commands** - `.claude/commands/`
5. **Rules** - `.claude/rules/`
6. **Scripts** - `.claude/scripts/`
7. **Hooks** - Merged into `.claude/settings.json`
8. **MCP Servers** - Memory + additional servers in `.mcp.json`
9. **Plugins** - Reference copy at `.claude/plugins.json`
10. **Memory** - `.claude/memory/` (project-local)

## Configuration Files

### MCP Servers

The agent's memory server is added to `.mcp.json`:

```json
{
  "mcpServers": {
    "alice": {
      "type": "stdio",
      "command": "npx",
      "args": ["agent-hub", "--agent", "alice"]
    }
  }
}
```

On Windows, this uses `cmd /c npx` instead.

### Hooks

Hooks from the agent are merged into `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "npx agent-hub memory --recall"
          }
        ]
      }
    ]
  }
}
```

## Conflict Resolution Summary

After hiring, you'll see a summary of actions taken:

```
Hired alice in this project (Claude Code).
MCPs: 2 configured (including memory server).
Hooks: 1 event types configured.
See .claude/plugins.json for recommended plugins.

The agent is now available in Claude Code.
Restart Claude Code to activate the agent.

Conflict Resolution Summary:
  Copied: 5 files
  Replaced: 2 files
  Merged: 1 files
  Skipped: 1 files
    - old-config.md

  Tip: Run 'npx agent-hub hire alice' again to handle skipped files
```

## Editor Configuration

The merge feature uses your system's default editor:

- **Environment variables**: `$EDITOR` or `$VISUAL`
- **Windows default**: `notepad`
- **Unix default**: `vim` or `nano` (if available)

Set your preferred editor:

```bash
# In your shell profile (.bashrc, .zshrc, etc.)
export EDITOR=code  # VS Code
export EDITOR=vim   # Vim
export EDITOR=nano  # Nano
```

## Rollback on Abort

If you choose **Abort** during conflict resolution:

1. **Rollback** - Restore all original files, remove all new files
2. **Keep** - Keep changes made so far, stop processing remaining files
3. **Cancel** - Cancel the abort, continue with hire

This ensures you can safely experiment with different merge strategies.

## Examples

### First-Time Hire

```bash
$ npx agent-hub hire alice
Hired alice in this project (Claude Code).
MCPs: 1 configured (including memory server).
Hooks: 1 event types configured.
See .claude/plugins.json for recommended plugins.

The agent is now available in Claude Code.
Restart Claude Code to activate the agent.
```

### Re-Hiring with Conflicts

```bash
$ npx agent-hub hire alice

Conflict: memory-summarization.md already exists
  [K]eep existing    [R]eplace with agent's
  [M]erge in editor  [D]iff first
  [S]kip for now     [A]bort hire
Choice: d

Showing diff...
[diff output]

Conflict: memory-summarization.md already exists
  [K]eep existing    [R]eplace with agent's
  [M]erge in editor  [D]iff first
  [S]kip for now     [A]bort hire
Choice: m

Opening notepad...
[editor opens with conflict markers]

Hired alice in this project (Claude Code).
MCPs: 1 configured (including memory server).
Hooks: 1 event types configured.

Conflict Resolution Summary:
  Merged: 1 files
```

### Preview Changes

```bash
$ npx agent-hub hire alice --dry-run
DRY RUN: No changes will be made

Would create .claude/CLAUDE.md from agent template.
Would copy 3 config files.
Would conflict: memory-summarization.md (file)
Would inject 2 MCP servers.
Would inject 1 hook event types.

Found 1 potential conflicts:
  - memory-summarization.md

Run without --dry-run to resolve conflicts interactively.
```

### Force Replace All

```bash
$ npx agent-hub hire alice --force-replace
Hired alice in this project (Claude Code).
MCPs: 1 configured (including memory server).
Hooks: 1 event types configured.

Conflict Resolution Summary:
  Copied: 2 files
  Replaced: 3 files
```

## Tips

### Preview Before Hire

Always use `--dry-run` first to see what will change:

```bash
npx agent-hub hire alice --dry-run
npx agent-hub hire alice  # Then run for real
```

### Backup Before Force Replace

If using `--force-replace`, consider backing up your `.claude/` directory first:

```bash
cp -r .claude .claude.backup
npx agent-hub hire alice --force-replace
```

### Iterative Conflict Resolution

You can hire multiple times to handle skipped files:

```bash
# First pass: skip difficult conflicts
npx agent-hub hire alice
# Skipped: 2 files

# Second pass: only see skipped files
npx agent-hub hire alice
# Only the 2 previously skipped files will prompt
```

## Related Commands

- `fire` - Remove agent from project
- `agents` - List available agents
- `diff` - Compare project config with master agent
- `pull` - Update project from master agent
- `push` - Update master agent from project
