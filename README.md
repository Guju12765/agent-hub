# Agent Hub

> Your AI Agent Command Center - Create, configure, and deploy AI coding agents with persistent memory and built-in superpowers

[![npm version](https://img.shields.io/npm/v/agent-hub.svg)](https://www.npmjs.com/package/agent-hub)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is Agent Hub?

Agent Hub is an npm package that gives AI coding assistants like Claude Code a **consistent identity**, **persistent memory**, and a **toolkit of best practices**. Instead of starting fresh every session, your assistant remembers your preferences, past decisions, and project context.

## The Problem

Every Claude Code session starts fresh. Your assistant doesn't remember:
- Your preferences ("always use TypeScript")
- Past decisions ("we chose Prisma over TypeORM")
- Project context ("this is a Next.js app with tRPC")
- What happened yesterday

## The Solution

Agent Hub fixes this with:

- **Persistent Memory** - Vector-indexed memory that survives sessions
- **Consistent Identity** - Personality, tenets, and principles that stick
- **Built-in Skills** - Coding standards and workflow automation
- **Continuous Learning** - Improves from your patterns over time

## Quick Start

```bash
# Install globally
npm install -g agent-hub

# Create an agent
agent-hub create alice -s "Full-stack engineer"

# Deploy to your project
cd your-project
agent-hub hire alice

# Restart Claude Code - agent is active!
```

## Two Components

### 1. CLI Tool

Manage agents from your terminal:

```bash
agent-hub create alice -s "Full-stack engineer"  # Create new agent
agent-hub agents                                  # List all agents
agent-hub hire alice                              # Deploy to project
agent-hub export alice                            # Share your setup
```

### 2. MCP Server

Provides memory tools to AI coding assistants:

| Tool | Description |
|------|-------------|
| `memory_search` | Semantic search across memory |
| `memory_get` | Retrieve specific entries |
| `memory_status` | Check memory stats |

## Features

### What You Get Out of the Box

Every agent comes with starter templates:

| Category | Count | Examples |
|----------|-------|----------|
| **Skills** | 2 | Memory summarization, skill creator |
| **Rules** | 2 | Coding style, performance |
| **Commands** | 1 | `/extract-session` |
| **Hooks** | 2 | Session start reminder, pre-compact memory prompt |

### Memory System

Three-tier memory architecture:

- **Short-term**: Session logs (`.claude/memory/sessions/*.md`)
- **Mid-term**: Daily logs (`.claude/memory/logs/*.md`)
- **Long-term**: Consolidated wisdom (`.claude/memory/MEMORY.md`)

All memory is automatically indexed with vector embeddings for semantic search.

### Architecture

```
Master (~/.agent-hub/)          Project (.claude/)
├── agents/                     ├── CLAUDE.md (extended)
│   └── alice/                  ├── memory/
│       ├── agent.json          │   ├── MEMORY.md
│       ├── CLAUDE.md           │   ├── logs/
│       ├── MEMORY.md           │   └── sessions/
│       ├── memory/             ├── skills/
│       ├── skills/             ├── commands/
│       ├── commands/           ├── rules/
│       ├── rules/              ├── scripts/
│       ├── hooks/              └── settings.json (updated)
│       └── scripts/
```

**Workflow**: Create in master → Hire to project → MCP server injected

## CLI Commands

### Agent Management

```bash
agent-hub create <name> [options]     # Create new agent
agent-hub agents                       # List all agents
agent-hub status [name]                # Show agent status
agent-hub delete <name>                # Delete agent
```

### Project Deployment

```bash
agent-hub hire <name> [options]       # Deploy to project
agent-hub hire <name> --update        # Update existing agent with conflict resolution
```

### Conflict Resolution

When re-hiring an agent with `--update`, you'll be prompted to handle file conflicts:

- **Keep** - Keep your existing file
- **Replace** - Use the agent's version
- **Merge** - Open both in editor with conflict markers
- **Diff** - Preview differences first

Use `--force-keep` or `--force-replace` to skip prompts. Use `--dry-run` to preview changes.

See [Hire Command](docs/cli/hire.md) for full documentation.

## Built-in Slash Commands

Default commands included with every agent:

| Command | Description |
|---------|-------------|
| `/extract-session` | Extract session logs to memory |
| `/memory-summarization` | Save session state and memories (triggered at PreCompact) |

You can add more commands by creating `.md` files in `~/.agent-hub/agents/<name>/commands/`

## Configuration

### Key Files

```
~/.agent-hub/agents/alice/
├── agent.json            # Metadata (name, specialty, version)
├── CLAUDE.md             # Session guidelines and personality
├── MEMORY.md             # Long-term memory
├── memory/               # Daily logs directory
├── .index/               # Vector database
├── plugins.json          # Plugin dependencies
├── mcp-servers.json      # MCP server configs
├── skills/               # Custom skills
│   ├── memory-summarization/
│   └── skill-creator/
├── hooks/                # Automation hooks
│   └── default.json
├── commands/             # Slash commands
│   └── extract-session.md
├── rules/                # Coding rules
│   ├── coding-style.md
│   └── performance.md
└── scripts/              # Hook scripts
```

### Customize Your Agent

```bash
# Edit session guidelines and personality
code ~/.agent-hub/agents/alice/CLAUDE.md

# Add MCP servers
code ~/.agent-hub/agents/alice/mcp-servers.json

# Customize rules
code ~/.agent-hub/agents/alice/rules/
```

## Requirements

- **Node.js 22+** - Required for local embeddings (LTS recommended)
- **Claude Code or Codex CLI** - For deploying agents to projects

## Embeddings Setup (Optional)

Agent Hub uses embeddings for semantic memory search. **Local embeddings work by default with no configuration.**

For faster/better embeddings, optionally set up an API key:

| Provider | Setup | Cost |
|----------|-------|------|
| **Local** (default) | None needed | Free |
| **OpenAI** | `export OPENAI_API_KEY=sk-...` | ~$0.02/1M tokens |
| **Gemini** | `export GOOGLE_API_KEY=...` | Free tier available |

See [Embeddings Setup](docs/configuration/embeddings.md) for details.

## How It Works

```
┌──────────────┐     hire      ┌──────────────┐
│  You         │ ────────────► │  Project     │
│  (terminal)  │               │  (.claude/)  │
└──────────────┘               └──────┬───────┘
       │                              │
       │ create/configure             │ spawns MCP server
       ▼                              ▼
┌──────────────┐               ┌──────────────┐
│  Master      │               │  Claude Code │
│  (~/.agent-  │               │  (uses       │
│   hub/)      │               │   memory)    │
└──────────────┘               └──────────────┘
```

1. **Create** an agent with `agent-hub create`
2. **Configure** by editing files in `~/.agent-hub/agents/<name>/`
3. **Hire** into a project with `agent-hub hire`
4. **Use** - Claude Code automatically connects to the memory server

## Cross-Platform

Fully written in Node.js. Works on **Windows**, **macOS**, and **Linux** without any platform-specific dependencies.

## Not a Plugin

Agent Hub is standalone. It works with Claude Code, Codex CLI, or any MCP-compatible client. The MCP server is spawned by the client based on configuration injected during `hire`.

## Documentation

- [What is Agent Hub?](docs/what-is-agent-hub.md)
- [Getting Started](docs/getting-started/)
- [Architecture](docs/concepts/architecture.md)
- [Memory System](docs/concepts/memory.md)
- [CLI Commands](docs/commands/)
- [Configuration](docs/configuration/identity.md)

## Examples

### Create and Deploy

```bash
# Create an agent
agent-hub create alice -s "Full-stack TypeScript engineer"

# Customize session guidelines
code ~/.agent-hub/agents/alice/CLAUDE.md

# Deploy to project
cd my-app
agent-hub hire alice

# Restart Claude Code - Alice is now active!
```

### Customize Your Agent

```bash
# Add custom skills
code ~/.agent-hub/agents/alice/skills/

# Add custom rules
code ~/.agent-hub/agents/alice/rules/

# Add custom commands
code ~/.agent-hub/agents/alice/commands/
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev

# Run tests
npm test

# Build docs
npm run docs:dev
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting PRs.

## License

MIT © [Guju12765]

## Links

- [Documentation](https://github.com/anthropics/agent-hub/tree/main/docs)
- [GitHub Issues](https://github.com/anthropics/agent-hub/issues)
- [npm Package](https://www.npmjs.com/package/agent-hub)

## Acknowledgments

Built with:
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP protocol
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite database
- [sqlite-vec](https://github.com/asg017/sqlite-vec) - Vector search
- [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) - Local embeddings
- [VitePress](https://vitepress.dev) - Documentation

---

**Ready to give your AI assistant a memory?** Install Agent Hub and create your first agent today.

```bash
npm install -g agent-hub
agent-hub create <name> -s "your specialty"
```
