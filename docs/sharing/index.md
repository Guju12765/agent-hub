# Sharing Agents

> **Note:** Export, import, and clone features are planned but not yet implemented in the current version.

## Current Workaround

Until these features are implemented, you can manually share agents by copying directories:

### Manual Export

```bash
# Package an agent manually
cd ~/.agent-hub/agents/
tar -czf alice.tar.gz alice/
```

### Manual Import

```bash
# Extract to your agents directory
cd ~/.agent-hub/agents/
tar -xzf alice.tar.gz

# Update the registry
# (manually edit ~/.agent-hub/agents/registry.json to add the agent name)
```

### Manual Clone

```bash
# Copy an agent directory
cd ~/.agent-hub/agents/
cp -r alice alice-experimental

# Update metadata
# Edit ~/.agent-hub/agents/alice-experimental/agent.json
# Update the name field to "alice-experimental"
```

## Planned Features

The following commands are planned for future releases:

### Export (Planned)

```bash
agent-hub export <name> [options]
```

Package an agent as a shareable `.tar.gz` archive.

**Options:**
- `-o, --output <dir>` - Output directory (default: current)
- `-m, --include-memory` - Include memory files

### Import (Planned)

```bash
agent-hub import <archive> [options]
```

Install an agent from an archive.

**Options:**
- `-n, --name <name>` - Import with a different name
- `-f, --overwrite` - Overwrite if agent already exists

### Clone (Planned)

```bash
agent-hub clone <source> <target> [options]
```

Duplicate an existing agent locally.

**Options:**
- `-s, --specialty <desc>` - New specialty description
- `-m, --include-memory` - Copy memory from source agent

## Use Cases (When Implemented)

- **Experimentation** - Clone before making risky changes
- **Specialization** - Create variants for different roles
- **Backup** - Keep a copy before major updates
- **Team Sharing** - Share configured agents with teammates
- **Templates** - Create base agents to clone for new projects

## Privacy Considerations

When exporting/sharing agents:
- **Exclude memory by default** to protect sensitive information
- **Review configuration files** for API keys or secrets
- **Only share memory** with trusted parties or for personal backups

## Contributing

If you're interested in implementing these features, please see the [GitHub issues](https://github.com/anthropics/agent-hub/issues) or open a PR.
