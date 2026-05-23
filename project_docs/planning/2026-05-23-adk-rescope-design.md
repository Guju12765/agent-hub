# Agent Hub ADK Rescope — Design Document

**Date:** 2026-05-23
**Status:** Approved
**Scope:** Full project rescope from memory-centric MCP server to lightweight AI Development Kit

---

## What Agent Hub Is

A zero-dependency CLI for composing and deploying AI assistant configurations from a curated registry of assets.

**Three concepts:**
- **Assets** — Individual pieces (skills, rules, claude-md variants, dependencies) in a central registry
- **Agents** — A named selection of assets (local or shared via registry)
- **Deploy** — Copy an agent's assets into a project for cold-start

## User Flows

### Dev User (Creator)
```bash
agent-hub list                          # Browse available assets
agent-hub create my-agent debugging tdd coding-style senior-engineer qmd
agent-hub add my-agent code-review      # Add more later
agent-hub remove my-agent tdd           # Remove if needed
agent-hub agents                        # See your agents
```

### Normal User (Consumer)
```bash
agent-hub deploy fullstack-senior       # Deploy a pre-made registry agent
# Done. Project cold-started.
```

## Commands

| Command | Purpose |
|---------|---------|
| `agent-hub list` | Browse all assets and agents in registry |
| `agent-hub info <name>` | Show details about an asset or agent |
| `agent-hub create <agent> [assets...]` | Create agent from selected assets |
| `agent-hub add <agent> [assets...]` | Add assets to existing agent |
| `agent-hub remove <agent> [assets...]` | Remove assets from agent |
| `agent-hub agents` | List local agents |
| `agent-hub deploy <agent>` | Deploy agent to current project |

## Registry

The official registry is a GitHub mono-repo (`github:agent-hub/registry`).

### Structure
```
registry/
├── index.json                          # Flat catalog of all assets & agents
├── agents/
│   ├── fullstack-senior/
│   │   └── agent.json
│   └── data-engineer/
│       └── agent.json
├── skills/
│   ├── debugging/
│   │   ├── asset.json
│   │   └── SKILL.md
│   └── tdd/
│       ├── asset.json
│       └── SKILL.md
├── rules/
│   ├── coding-style/
│   │   ├── asset.json
│   │   └── coding-style.md
│   └── strict-typescript/
│       ├── asset.json
│       └── strict-typescript.md
├── claude-md/
│   ├── senior-engineer/
│   │   ├── asset.json
│   │   └── CLAUDE.md
│   └── junior-friendly/
│       ├── asset.json
│       └── CLAUDE.md
└── dependencies/
    └── qmd/
        ├── asset.json
        └── config.json
```

### index.json
Flat list for fast browsing. Third-party assets include a `source` field pointing to their repo.

```json
[
  { "name": "debugging", "type": "skill", "description": "Systematic debugging workflow" },
  { "name": "coding-style", "type": "rule", "description": "Immutability, small files, error handling" },
  { "name": "senior-engineer", "type": "claude-md", "description": "Senior engineer identity and standards" },
  { "name": "qmd", "type": "dependency", "description": "Local semantic search via QMD" },
  { "name": "fullstack-senior", "type": "agent", "description": "Senior full-stack with strict standards + QMD" }
]
```

### asset.json
```json
{
  "name": "debugging",
  "type": "skill",
  "description": "Systematic debugging workflow",
  "version": "1.0.0",
  "author": "agent-hub"
}
```

### agent.json (registry agent)
```json
{
  "name": "fullstack-senior",
  "description": "Senior full-stack with strict standards + QMD",
  "assets": ["debugging", "tdd", "coding-style", "senior-engineer", "qmd"]
}
```

### Dependency config.json
```json
{
  "install": "npm install -g @tobilu/qmd",
  "mcp": {
    "command": "qmd",
    "args": ["mcp"]
  }
}
```

## Asset Types

| Type | Registry path | Deploys to | Files |
|------|--------------|------------|-------|
| skill | `skills/{name}/` | `.claude/skills/{name}/` | `asset.json` + `SKILL.md` |
| rule | `rules/{name}/` | `.claude/rules/` | `asset.json` + `{name}.md` |
| claude-md | `claude-md/{name}/` | `.claude/CLAUDE.md` | `asset.json` + `CLAUDE.md` |
| dependency | `dependencies/{name}/` | `.mcp.json` + install | `asset.json` + `config.json` |
| agent | `agents/{name}/` | (resolves to assets) | `agent.json` |

