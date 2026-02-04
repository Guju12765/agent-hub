# Plugins Configuration

Configure Claude Code plugins your agent depends on.

**Location:** `~/.agent-hub/agents/<name>/plugins.json`

## Default Template

```json
{
  "_comment": "Plugin dependencies. Plugins are downloaded on hire.",
  "plugins": []
}
```

## Example Configuration

```json
{
  "plugins": [
    { "name": "superpowers", "version": "4.1.1" },
    { "name": "my-custom-plugin", "version": "^1.0.0" }
  ]
}
```

## What Are Plugins?

Claude Code plugins add:

- **Skills** - Reusable workflows and knowledge
- **Commands** - Custom slash commands
- **Rules** - Coding standards and guidelines
- **Hooks** - Automation triggers

## Current Status

::: warning Note
Automatic plugin installation from a registry is planned for future versions.
Currently, plugins must be installed manually via Claude Code.
:::

## Manual Plugin Installation

Until automatic installation is available:

```bash
# In Claude Code
/plugins install superpowers
```

## Plugin vs Agent Config

| Feature | Plugin | Agent Config |
|---------|--------|--------------|
| Skills | Shared across users | Personal to agent |
| Scope | Global | Per-agent |
| Updates | Via registry | Manual edit |
| Portability | Install anywhere | Export/import |

Use plugins for widely-shared functionality. Use agent config for personal
workflows and project-specific knowledge.
