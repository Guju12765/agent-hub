# Skills Configuration

Skills are reusable knowledge packages that extend your agent's capabilities.

**Location:** `~/.agent-hub/agents/<name>/skills/`

## Default Skills

Every agent comes with two built-in skills:

### 1. memory-summarization

Save session state and memories at PreCompact.

**Location:** `skills/memory-summarization/SKILL.md`

Used by the PreCompact hook to prompt saving:
- Session logs (current state, progress, decisions)
- Daily logs (timestamped learnings)
- MEMORY.md updates (durable facts and preferences)

### 2. skill-creator

Helper for creating new skills.

**Location:** `skills/skill-creator/`

Structure:
```
skill-creator/
├── SKILL.md                    # Documentation
├── LICENSE.txt                 # License template
├── references/
│   ├── output-patterns.md      # Output format examples
│   └── workflows.md            # Workflow patterns
└── scripts/
    ├── init_skill.py           # Initialize new skill
    ├── package_skill.py        # Package for sharing
    └── quick_validate.py       # Validate skill structure
```

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

### Updating Skills

If you add new skills to the master and want to deploy them to an existing project:

```bash
# Update with conflict resolution
agent-hub hire alice --update

# Force replace all skills
agent-hub hire alice --update --force-replace
```

When skill directories conflict, you'll be prompted to keep, replace, merge, or diff. If you choose replace, each file inside the skill directory is checked individually - so you can keep your customizations to specific files while updating others.

## Skill Discovery

Claude Code automatically discovers skills in `.claude/skills/` and makes them available during sessions.

## Best Practices

1. **Keep skills focused** - One skill, one purpose
2. **Document thoroughly** - SKILL.md should be comprehensive
3. **Include examples** - Show concrete usage
4. **Version config** - Use config.json for tunables
5. **Cross-platform scripts** - Use Node.js, not bash
