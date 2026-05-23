# Architecture Overview
> Last scanned: 2026-05-23 00:00

## Project Type
Node.js + TypeScript CLI tool for agent management

## Structure
src/
  |- agent/         # Agent lifecycle & config (8 files, ~888 lines)
  |- cli/           # CLI commands & conflict resolution (9 files, ~1691 lines)
  |- storage/       # Atomic SQLite operations (2 files, ~172 lines)
  |- targets/       # Platform adapters (3 files, ~358 lines)
  |- utils/         # Retry & concurrency helpers (2 files, ~269 lines)
  |- index.ts       # Entry point (8 lines)

archive/            # Archived, no longer active
  |- memory/        # Former memory system (embeddings, search, sync)
  |- server/        # Former MCP server
  |- core/config/   # Former memory config types
  |- templates/     # Former default templates (skills, rules, commands)

## Entry Points
- src/index.ts      # Routes to CLI
- src/cli/index.ts  # CLI command router

## Key Dependencies
better-sqlite3, chokidar

## Related Codemaps
- [Backend](backend.md) - CLI and agent module details
