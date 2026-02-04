# Deploy to Projects

## Step 1: Hire an Agent

Navigate to your project and hire the agent:

```bash
cd your-project
npx agent-hub hire alice
```

**Output:**
```
Hired alice in this project (Claude Code).
MCPs: 1 configured (including memory server).
Hooks: 1 event types configured.
See .claude/plugins.json for recommended plugins.

The agent is now available in Claude Code.
Restart Claude Code to activate the agent.
```

> **Note:** See the full [hire command documentation](../cli/hire.md) for advanced options including conflict resolution, dry-run mode, and force flags.

## Step 2: Restart Claude Code

The MCP server starts automatically when Claude Code launches:

1. Close Claude Code completely
2. Reopen Claude Code in your project
3. The agent is now active with memory tools

## Step 3: Verify It's Working

In Claude Code, try:

```
Search my memory for preferences
```

Claude will use the `memory_search` tool automatically.

## What Happens During Hire

When you run `npx agent-hub hire alice`:

1. **CLAUDE.md** - Agent's instructions copied to `.claude/CLAUDE.md` (if not exists)
2. **Skills** - Copied to `.claude/skills/`
3. **Agents** - Copied to `.claude/agents/`
4. **Commands** - Copied to `.claude/commands/`
5. **Rules** - Copied to `.claude/rules/`
6. **Scripts** - Copied to `.claude/scripts/`
7. **Hooks** - Auto-merged into `.claude/settings.json`
8. **MCP Servers** - Memory server + additional servers added to `.mcp.json`
9. **Memory** - Project-local memory initialized at `.claude/memory/`

**MCP Configuration** (`.mcp.json`):
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

**Note:** If files already exist, the hire command will prompt you to resolve conflicts interactively. See [hire command docs](../cli/hire.md) for details on conflict resolution.

## After Hire: Memory System

The agent's memory system runs automatically via hooks:

### SessionStart Hook

When Claude Code starts, the agent automatically:
- Recalls recent memories relevant to your project
- Displays a brief summary of what it remembers

### Memory Directory

Project-local memory is stored at `.claude/memory/`:
- `MEMORY.md` - Consolidated memory file
- `logs/` - Session logs (auto-created on SessionEnd)
- `.index/` - Vector index for semantic search

## Fire an Agent

Remove the agent from your project:

```bash
npx agent-hub fire alice
```

This removes the MCP configuration from `.mcp.json` but keeps all files in `.claude/`. You can re-hire anytime.

## Global vs Project

```bash
# Hire for this project only (default)
npx agent-hub hire alice

# Hire globally (all projects)
npx agent-hub hire alice --global
```

## Preview Before Installing

Use `--dry-run` to see what will be installed:

```bash
npx agent-hub hire alice --dry-run
```

## Conflict Resolution

When re-hiring or updating an agent, conflicts may occur. The hire command provides interactive resolution:

```bash
# Interactive mode (default) - prompts for each conflict
npx agent-hub hire alice

# Keep existing files - never overwrite
npx agent-hub hire alice --force-keep

# Replace all conflicts - always overwrite
npx agent-hub hire alice --force-replace
```

See the [hire command documentation](../cli/hire.md) for full details on conflict resolution options.
