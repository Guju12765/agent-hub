# Docs Map Templates

Full templates for generating docs map files. All files are created inside `project_docs/` folder.

## Table of Contents

1. [CONTEXT.md Template](#contextmd-template)
2. [Version Snapshot Template](#version-snapshot-template)
3. [INDEX.md Template](#indexmd-template)
4. [CHANGELOG.md Template](#changelogmd-template)
5. [Codemap Templates](#codemap-templates)

---

## CONTEXT.md Template

Location: `project_docs/CONTEXT.md`

```markdown
# Project Context Index v1.0

## Project Summary
A CLI tool for creating, configuring, and deploying AI agents with persistent memory.
Enables developers to define agent personalities, skills, and memory systems that
persist across sessions.

## Current Version Status
- Version: v1.0.0
- Last Updated: 2026-02-05
- Git Commit: abc1234
- Work Phase: development

## Quick Links
- [Docs Map](INDEX.md)
- [Current Snapshot](snapshots/v1.0-SNAPSHOT.md)
- [Changelog](CHANGELOG.md)
- [TODO](planning/TODO.md)

## Tech Stack
Node.js + TypeScript + SQLite

## Core Metrics
- Total Code: ~5000 lines
- Modules: 3

## Quick Start
npm run dev

## Current Focus
- [ ] Complete user authentication
- [ ] Optimize homepage performance
- [ ] Add unit tests
```

### Project Summary Guidelines

The Project Summary section should:
- Be 1-3 sentences
- Explain WHAT the project is
- Explain WHO it's for or WHAT problem it solves
- Be extracted from README.md when possible
- Be confirmed/edited by user during init

---

## Version Snapshot Template

Location: `project_docs/snapshots/vX.X-SNAPSHOT.md`

```markdown
# V1.0 Project Snapshot

## Project Summary
A CLI tool for creating, configuring, and deploying AI agents with persistent memory.

## Version Info
- Version: v1.0.0
- Release Date: 2026-02-05
- Key Commit: abc1234

## Core Changes
[NEW] Initial release
[NEW] User authentication system
[NEW] Dashboard module
[NEW] API endpoints

## Tech Stack
Node.js 20 + TypeScript 5.x + SQLite

## Directory Structure
src/
  |- components/     # UI components
  |- pages/          # Page components
  |- api/            # API routes
  |- utils/          # Utilities
  |- types/          # TypeScript types

## Feature List
1. User Authentication (login/logout/register)
2. Dashboard (data visualization)
3. Settings (user preferences)

## Business Rules Summary
- Authentication: JWT-based, 24h token expiry
- Permissions: admin and regular user roles
- Data: All user data encrypted at rest

## Known Issues
- [ ] Mobile responsiveness needs improvement
- [ ] Large dataset loading is slow

## Next Steps
- [ ] Add forgot password feature
- [ ] Implement dark mode
- [ ] Add export functionality

## Detailed Docs Index
- [API Docs](../api/)
- [Codemaps](../codemaps/)
- [Features](../features/)
```

---

## INDEX.md Template

Location: `project_docs/INDEX.md`

```markdown
# Documentation Index

## Quick Start

1. Read `CONTEXT.md` - 5 seconds to restore project context
2. Read current version snapshot - understand what's in this version
3. Use this index to find detailed documentation

## Version Snapshots
- [V1.0 Snapshot](snapshots/v1.0-SNAPSHOT.md) [CURRENT]

## Codemaps (Auto-generated)
- [Architecture](codemaps/architecture.md) - Overall project structure
- [Backend](codemaps/backend.md) - Backend modules and APIs
- [Frontend](codemaps/frontend.md) - Frontend components
- [Data](codemaps/data.md) - Data models and schemas

## Features
- [Authentication](features/authentication.md) - Login, logout, registration
- [Dashboard](features/dashboard.md) - Main dashboard functionality

## API Documentation
- [User API](api/user-api.md) - User-related endpoints
- [Data API](api/data-api.md) - Data manipulation endpoints

## Standards
- [Coding Style](standards/coding-style.md) - Code formatting and conventions
- [Git Workflow](standards/git-workflow.md) - Branch naming, commit messages

## Guides
- [Deployment Guide](guides/deployment.md) - How to deploy the application
- [Testing Guide](guides/testing.md) - How to run and write tests

## Planning
- [TODO](planning/TODO.md) - Current tasks and priorities
- [Roadmap](planning/roadmap.md) - Future plans

## Issues
- [Bug Fixes](issues/bug-fixes/) - Bug tracking and fixes

---

## By Scenario

### I need to understand a feature
Go to `features/` - each feature has its own documentation

### I need API details
Go to `api/` - all endpoints are documented with request/response examples

### I'm fixing a bug
Go to `issues/bug-fixes/` - check if the bug is already documented

### I need to understand the architecture
Go to `codemaps/` - auto-generated architecture and module maps

### I need coding standards
Go to `standards/` - coding style and git workflow

---

## Recent Updates
- 2026-02-05: Initial documentation structure created
```

---

## CHANGELOG.md Template

Location: `project_docs/CHANGELOG.md`

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
### Changed
### Fixed
### Removed

---

## [1.0.0] - 2026-02-05

### Added
- Initial release
- User authentication system
- Dashboard module
- API endpoints
- Documentation structure

### Changed
- N/A (initial release)

### Fixed
- N/A (initial release)
```

---

## Folder Structure

Complete structure created by `/docs-map init`:

```
project_docs/
  |- CONTEXT.md           # Layer 1 - Quick context
  |- INDEX.md             # Navigation hub
  |- CHANGELOG.md         # Change log
  |- snapshots/           # Layer 2 - Version snapshots
  |    |- v1.0-SNAPSHOT.md
  |- codemaps/            # Auto-generated code maps
  |    |- architecture.md # Always generated
  |    |- backend.md      # If backend detected
  |    |- frontend.md     # If frontend detected
  |    |- data.md         # If data layer detected
  |- features/            # Feature specifications
  |- api/                 # API documentation
  |- standards/           # Coding standards
  |- releases/            # Release notes
  |- issues/              # Bug tracking
  |- guides/              # How-to guides
  |- planning/            # TODO, roadmap
       |- TODO.md
```

---

## Codemap Templates

Location: `project_docs/codemaps/`

### architecture.md (Always Generated)

```markdown
# Architecture Overview
> Last scanned: 2026-02-05 14:30

## Project Type
Node.js + TypeScript backend with React frontend

## Structure
src/
  |- api/           # REST endpoints (12 files, 1.2k lines)
  |- services/      # Business logic (8 files, 900 lines)
  |- components/    # React UI (24 files, 2.1k lines)
  |- models/        # Data models (6 files, 400 lines)
  |- utils/         # Helpers (5 files, 300 lines)

## Entry Points
- src/index.ts      # Main server entry
- src/App.tsx       # Frontend entry

## Key Dependencies
express, prisma, react, zod

## Related Codemaps
- [Backend](backend.md)
- [Frontend](frontend.md)
- [Data Models](data.md)
```

### backend.md (If Backend Detected)

```markdown
# Backend Overview
> Last scanned: 2026-02-05 14:30

## Structure
src/api/
  |- users.ts       # createUser, getUser, updateUser
  |                 # imports: services/db, utils/validation
  |- auth.ts        # login, logout, refreshToken
  |                 # imports: services/jwt, models/user
  |- products.ts    # CRUD for products
  |                 # imports: services/db, models/product

src/services/
  |- db.ts          # Database connection, query helpers
  |- jwt.ts         # Token generation, validation
  |- email.ts       # Email sending service

## Entry Point
- src/index.ts      # Express server setup

## External Dependencies
express, prisma, jsonwebtoken, nodemailer
```

### frontend.md (If Frontend Detected)

```markdown
# Frontend Overview
> Last scanned: 2026-02-05 14:30

## Structure
src/components/
  |- ui/            # Reusable UI components (12 files)
  |   |- Button.tsx
  |   |- Input.tsx
  |   |- Modal.tsx
  |- features/      # Feature-specific components (8 files)
  |   |- auth/
  |   |- dashboard/

src/pages/
  |- index.tsx      # Home page
  |- login.tsx      # Login page
  |- dashboard.tsx  # Dashboard page

## Entry Point
- src/App.tsx       # Root component with routing

## External Dependencies
react, react-router, tailwindcss
```

### data.md (If Data Layer Detected)

```markdown
# Data Models Overview
> Last scanned: 2026-02-05 14:30

## Structure
src/models/
  |- user.ts        # User model, UserSchema
  |                 # fields: id, email, name, role
  |- product.ts     # Product model
  |                 # fields: id, name, price, stock
  |- order.ts       # Order model
  |                 # fields: id, userId, items, total

prisma/
  |- schema.prisma  # Database schema definition

## Key Relationships
- User -> Orders (1:many)
- Order -> Products (many:many via OrderItem)

## External Dependencies
prisma, zod
```

### Codemap Guidelines

1. **Token-lean**: Keep each codemap under 100 lines
2. **Freshness timestamp**: Always include `> Last scanned: YYYY-MM-DD HH:mm`
3. **Tree format**: Use tree structure with inline annotations
4. **Key exports**: List main exports for important files
5. **Dependencies**: Show both internal imports and external packages
