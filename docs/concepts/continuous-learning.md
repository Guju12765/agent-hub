# Continuous Learning

## Overview

Agent Hub includes a built-in continuous learning system that helps your agent learn from your coding patterns over time. It observes how you work and evolves "instincts" - pattern recognition rules that improve future suggestions.

## How It Works

```
┌─────────────┐    watches    ┌─────────────┐    evolves    ┌─────────────┐
│  Your Code  │ ───────────►  │  Observer   │ ───────────►  │  Instincts  │
│  Changes    │               │  Daemon     │               │  (Patterns) │
└─────────────┘               └─────────────┘               └─────────────┘
       │                            │                             │
       │                            │                             │
       └──────────── fs.watch() ────┘                             │
                                                                  ▼
                                                         Better suggestions
                                                         in future sessions
```

## Components

### Observer Daemon

A background process that watches for code changes:

- **Auto-starts** on SessionStart (no manual action needed)
- **Singleton** - one observer per project, shared across sessions
- **Cross-platform** - uses Node.js `fs.watch()` for file monitoring
- **Low overhead** - lightweight daemon process

### Observations

Raw data collected by the observer:

```markdown
## 2026-02-01 14:30
- Modified: src/components/Button.tsx
- Pattern: Added TypeScript types to props
- Context: User was fixing a type error
```

### Instincts

Pattern rules evolved from observations:

```markdown
## TypeScript Patterns
- Always add explicit return types to exported functions
- Prefer interface over type for object shapes
- Use const assertions for string literals
```

## Commands

### /evolve

Evolve instincts from accumulated observations:

```bash
/evolve
```

This analyzes recent observations and suggests new instincts or updates to existing ones.

### /instinct-status

Check the current state of the learning system:

```bash
/instinct-status
```

Shows:
- Observer daemon status
- Number of observations
- Current instincts

### /instinct-import

Import instincts from another source:

```bash
/instinct-import <file>
```

### /instinct-export

Export your instincts to share:

```bash
/instinct-export
```

## File Locations

```
.claude/skills/continuous-learning-v2/
├── SKILL.md              # Skill documentation
├── config.json           # Configuration
├── agents/
│   ├── observer.md       # Observer agent definition
│   └── start-observer.js # Observer startup script
├── hooks/
│   └── observe.js        # Observation hook
├── scripts/
│   └── instinct-cli.js   # CLI for instinct management
└── data/                 # Created at runtime
    ├── observations/     # Raw observations
    └── instincts/        # Evolved patterns
```

## Configuration

In `continuous-learning-v2/config.json`:

```json
{
  "enabled": true,
  "observePatterns": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  "ignorePatterns": ["node_modules/**", "dist/**", ".git/**"],
  "minObservationsForEvolve": 10
}
```

## No Manual Setup Required

The observer daemon:

1. **Starts automatically** when Claude Code launches (SessionStart hook)
2. **Stays running** across multiple sessions in the same project
3. **Never stops** on SessionEnd (persists for continuous learning)
4. **One per project** - handles multiple concurrent sessions

You don't need to manually start, stop, or manage the observer. Just use Claude Code normally and the system learns in the background.

## Privacy

Observations are stored locally in your project's `.claude/` directory. They never leave your machine unless you explicitly export them.
