# Project Context Index v2.0

## Project Summary
Agent Hub is a zero-dependency CLI (AI Development Kit) for composing and deploying AI assistant configurations. Users browse a registry of assets (skills, rules, CLAUDE.md variants, external plugins), cherry-pick them into named agents, and deploy to projects with one command.

## Current Version Status
- Version: v0.2.0
- Last Updated: 2026-05-23
- Git Commit: 956b4db
- Work Phase: Development (ADK rescope complete)

## Quick Links
- [Docs Map](DOCS-MAP.md)
- [Current Snapshot](snapshots/v0.1.0-SNAPSHOT.md)
- [Changelog](CHANGELOG.md)
- [TODO](planning/TODO.md)

## Tech Stack
Node.js + TypeScript (CLI-only, zero runtime dependencies)

## Core Metrics
- Total Code: ~1,000 lines across 24 files
- Modules: 5 (agent, cli, registry, deploy, targets)
- Commands: 7 (list, info, create, add, remove, agents, deploy)
- Registry: 5 initial assets (1 skill, 4 dependencies)

## Quick Start
```bash
npx agent-hub list
npx agent-hub create my-agent docs-map superpowers grillme
npx agent-hub deploy my-agent
```

## Current Focus
- [ ] Set up registry as separate GitHub repo
- [ ] Add more assets to registry
- [ ] End-to-end testing with real registry
