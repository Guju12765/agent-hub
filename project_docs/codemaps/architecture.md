# Architecture Overview
> Last scanned: 2026-02-05 01:15

## Project Type
Node.js + TypeScript CLI tool with MCP server

## Structure
src/
  |- agent/         # Agent management (8 files, 888 lines)
  |- cli/           # CLI commands (9 files, 1694 lines)
  |- core/          # Configuration (3 files, 230 lines)
  |- memory/        # Memory system (22 files, 5145 lines)
  |- server/        # MCP server (5 files, 503 lines)
  |- storage/       # SQLite storage (2 files, 172 lines)
  |- targets/       # Deployment targets (3 files, 358 lines)
  |- templates/     # Default templates (skills, rules, hooks)
  |- utils/         # Utilities (2 files, 269 lines)

## Entry Points
- src/index.ts          # Main CLI entry
- src/server/index.ts   # MCP server entry
- src/cli/index.ts      # CLI command router

## Key Dependencies
@modelcontextprotocol/sdk, better-sqlite3, sqlite-vec, node-llama-cpp, openai, chokidar

## Related Codemaps
- [Backend](backend.md) - CLI and server details
- [Data](data.md) - Memory and storage layer
