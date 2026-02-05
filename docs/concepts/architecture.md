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
        ├── CLAUDE.md          # Identity, tenets, principles, session guidelines
        ├── MEMORY.md          # Consolidated memory
        ├── memory/            # Daily logs (YYYY-MM-DD.md)
        │   └── .index/        # SQLite + vector embeddings
        ├── skills/            # 2 default skills
        │   ├── memory-summarization/
        │   └── skill-creator/
        ├── hooks/             # Hook configurations
        │   └── default.json
        ├── agents/            # Custom subagent definitions (empty by default)
        ├── commands/          # 1 default command
        │   └── extract-session.md
        ├── rules/             # 2 default rules
        │   ├── coding-style.md
        │   └── performance.md
        ├── scripts/           # Utility scripts
        │   ├── extract-session.js
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
    │   ├── memory-summarization/
    │   └── skill-creator/
    ├── agents/                # Copied from master (empty by default)
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
| `SessionStart` | Claude Code starts | Remind about memory location |
| `PreCompact` | Before context compaction | Prompt memory save |
| `SessionEnd` | Session ends | Save session summary |
| `Notification` | Periodic | Custom notifications |

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "echo \"[Memory] Memory available at .claude/memory/\""
      }]
    }],
    "PreCompact": [{
      "matcher": "manual|auto",
      "hooks": [{
        "type": "command",
        "command": "echo \"[Memory] Use /memory-summarization to save memories.\""
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
