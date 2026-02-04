# Architecture

## Overview

Agent Hub uses a two-location architecture: **Master** (portable configuration) and **Project** (working deployment).

## Master vs Project

| Location | Purpose | Contents |
|----------|---------|----------|
| Master `~/.agent-hub/agents/<name>/` | Portable config, shared across projects | Identity, memory, skills, hooks, plugins |
| Project `.claude/` | Working copy for this project | Deployed config, project-specific memory |

## Directory Structure

### Master (~/.agent-hub/)

```
~/.agent-hub/
├── registry.json              # List of all agents
└── agents/
    └── alice/
        ├── agent.json         # Metadata (name, version, specialty)
        ├── IDENTITY.md        # Personality, tenets, principles
        ├── CLAUDE.md          # Session guidelines
        ├── MEMORY.md          # Consolidated memory
        ├── memory/            # Daily logs (YYYY-MM-DD.md)
        │   └── .index/        # SQLite + vector embeddings
        ├── skills/            # 3 default skills
        │   ├── coding-standards/
        │   ├── python-patterns/
        │   └── continuous-learning-v2/
        ├── hooks/             # Hook configurations
        │   └── default.json
        ├── agents/            # 14 subagent definitions
        ├── commands/          # 24 slash commands
        ├── rules/             # 8 coding rules
        ├── scripts/           # Hook scripts
        │   ├── hooks/
        │   └── lib/
        ├── plugins.json       # Plugin dependencies
        └── mcp-servers.json   # Additional MCP servers
```

### Project (.claude/)

After `agent-hub hire alice`:

```
your-project/
├── CLAUDE.md                  # Identity appended here
└── .claude/
    ├── settings.json          # MCP servers + hooks injected
    ├── memory/                # Copied from master
    │   ├── MEMORY.md
    │   ├── 2026-01-31.md
    │   └── .index/
    ├── sessions/              # Session logs (project-level)
    │   └── 2026-01-31-abc123-session.tmp
    ├── skills/                # Copied from master
    │   ├── coding-standards/
    │   ├── python-patterns/
    │   └── continuous-learning-v2/
    ├── agents/                # Copied from master
    ├── commands/              # Copied from master
    ├── rules/                 # Copied from master
    └── scripts/               # Copied from master
```

## The Hire/Fire Cycle

```
Master ──hire──► Project ──fire──► (config stays, MCP removed)
       ◄──push──         ◄──pull──
```

| Command | Direction | What happens |
|---------|-----------|--------------|
| `hire` | Master → Project | Copy config, inject MCP server |
| `fire` | - | Remove MCP config (files stay) |
| `push` | Project → Master | Send changes back to master |
| `pull` | Master → Project | Get updates from master |

## MCP Server Flow

```
┌─────────────────┐         stdio          ┌─────────────────┐
│   Claude Code   │ ◄──── JSON-RPC ────► │   Agent Hub     │
│   (MCP Client)  │      stdin/stdout      │   (MCP Server)  │
└─────────────────┘                        └─────────────────┘
        │                                          │
        │  spawns on startup:                      │
        │  npx agent-hub --agent alice --project   │
        └──────────────────────────────────────────┘
```

Claude Code reads `.claude/settings.json` on startup and spawns the Agent Hub MCP server as a subprocess. Communication happens via JSON-RPC over stdin/stdout.

## Hook System

Hooks are shell commands that run at specific moments:

| Hook | When | Purpose |
|------|------|---------|
| `SessionStart` | Claude Code starts | Start observer daemon |
| `SessionEnd` | Session ends | Save session summary |
| `PreCompact` | Before context compaction | Capture context |
| `Notification` | Periodic | Suggest compaction |

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node .claude/skills/continuous-learning-v2/agents/start-observer.js start"
      }]
    }]
  }
}
```

## Cross-Platform Design

All scripts are Node.js for cross-platform compatibility:

- **No bash dependencies** - Works on Windows, macOS, Linux
- **No Python dependencies** - Pure JavaScript/Node.js
- **fs.watch() for file watching** - Cross-platform alternative to signals
- **Path handling via Node.js path module** - Handles Windows/Unix differences
