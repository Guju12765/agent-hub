# Detection Patterns

Scanning rules for detecting project information, classifying documents, and generating codemaps. Used when running `/docs-map init` or `/docs-map update`.

## Table of Contents

1. [Project Info Detection](#project-info-detection)
2. [Tech Stack Detection](#tech-stack-detection)
3. [Document Classification](#document-classification)
4. [Directory Structure Analysis](#directory-structure-analysis)
5. [Codemap Detection](#codemap-detection)

---

## Project Info Detection

### Project Name

Check files in order:
1. `package.json` -> `name` field
2. `Cargo.toml` -> `[package] name`
3. `go.mod` -> `module` line
4. `pyproject.toml` -> `[project] name` or `[tool.poetry] name`
5. `setup.py` -> `name` parameter
6. Directory name as fallback

### Version

Check in order:
1. `package.json` -> `version` field
2. `Cargo.toml` -> `[package] version`
3. `pyproject.toml` -> `version` field
4. Git tags -> latest `v*` tag
5. Default to `v0.1.0`

### Git Commit

```bash
git rev-parse --short HEAD
```

### Quick Start Command

Check `package.json` scripts:
- `dev` -> `npm run dev`
- `start` -> `npm start`
- `serve` -> `npm run serve`

Check for other files:
- `Makefile` -> `make run` or `make dev`
- `docker-compose.yml` -> `docker-compose up`
- `manage.py` -> `python manage.py runserver`

---

## Tech Stack Detection

### By File Extension Count

Scan project and count extensions:

| Extensions | Stack |
|------------|-------|
| .ts, .tsx | TypeScript |
| .js, .jsx | JavaScript |
| .py | Python |
| .rs | Rust |
| .go | Go |
| .java | Java |
| .rb | Ruby |
| .php | PHP |

### By Config Files

| File | Technology |
|------|------------|
| package.json | Node.js |
| tsconfig.json | TypeScript |
| next.config.js | Next.js |
| vite.config.ts | Vite |
| webpack.config.js | Webpack |
| tailwind.config.js | Tailwind CSS |
| Cargo.toml | Rust |
| go.mod | Go |
| pyproject.toml | Python |
| requirements.txt | Python |
| Gemfile | Ruby |
| composer.json | PHP |

### By Dependencies

Check package.json dependencies for:
- `react` -> React
- `vue` -> Vue
- `angular` -> Angular
- `express` -> Express
- `fastify` -> Fastify
- `next` -> Next.js
- `nuxt` -> Nuxt

---

## Document Classification

### Keyword-Based Classification

Scan first 500 characters of document for keywords:

#### api/
- "API", "endpoint", "REST", "GraphQL"
- "request", "response", "HTTP"
- "GET", "POST", "PUT", "DELETE"
- "authentication", "authorization"

#### architecture/
- "architecture", "system design"
- "data flow", "sequence diagram"
- "component diagram", "ERD"
- "database schema", "infrastructure"

#### features/
- "feature", "user story"
- "requirement", "specification"
- "use case", "acceptance criteria"

#### guides/
- "how to", "guide", "tutorial"
- "step by step", "instructions"
- "getting started", "setup"

#### issues/
- "bug", "fix", "issue"
- "problem", "error", "crash"
- "regression", "hotfix"

#### standards/
- "standard", "convention", "style"
- "guideline", "best practice"
- "coding style", "lint"

#### releases/
- "release", "version", "changelog"
- "migration", "upgrade"
- "breaking change"

#### planning/
- "todo", "roadmap", "plan"
- "milestone", "sprint"
- "backlog", "priority"

### Filename-Based Classification

| Pattern | Category |
|---------|----------|
| `*-api.md`, `api-*.md` | api/ |
| `*-guide.md`, `guide-*.md` | guides/ |
| `*-design.md`, `architecture*.md` | architecture/ |
| `*-feature.md`, `feature-*.md` | features/ |
| `TODO*.md`, `ROADMAP*.md` | planning/ |
| `CHANGELOG*.md`, `RELEASE*.md` | releases/ |
| `*-style.md`, `*-convention.md` | standards/ |
| `*-bug.md`, `*-fix.md` | issues/ |

---

## Directory Structure Analysis

### Key Directories to Document

Scan for these common patterns:

| Directory | Description |
|-----------|-------------|
| src/ | Source code |
| lib/ | Libraries |
| app/ | Application code |
| components/ | UI components |
| pages/ | Page components |
| api/ | API routes |
| routes/ | Route handlers |
| controllers/ | Controllers |
| models/ | Data models |
| services/ | Business logic |
| utils/ | Utilities |
| helpers/ | Helper functions |
| types/ | Type definitions |
| config/ | Configuration |
| scripts/ | Build/dev scripts |
| tests/ | Test files |
| docs/ | Documentation |

### Code Metrics

Count lines of code:
```bash
find . -name "*.ts" -o -name "*.js" -o -name "*.py" | xargs wc -l
```

Or use `cloc` if available:
```bash
cloc --md .
```

### Module Detection

Count top-level directories under src/ or app/ as modules.

---

## Codemap Detection

Patterns for detecting which codemaps to generate.

### Backend Detection

Generate `codemaps/backend.md` if ANY of these are true:

**By Directory:**
- `src/server/` exists
- `src/api/` exists
- `server/` exists
- `api/` exists
- `routes/` exists
- `controllers/` exists

**By Dependencies (package.json):**
- `express`
- `fastify`
- `koa`
- `hono`
- `nest` or `@nestjs/*`

**By Python:**
- `flask` in requirements.txt/pyproject.toml
- `django` in requirements.txt/pyproject.toml
- `fastapi` in requirements.txt/pyproject.toml

### Frontend Detection

Generate `codemaps/frontend.md` if ANY of these are true:

**By Directory:**
- `src/components/` exists
- `src/pages/` exists
- `components/` exists
- `pages/` exists
- `views/` exists
- `src/app/` exists (Next.js app router)

**By Dependencies (package.json):**
- `react`
- `vue`
- `svelte`
- `angular` or `@angular/*`
- `solid-js`
- `preact`

**By Config Files:**
- `next.config.js` or `next.config.mjs`
- `nuxt.config.js` or `nuxt.config.ts`
- `vite.config.ts` with React/Vue/Svelte plugin

### Data Layer Detection

Generate `codemaps/data.md` if ANY of these are true:

**By Directory:**
- `src/models/` exists
- `models/` exists
- `schemas/` exists
- `prisma/` exists
- `drizzle/` exists
- `src/entities/` exists (TypeORM)

**By Files:**
- `*.prisma` files exist
- `*.sql` files exist (in migrations/ or similar)
- `schema.ts` or `schema.js` exists

**By Dependencies:**
- `prisma` or `@prisma/client`
- `drizzle-orm`
- `typeorm`
- `sequelize`
- `mongoose`
- `knex`

### JS/TS Import Scanning

For JavaScript/TypeScript projects, scan imports in key files:

**Files to Scan:**
1. Entry points: `index.ts`, `main.ts`, `app.ts`, `server.ts`
2. Files in `api/`, `routes/`, `services/`, `controllers/`
3. Limit: First 100 files matching pattern

**Extract:**
```javascript
// From this:
import { createUser, getUser } from './services/user'
import express from 'express'

// Extract:
// - Exports: createUser, getUser
// - Internal deps: ./services/user
// - External deps: express
```

**Scanning Rules:**
- Skip `node_modules/`, `dist/`, `build/`, `.git/`
- Timeout: 10 seconds per codemap
- Parse only top-level imports (not dynamic imports)

### Diff Calculation

For determining if codemap changes require approval:

```
diff_percent = (added_lines + removed_lines) / total_lines * 100

if diff_percent > 30:
    prompt_for_approval()
else:
    update_silently()
```

**Store metadata in `.claude/docs-map.json`:**
```json
{
  "codemaps": {
    "lastScan": "2026-02-05T14:30:00Z",
    "files": {
      "architecture.md": {
        "lines": 45,
        "hash": "sha256:abc123..."
      },
      "backend.md": {
        "lines": 62,
        "hash": "sha256:def456..."
      }
    }
  }
}
```

### Freshness Indicators

Determine freshness for status report:

| Age | Status |
|-----|--------|
| < 24 hours | [FRESH] |
| 1-7 days | [OK] |
| > 7 days | [STALE] |
