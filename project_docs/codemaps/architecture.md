# Architecture Overview
> Last scanned: 2026-05-23 12:00

## Project Type
Node.js + TypeScript CLI — AI Development Kit (zero runtime dependencies)

## Structure
src/
  |- agent/           # Core types, paths, agent CRUD (4 files, ~200 lines)
  |- cli/             # CLI entry + 7 command handlers (8 files, ~300 lines)
  |- registry/        # Fetch & cache registry from GitHub (3 files + test, ~120 lines)
  |- deploy/          # Copy assets to projects, wire deps (3 files + test, ~200 lines)
  |- targets/         # Platform adapters (3 files, ~150 lines)
  |- index.ts         # Entry point (8 lines)

registry/             # Seed data for the asset registry repo
  |- index.json       # Asset catalog
  |- skills/          # Mirrored skill assets (docs-map)
  |- dependencies/    # Pointers to external plugins (superpowers, grillme, etc.)

archive/              # Archived code from pre-ADK era (not active)

## Entry Points
- src/index.ts        # Routes to CLI
- src/cli/index.ts    # Command router (7 commands)

## Data Flow
Registry (GitHub) → ~/.agent-hub/cache/ → agent manifest → deploy to .claude/

## Key Dependencies
None. Zero runtime deps. Uses Node built-ins (fs, path, https, child_process) + git.

## Related Codemaps
- [Backend](backend.md) - Module details
