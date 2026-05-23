# Agent Hub

> AI Development Kit — Compose and deploy AI assistant configurations from a curated registry

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is Agent Hub?

Agent Hub is a zero-dependency CLI that lets you browse a registry of assets (skills, rules, CLAUDE.md variants, plugins), cherry-pick them into named agents, and deploy to projects with one command.

## Quick Start

```bash
# Browse available assets
npx agent-hub list

# Create an agent by picking assets
agent-hub create my-agent docs-map superpowers grillme

# Deploy to your project
cd your-project
agent-hub deploy my-agent
```

## How It Works

```
Registry (GitHub)          Local                    Project
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│ skills/     │      │ agents/      │      │ .claude/        │
│ rules/      │─────→│   my-agent   │─────→│   skills/       │
│ claude-md/  │      │     .json    │      │   rules/        │
│ dependencies│      └──────────────┘      │   CLAUDE.md     │
│ agents/     │       ~/.agent-hub/        │ .mcp.json       │
└─────────────┘                            └─────────────────┘
     list                create               deploy
```

1. **List** — Browse assets from the registry
2. **Create** — Cherry-pick assets into a named agent
3. **Deploy** — Copy assets into your project's `.claude/` directory

## Commands

| Command | Description |
|---------|-------------|
| `agent-hub list` | Browse available assets and agents |
| `agent-hub info <name>` | Show details about an asset |
| `agent-hub create <agent> [assets...]` | Create agent from selected assets |
| `agent-hub add <agent> [assets...]` | Add assets to an existing agent |
| `agent-hub remove <agent> [assets...]` | Remove assets from an agent |
| `agent-hub agents` | List your local agents |
| `agent-hub deploy <agent>` | Deploy agent to current project |

## Asset Types

| Type | What it is | Deploys to |
|------|-----------|------------|
| **Skill** | Workflow/methodology (`.md`) | `.claude/skills/` |
| **Rule** | Coding standards | `.claude/rules/` |
| **Claude-md** | Identity/instructions | `.claude/CLAUDE.md` |
| **Dependency** | External plugin/tool | Runs install command + wires `.mcp.json` |

## Registry

Assets live in a central GitHub registry. The initial registry includes:

| Asset | Type | Description |
|-------|------|-------------|
| `docs-map` | skill | Three-Layer Pyramid documentation structure |
| `superpowers` | dependency | TDD, debugging, planning, code review methodology |
| `andrej-karpathy-skills` | dependency | Think before coding, simplicity first |
| `grillme` | dependency | Stress-test plans through relentless questioning |
| `ralph-loop` | dependency | Continuous AI loops for iterative development |

## Examples

```bash
# Create a senior full-stack agent
agent-hub create senior-fs docs-map superpowers andrej-karpathy-skills

# Add more assets later
agent-hub add senior-fs grillme

# Remove one
agent-hub remove senior-fs grillme

# See what you've got
agent-hub agents

# Deploy to a project
cd my-project
agent-hub deploy senior-fs
```

## What Gets Deployed

```
my-project/
├── .claude/
│   ├── CLAUDE.md              # From claude-md asset
│   ├── skills/
│   │   └── docs-map/SKILL.md  # From skill assets
│   └── rules/
│       └── coding-style.md    # From rule assets
└── .mcp.json                  # Dependencies wired in
```

## Local Storage

```
~/.agent-hub/
├── config.json          # Registry URL
├── cache/
│   ├── index.json       # Cached asset catalog
│   └── registry/        # Cloned registry repo
└── agents/
    └── my-agent.json    # { "name": "my-agent", "assets": [...] }
```

## Requirements

- **Node.js 18+**
- **git** (for fetching registry)

## Development

```bash
npm install
npm run build
npm run dev
npm test
```

## Target Platforms

Currently targets **Claude Code** (`.claude/`, `.mcp.json`). Architecture supports adding other targets (Codex, Cursor, etc.) in the future.

## License

MIT
