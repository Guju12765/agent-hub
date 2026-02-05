# Backend Overview
> Last scanned: 2026-02-05 01:15

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

## Server Module (src/server/)
src/server/
  |- index.ts              # MCP server setup
  |- tools/
      |- index.ts          # Tool registration
      |- search.ts         # memory_search tool
      |- get.ts            # memory_get tool
      |- status.ts         # memory_status tool

## Agent Module (src/agent/)
src/agent/
  |- index.ts              # Agent exports
  |- manager.ts            # Agent CRUD operations
  |- types.ts              # Agent type definitions
  |- paths.ts              # Path resolution
  |- config-loader.ts      # Load agent configs
  |- templates.ts          # Template management
  |- promote.ts            # Agent promotion
  |- sync.ts               # Sync operations

## Targets Module (src/targets/)
src/targets/
  |- index.ts              # Target exports
  |- types.ts              # Target interfaces
  |- claude.ts             # Claude Code target implementation

## External Dependencies
@modelcontextprotocol/sdk, chokidar
