# Backend Overview
> Last scanned: 2026-05-23 12:00

## Agent Module (src/agent/)
src/agent/
  |- index.ts          # Re-exports types, paths, manager
  |- types.ts          # AssetType, RegistryEntry, AgentManifest, DependencyConfig, GlobalConfig
  |- paths.ts          # ~/.agent-hub/ path helpers (base, cache, agents, config)
  |- manager.ts        # CRUD: createAgent, loadAgent, addAssets, removeAssets, deleteAgent, listAgents

## CLI Module (src/cli/)
src/cli/
  |- index.ts          # Command router (7 commands), help text, version 0.2.0
  |- commands/
      |- list.ts       # agent-hub list — sync registry, display grouped assets
      |- info.ts       # agent-hub info <name> — show asset details
      |- create.ts     # agent-hub create <agent> [assets...]
      |- add.ts        # agent-hub add <agent> [assets...]
      |- remove.ts     # agent-hub remove <agent> [assets...]
      |- agents.ts     # agent-hub agents — list local agents
      |- deploy.ts     # agent-hub deploy <agent> — local or registry agent

## Registry Module (src/registry/)
src/registry/
  |- index.ts          # Re-exports cache, fetch
  |- cache.ts          # readCachedIndex, writeCachedIndex (JSON files)
  |- fetch.ts          # resolveAssetPath, syncRegistry (git clone/pull), getAssetLocalPath
  |- registry.test.ts  # 7 tests

## Deploy Module (src/deploy/)
src/deploy/
  |- index.ts          # deployAgent orchestrator (recursive for nested agents)
  |- copy.ts           # copyAssetToProject — skills→.claude/skills/, rules→.claude/rules/, claude-md→.claude/CLAUDE.md
  |- dependencies.ts   # loadDependencyConfig, installDependency (with user prompt), toMcpEntry
  |- deploy.test.ts    # 4 tests

## Targets Module (src/targets/)
src/targets/
  |- index.ts          # Re-exports types, claude
  |- types.ts          # TargetAdapter interface, McpServerEntry, DeployResult
  |- claude.ts         # ClaudeAdapter — .claude/, .mcp.json, detect, injectMcp, removeMcp
