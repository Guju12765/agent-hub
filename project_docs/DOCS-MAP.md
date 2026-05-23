# Documentation Map

Navigation hub for all project documentation. Read this to find any doc quickly.

## Quick Start

1. Read [CONTEXT.md](CONTEXT.md) - 5 seconds to restore context
2. Read [v0.1.0 Snapshot](snapshots/v0.1.0-SNAPSHOT.md) - understand previous version
3. Use this map to find detailed documentation

## Version Snapshots
- [V0.1.0 Snapshot](snapshots/v0.1.0-SNAPSHOT.md) (pre-ADK)

## Codemaps (Auto-generated)
- [Architecture](codemaps/architecture.md) - Overall project structure and data flow
- [Backend](codemaps/backend.md) - All 5 modules: agent, cli, registry, deploy, targets

## Planning
- [TODO](planning/TODO.md)
- [ADK Rescope Design](planning/2026-05-23-adk-rescope-design.md) - Full project rescope
- [ADK Implementation Plan](planning/2026-05-23-adk-implementation-plan.md) - 7-task plan
- Legacy design docs (21 files) - Pre-ADK implementation plans

## Features
- (To add: features/ - feature specification docs)

## Standards
- (To add: standards/ - coding standards docs)

## Guides
- (To add: guides/ - how-to guides)

---

## By Scenario

### Need to understand the architecture?
Go to `codemaps/` - auto-generated architecture docs

### Understanding the ADK rescope?
Read `planning/2026-05-23-adk-rescope-design.md`

### Need to add a new asset type?
Check `src/agent/types.ts` for AssetType, `src/registry/fetch.ts` for path resolution, `src/deploy/copy.ts` for copy logic

---

## Recent Updates
- 2026-05-23: Updated all docs after ADK rescope (v0.2.0)
- 2026-05-23: Regenerated codemaps for new 5-module architecture
- 2026-02-05: Initial docs map setup
