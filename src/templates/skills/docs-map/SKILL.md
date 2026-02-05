---
name: docs-map
description: "Generate and maintain Three-Layer Pyramid documentation structure for projects. Reduces Claude Code token consumption by 87% through hierarchical docs organization. Use when: (1) Setting up documentation for a new project, (2) Reorganizing scattered docs into structured format, (3) Creating version snapshots for releases, (4) Maintaining INDEX.md navigation hub, (5) User invokes /docs-map command."
---

# Project Docs Map

Generate and maintain a Three-Layer Pyramid documentation structure that optimizes Claude Code's context recovery.

## Quick Reference

| Layer | File | Lines | Tokens | Purpose |
|-------|------|-------|--------|---------|
| 1 | project_docs/CONTEXT.md | ~70 | ~350 | Instant project context |
| 2 | project_docs/snapshots/vX.X-SNAPSHOT.md | ~300 | ~1200 | Version overview |
| 3 | project_docs/{categories}/ | On-demand | Variable | Detailed docs |

## Commands

- `/docs-map init` - Full setup with auto-detection + reorganization
- `/docs-map update` - Sync INDEX.md, regenerate codemaps
- `/docs-map snapshot` - Create version snapshot
- `/docs-map status` - Health check and coverage report

**Note:** All commands are manual. Codemaps are NOT auto-updated on git commits or file changes. Run `/docs-map update` when you want fresh architecture docs after code changes.

## Init Workflow

When user runs `/docs-map init`:

1. **Check folder availability**:
   - Default folder: `project_docs/`
   - If exists, prompt user for alternative name
   - Store folder name in config
2. **Ask language preference** - Store in `.claude/docs-map.json`
3. **Auto-detect project info**:
   - Project name from package.json/Cargo.toml/go.mod/pyproject.toml
   - Version from manifest or git tags
   - Git commit via `git rev-parse --short HEAD`
   - Tech stack from dependencies and file extensions
   - Directory structure from filesystem
   - Quick start command from scripts
   - **Project summary from README.md** (if exists)
4. **Confirm project summary** - Show extracted summary, ask user to confirm/edit
5. **Scan existing docs** - Find all .md files in project (excluding node_modules, etc.)
6. **Create category structure** - See Category Structure below
7. **Generate codemaps** - Scan source files, create codemaps/ (see Codemaps Generation)
8. **Reorganize existing docs** - Move to appropriate categories (optional)
9. **Generate CONTEXT.md** - Inside project_docs/, with project summary
10. **Generate initial snapshot** - Create vX.X-SNAPSHOT.md
11. **Generate INDEX.md** - Create navigation hub

## Folder Conflict Handling

```
Checking for project_docs/ folder...

[If exists]:
"project_docs/ already exists. Choose an action:"
  A) Use existing folder (will add docs map structure inside)
  B) Enter a different folder name
  C) Cancel

[If B selected]:
"Enter folder name for docs map:" -> user input
```

## Layer 1: CONTEXT.md Template

Create in `project_docs/CONTEXT.md` (~70 lines):

```markdown
# Project Context Index v1.0

## Project Summary
{extracted from README or user-provided}
{1-3 sentences describing what the project is and what it's for}

## Current Version Status
- Version: {auto-detect}
- Last Updated: {auto-detect}
- Git Commit: {auto-detect}
- Work Phase: {ask user: dev/test/prod}

## Quick Links
- [Docs Map](INDEX.md)
- [Current Snapshot](snapshots/vX.X-SNAPSHOT.md)
- [Changelog](CHANGELOG.md)
- [TODO](planning/TODO.md)

## Tech Stack
{auto-detect, max 3 lines}

## Core Metrics
- Total Code: {auto-detect}
- Modules: {auto-detect}

## Quick Start
{auto-detect from scripts}

## Current Focus
- [ ] {ask user}
- [ ] {ask user}
- [ ] {ask user}
```

### Project Summary Extraction

1. Check if README.md exists in project root
2. Extract first paragraph or description section
3. Present to user: "Detected project summary: '{summary}'. Is this correct? (Y/edit/skip)"
4. If user edits, use their version
5. If no README, ask user to provide 1-2 sentences

