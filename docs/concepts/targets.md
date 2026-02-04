# Target Platforms

Agent Hub deploys to multiple AI coding assistants via target adapters.

## Supported Targets

| Target | Status | Config Location |
|--------|--------|-----------------|
| Claude Code | ✅ Full support | `.claude/settings.json` |
| Codex CLI | 🚧 Placeholder | `.codex/` |

## How Targets Work

Each target has an adapter that handles:

1. **Settings location** - Where to inject MCP config
2. **Instructions file** - CLAUDE.md, codex.md, etc.
3. **MCP format** - How to configure the memory server
4. **Hooks format** - Platform-specific hook syntax

## Using Targets

### Auto-detect (default)

Agent Hub automatically detects which platform you're using:

```bash
agent-hub hire alice
# Detects Claude Code, uses claude adapter
```

### Explicit Target

Specify a target explicitly:

```bash
agent-hub hire alice --target claude
agent-hub hire alice --target codex
```

### List Available Targets

```bash
agent-hub targets
```

**Output:**
```
Available targets:
  claude    Claude Code         ✓ Supported
  codex     Codex CLI           ○ Placeholder
```

## Target Adapters

### Claude Code Adapter

- **Settings:** `.claude/settings.json`
- **Instructions:** `CLAUDE.md` (project root)
- **MCP format:** Standard MCP server config
- **Hooks:** Claude Code hook format

What gets injected:

```json
{
  "mcpServers": {
    "alice-memory": {
      "command": "npx",
      "args": ["agent-hub", "--agent", "alice", "--project"]
    }
  },
  "hooks": {
    "SessionStart": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node .claude/skills/continuous-learning-v2/agents/start-observer.js start"
      }]
    }]
  }
}
```

### Codex CLI Adapter (Placeholder)

Currently a placeholder for future implementation. Contributions welcome!

## Adding New Targets

Target adapters implement the `TargetAdapter` interface:

```typescript
interface TargetAdapter {
  name: string;
  displayName: string;
  isSupported(): boolean;
  getSettingsDir(global: boolean): string;
  convertIdentity(content: string, agentName: string): string;
  appendIdentity(content: string, agentName: string): void;
  injectMcp(name: string, config: object, global: boolean): void;
  injectHooks(hooks: object, global: boolean): void;
}
```

To add a new target:

1. Create adapter in `src/targets/<name>.ts`
2. Implement the `TargetAdapter` interface
3. Register in `src/targets/index.ts`
4. Add tests
