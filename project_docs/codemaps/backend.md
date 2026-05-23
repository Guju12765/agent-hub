# Backend Overview
> Last scanned: 2026-05-23 00:00

## CLI Module (src/cli/)
src/cli/
  |- index.ts              # CLI entry, command routing
  |- conflict-resolver.ts  # File conflict handling for hire
  |- conflict-resolver.test.ts
  |- commands/
      |- create.ts         # agent-hub create <name>
      |- agents.ts         # agent-hub agents (list)
      |- delete.ts         # agent-hub delete <name>
      |- status.ts         # agent-hub status [name]
      |- hire.ts           # agent-hub hire <name>
      |- hire.test.ts

## Agent Module (src/agent/)
src/agent/
  |- index.ts              # Agent exports
  |- manager.ts            # Agent CRUD operations
  |- types.ts              # AgentMetadata, AgentRegistry
  |- paths.ts              # Path resolution (agent dirs, memory dirs, project detection)
  |- config-loader.ts      # Load plugins, MCP servers, hooks, skills, rules configs
  |- templates.ts          # Default template generation for new agents
  |- promote.ts            # Agent promotion (not implemented)
  |- sync.ts               # Sync operations (skeleton)

## Targets Module (src/targets/)
src/targets/
  |- index.ts              # Target exports
  |- types.ts              # TargetAdapter interface, McpConfig, HireResult
  |- claude.ts             # Claude Code adapter (MCP injection, hooks, settings)

## Storage Module (src/storage/)
src/storage/
  |- index.ts              # Storage exports
  |- atomic-reindex.ts     # Atomic SQLite operations with rollback

## Utils Module (src/utils/)
src/utils/
  |- index.ts              # Utils exports
  |- retry.ts              # retryAsync, runWithConcurrency, withTimeout
