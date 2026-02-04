# What is Agent Hub?

Agent Hub is an **npm package** that creates AI coding agents with persistent memory and built-in superpowers. Think of it as a way to give Claude Code (or other AI assistants) a consistent identity, memory across sessions, and a toolkit of best practices.

## The Problem It Solves

Every Claude Code session starts fresh. Your assistant doesn't remember:
- Your preferences ("always use TypeScript")
- Past decisions ("we chose Prisma over TypeORM")
- Project context ("this is a Next.js app with tRPC")
- What happened yesterday

Agent Hub fixes this by giving your assistant:
- **Persistent memory** that survives sessions
- **Consistent identity** with personality and principles
- **Built-in skills** for coding standards and workflows
- **Learning ability** that improves from your patterns

## Two Components

### 1. CLI Tool

Manage agents from your terminal:

```bash
agent-hub create alice -s "Full-stack engineer"
agent-hub hire alice
agent-hub export alice
```

### 2. MCP Server

Provides memory tools to AI coding assistants:

| Tool | Description |
|------|-------------|
| `memory_search` | Semantic search across memory |
| `memory_get` | Retrieve specific entries |
| `memory_status` | Check memory stats |

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

## The Workflow

1. **Create** an agent with `agent-hub create`
2. **Configure** by editing files in `~/.agent-hub/agents/<name>/`
3. **Hire** into a project with `agent-hub hire`
4. **Use** - Claude Code automatically connects to the memory server

## What You Get Out of the Box

When you create an agent, you get:

| Category | Count | Examples |
|----------|-------|----------|
| Skills | 3 | Coding standards, Python patterns, continuous learning |
| Rules | 8 | Security, testing, performance, git workflow |
| Subagents | 14 | Code reviewer, architect, TDD guide |
| Commands | 24 | `/plan`, `/code-review`, `/tdd`, `/verify` |
| Hooks | 4 | Observer auto-start, session logs, memory suggestions |

## Not a Plugin

Agent Hub is standalone. It works with Claude Code, Codex CLI, or any MCP-compatible client. The MCP server is spawned by the client based on configuration injected during `hire`.

## Cross-Platform

Fully written in Node.js. Works on Windows, macOS, and Linux without any platform-specific dependencies.