## Local Storage

```
~/.agent-hub/
├── config.json                         # Registry URL, default target
├── cache/
│   └── index.json                      # Cached registry catalog
└── agents/
    └── my-agent.json                   # { "name": "...", "assets": [...], "created": "..." }
```

## Deploy Flow

`agent-hub deploy my-agent`:

1. Read agent manifest (local or registry)
2. Fetch each asset from registry (git sparse checkout or raw download)
3. For each asset by type:
   - `skill` → copy to `.claude/skills/`
   - `rule` → copy to `.claude/rules/`
   - `claude-md` → copy to `.claude/CLAUDE.md` (conflict resolution if exists)
   - `dependency` → prompt "Install QMD? [Y/n]", run install command, wire into `.mcp.json`
4. Done. Project cold-started.

### Deploy output
```
project/
├── .claude/
│   ├── CLAUDE.md
│   ├── skills/
│   │   ├── debugging/SKILL.md
│   │   └── tdd/SKILL.md
│   └── rules/
│       └── coding-style.md
└── .mcp.json
```

## Architecture

```
src/
├── index.ts                    # Entry point → CLI
├── cli/
│   ├── index.ts                # Command router
│   └── commands/
│       ├── list.ts             # Browse registry assets & agents
│       ├── create.ts           # Create agent from assets
│       ├── add.ts              # Add assets to agent
│       ├── remove.ts           # Remove assets from agent
│       ├── deploy.ts           # Deploy agent to project
│       ├── agents.ts           # List local agents
│       └── info.ts             # Show asset/agent details
├── registry/
│   ├── index.ts                # Fetch & cache index.json
│   ├── fetch.ts                # Download assets from GitHub
│   └── cache.ts                # Local cache management
├── agents/
│   ├── manager.ts              # CRUD for local agent manifests
│   └── resolve.ts              # Resolve agent → list of assets to deploy
├── deploy/
│   ├── index.ts                # Orchestrate deploy flow
│   ├── copy.ts                 # Copy assets to target dirs
│   ├── dependencies.ts         # Install & wire external deps
│   └── conflict.ts             # Handle existing files
└── targets/
    ├── types.ts                # Target interface
    └── claude.ts               # Claude: .claude/, .mcp.json, settings.json
```

## Data Flow

```
Registry (GitHub)          Local                    Project
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│ index.json  │─────→│ cache/       │      │ .claude/        │
│ skills/     │      │   index.json │      │   skills/       │
│ rules/      │      │ agents/      │      │   rules/        │
│ claude-md/  │      │   my-agent   │─────→│   CLAUDE.md     │
│ dependencies│      │     .json    │      │ .mcp.json       │
│ agents/     │      └──────────────┘      └─────────────────┘
└─────────────┘       ~/.agent-hub/         deploy target
```

## What We Keep, Cut, and Build

### Keep
- `src/cli/` — Command routing structure (rewrite commands)
- `src/targets/` — Target adapter pattern (Claude adapter)
- `src/agent/paths.ts` — Path helpers (simplify)
- `src/cli/conflict-resolver.ts` — Useful for deploy conflicts

### Cut
- `src/storage/` — SQLite operations (no database)
- `src/utils/` — Retry/concurrency (no embeddings)
- `src/agent/templates.ts` — Replaced by registry
- `src/agent/config-loader.ts` — Replaced by asset types
- `src/agent/promote.ts`, `src/agent/sync.ts` — Dead code
- All heavy deps: `better-sqlite3`, `sqlite-vec`, `node-llama-cpp`, `openai`, `@modelcontextprotocol/sdk`, `chokidar`

### Build New
- `src/registry/` — Fetch index, download assets from GitHub
- `src/agents/` — Create/add/remove/list local agents
- `src/deploy/` — Resolve assets, copy to project, wire dependencies
- New CLI commands: `list`, `create`, `add`, `remove`, `deploy`, `agents`, `info`

## Dependencies

```json
{
  "dependencies": {}
}
```

Zero. Shell out to `git`, use Node built-ins (`fs`, `path`, `https`, `child_process`).

## Target Platform Support

Target adapter interface kept for future multi-platform support. Only Claude adapter ships initially. Writes to `.claude/`, `.mcp.json`, `settings.json`.

Future targets (when needed): Codex, Cursor, Windsurf, etc.
