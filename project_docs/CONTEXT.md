# Project Context Index v1.0

## Project Summary
Agent Hub is a CLI tool for managing AI coding assistant configurations. It handles agent creation, deployment ("hiring") into projects, and conflict resolution for config files. Agents bundle settings, skills, rules, commands, and hooks that get deployed to project `.claude/` directories.

## Current Version Status
- Version: v0.1.0
- Last Updated: 2026-05-23
- Git Commit: 72f09d6
- Work Phase: Development (major refactor in progress)

## Quick Links
- [Docs Map](DOCS-MAP.md)
- [Current Snapshot](snapshots/v0.1.0-SNAPSHOT.md)
- [Changelog](CHANGELOG.md)
- [TODO](planning/TODO.md)

## Tech Stack
Node.js + TypeScript (CLI-only, no server)

## Core Metrics
- Total Code: ~3,400 lines across 25 files
- Active Modules: 5 (agent, cli, storage, targets, utils)
- Archived: memory system, MCP server, default templates, core config

## Quick Start
```bash
npm run dev
```

## Current Focus
- [ ] Archiving outdated systems (memory, server, templates)
- [ ] Simplifying to CLI-only architecture
- [ ] Updating documentation post-refactor
