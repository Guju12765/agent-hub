# Skills Configuration

Skills are reusable knowledge packages that extend your agent's capabilities.

**Location:** `~/.agent-hub/agents/<name>/skills/`

## Default Skills

Every agent comes with three built-in skills:

### 1. coding-standards

Best practices for code quality across languages.

**Location:** `skills/coding-standards/SKILL.md`

Covers:
- Naming conventions
- Code organization
- Error handling
- Documentation standards
- Performance considerations

### 2. python-patterns

Python-specific patterns and idioms.

**Location:** `skills/python-patterns/SKILL.md`

Covers:
- Pythonic code style
- Common patterns (context managers, decorators, generators)
- Type hints and annotations
- Testing patterns
- Package structure

### 3. continuous-learning-v2

Automatic learning from your coding patterns.

**Location:** `skills/continuous-learning-v2/`

Structure:
```
continuous-learning-v2/
├── SKILL.md              # Documentation
├── config.json           # Configuration
├── agents/
│   ├── observer.md       # Observer agent
│   └── start-observer.js # Startup script
├── hooks/
│   └── observe.js        # Observation hook
└── scripts/
    └── instinct-cli.js   # CLI tool
```

See [Continuous Learning](/concepts/continuous-learning) for details.

## Skill Structure

A skill is a directory with at least a `SKILL.md` file:

```
my-skill/
├── SKILL.md              # Required: skill documentation
├── config.json           # Optional: configuration
├── agents/               # Optional: related agents
├── hooks/                # Optional: automation hooks
└── scripts/              # Optional: utility scripts
```

### SKILL.md Format

```markdown
---
name: my-skill
description: Brief description of what this skill does
---

# My Skill

## Overview

What this skill provides and when to use it.

## Usage

How to use this skill effectively.

## Examples

Concrete examples of the skill in action.

## Configuration

Any configurable options (reference config.json if present).
```

## Adding Skills

### Manual Addition

Create a new skill directory:

```bash
mkdir -p ~/.agent-hub/agents/alice/skills/my-new-skill
code ~/.agent-hub/agents/alice/skills/my-new-skill/SKILL.md
```

### Via Command

Use the `/skill-create` command in Claude Code:

```
/skill-create my-new-skill "Description of the skill"
```

### From Templates

Clone an existing skill:

```bash
cp -r ~/.agent-hub/agents/alice/skills/coding-standards \
      ~/.agent-hub/agents/alice/skills/my-custom-standards
```

## Skill Deployment

When you run `agent-hub hire`:

1. Skills are copied from master to project
2. Skill-related hooks are merged into settings
3. Skill scripts are copied to scripts directory

```
Master: ~/.agent-hub/agents/alice/skills/
    ↓
Project: .claude/skills/
```

## Skill Discovery

Claude Code automatically discovers skills in `.claude/skills/` and makes them available during sessions.

## Best Practices

1. **Keep skills focused** - One skill, one purpose
2. **Document thoroughly** - SKILL.md should be comprehensive
3. **Include examples** - Show concrete usage
4. **Version config** - Use config.json for tunables
5. **Cross-platform scripts** - Use Node.js, not bash