## Layer 2: Version Snapshot Template

Create in `project_docs/snapshots/vX.X-SNAPSHOT.md` (~300 lines):

```markdown
# VX.X Project Snapshot

## Project Summary
{same as CONTEXT.md - what this project is}

## Version Info (5 lines)
- Version: vX.X
- Release Date: YYYY-MM-DD
- Key Commit: {hash}

## Core Changes (10 lines)
[NEW] Feature name
[NEW] Feature name
[FIX] Bug description
[REFACTOR] Area refactored

## Tech Stack (5 lines)
{framework} + {language} + {styling}

## Directory Structure (20 lines)
{key directories with [NEW] markers}

## Feature List (30 lines)
1. Feature (description) [NEW in vX.X]
2. Feature (description)
...

## Business Rules Summary (50 lines)
- Rule category: description
...

## Known Issues (20 lines)
- [ ] Issue description
...

## Next Steps (10 lines)
- [ ] Planned work
...

## Detailed Docs Index (10 lines)
- [API Docs](../api/)
- [Architecture](../architecture/)
```

### Snapshot Principles

1. **Static freeze** - Never modify after release; create new snapshot instead
2. **Self-contained** - 300 lines tells complete version story
3. **Incremental diff** - Mark new items with [NEW] for version comparison

## Layer 3: Category Structure

Create these directories under `project_docs/`:

| # | Directory | Purpose | Example Files |
|---|-----------|---------|---------------|
| 1 | snapshots/ | Version snapshots | v1.0-SNAPSHOT.md |
| 2 | codemaps/ | Auto-generated code maps | architecture.md, backend.md |
| 3 | features/ | Feature specs | login.md, dashboard.md |
| 4 | api/ | API definitions | user-api.md, data-api.md |
| 5 | standards/ | Code standards | coding-style.md, git-workflow.md |
| 6 | releases/ | Release notes | v2.0/RELEASE.md |
| 7 | issues/ | Bug tracking | bug-fixes/login-bug.md |
| 8 | guides/ | How-to guides | deployment.md, testing.md |
| 9 | planning/ | Roadmap/TODO | TODO.md, roadmap.md |

Plus root files in `project_docs/`:
- `CONTEXT.md` - Quick project context (Layer 1)
- `INDEX.md` - Navigation hub (critical)
- `CHANGELOG.md` - All changes log

### Auto-Classification Rules

Analyze file content for keywords:
- "API", "endpoint", "request/response" -> api/
- "architecture", "system design", "data flow" -> architecture/
- "how to", "guide", "steps", "tutorial" -> guides/
- "bug", "fix", "issue" -> issues/
- "feature", "user story", "requirement" -> features/
- "standard", "convention", "style" -> standards/
- "release", "changelog", "version" -> releases/
- "todo", "roadmap", "plan" -> planning/

### Classification Principles

1. Classify by purpose, not by time or author
2. One concept = one authoritative doc (no duplication)
3. Clear naming (user-api.md not api.md)
4. Max 3 levels deep

## Codemaps Generation

Codemaps are auto-generated during init and update. They provide token-lean architecture documentation.

### Detection Rules

**Always generated:**
- `codemaps/architecture.md` - Overall project structure

**Conditionally generated:**
| Codemap | Detected When |
|---------|---------------|
| backend.md | src/server/, src/api/, api/, routes/ exists OR express/fastify/koa in deps |
| frontend.md | src/components/, src/pages/, components/ exists OR react/vue/svelte in deps |
| data.md | src/models/, models/, schemas/, prisma/ exists OR *.prisma, *.sql files |

### Codemap Format

Token-lean tree structure with annotations:

```markdown
# [Section] Overview
> Last scanned: YYYY-MM-DD HH:mm

## Structure
src/
  |- folder/        # Purpose (N files, N lines)
  |   |- file.ts    # Key exports
  |   |- file.ts    # Key exports

## Entry Points
- path/to/entry.ts  # Description

## Key Dependencies
dep1, dep2, dep3
```

### JS/TS Enhanced Scanning

For JavaScript/TypeScript projects, additionally extract:
- Imports/exports from key files (entry points, api/, services/)
- Internal module dependencies
- External package usage per module

Limits: Max 100 files, skip node_modules/dist/build, 10s timeout.

### Diff Detection & Approval

Store codemap metadata in `.claude/docs-map.json`:
```json
{
  "codemaps": {
    "lastScan": "2026-02-05T14:30:00Z",
    "files": {
      "architecture.md": { "lines": 45, "hash": "abc123" }
    }
  }
}
```

**When diff > 30%, prompt user:**
```
Codemap changes detected: 47% difference

Changed:
  architecture.md  +15/-8 lines
  backend.md       +32/-45 lines

[A]pply  [D]iff  [S]kip  [K]eep old
```

Under 30%: Update silently.

## INDEX.md Template

```markdown
# Documentation Index

## Quick Start
- Read CONTEXT.md - 5 seconds to restore context
- Read vX.X-SNAPSHOT.md - understand current version
- Use this index to find detailed docs

## Version Snapshots
- [V1.0 Snapshot](snapshots/v1.0-SNAPSHOT.md)
- [V2.0 Snapshot](snapshots/v2.0-SNAPSHOT.md) [CURRENT]

## Codemaps
- [Architecture](codemaps/architecture.md) - Overall structure
- [Backend](codemaps/backend.md) - Backend modules
- [Frontend](codemaps/frontend.md) - Frontend components
- [Data](codemaps/data.md) - Data models

## Features
- [Login](features/login.md) [NEW in v2.0]
- [Dashboard](features/dashboard.md)

## API Documentation
- [User API](api/user-api.md)
- [Data API](api/data-api.md)

## Standards
- [Coding Style](standards/coding-style.md)
- [Git Workflow](standards/git-workflow.md)

## Guides
- [Deployment](guides/deployment.md)
- [Testing](guides/testing.md)

## Planning
- [TODO](planning/TODO.md)
- [Roadmap](planning/roadmap.md)

## Issues
- [Bug Fixes](issues/bug-fixes/)

## By Scenario
### Need to understand a feature?
-> Go to features/

### Need API details?
-> Go to api/

### Fixing a bug?
-> Go to issues/bug-fixes/

## Recent Updates
- YYYY-MM-DD: Added feature.md
- YYYY-MM-DD: Updated system-design.md
```

## Update Workflow

When user runs `/docs-map update`:

1. Scan project_docs/ for new/moved/deleted files
2. Re-scan source files, regenerate codemaps
3. If codemap diff > 30%, prompt for approval (see Diff Detection)
4. Rebuild INDEX.md with current file list
5. Check for orphan files (not in any category)
6. Report status (includes codemap freshness)

## Snapshot Workflow

When user runs `/docs-map snapshot` or release detected:

1. Prompt for version number if not provided
2. Generate snapshot from current state
3. Update CONTEXT.md version reference
4. Update INDEX.md with new snapshot link
5. Add entry to CHANGELOG.md

## Status Report

When user runs `/docs-map status`:

```
Docs Map Status
---------------
Folder: project_docs/

Layer 1: CONTEXT.md      [OK] 68 lines
Layer 2: v2.0-SNAPSHOT   [OK] 287 lines
Layer 3: Categories      [OK] 24 files

Codemaps:
- architecture.md  [FRESH] 45 lines, scanned 2h ago
- backend.md       [STALE] 62 lines, scanned 5d ago
- frontend.md      [FRESH] 38 lines, scanned 2h ago

Coverage:
- codemaps/    3 files  [AUTO]
- features/    3 files
- api/         2 files
- guides/      1 file   [LOW]
- planning/    2 files
- issues/      0 files  [EMPTY]

Orphan files: None
Last updated: YYYY-MM-DD
```

## Config File

Store in `.claude/docs-map.json`:

```json
{
  "folder": "project_docs",
  "language": "en",
  "projectSummary": "Brief description of what this project is",
  "currentVersion": "v2.0",
  "lastSnapshot": "2026-02-01",
  "autoSnapshot": true
}
```

## Resources

- See [references/templates.md](references/templates.md) for full templates
- See [references/detection-patterns.md](references/detection-patterns.md) for scanning rules
