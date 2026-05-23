# ADK Rescope Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rescope agent-hub from a memory-centric MCP server into a zero-dependency CLI for composing and deploying AI assistant configurations from a GitHub registry.

**Architecture:** CLI-only Node.js tool. Assets (skills, rules, claude-md, dependencies) live in a central GitHub registry. Users cherry-pick assets into local "agents," then deploy agents to projects by copying files into `.claude/` and wiring `.mcp.json`. Zero runtime dependencies — use Node built-ins and shell out to `git`.

**Tech Stack:** TypeScript, Node.js built-ins (`fs`, `path`, `https`, `child_process`), Vitest for tests

**Design Doc:** `project_docs/planning/2026-05-23-adk-rescope-design.md`

---

## Task 1: Clean Slate — Archive Dead Code and Strip Dependencies

**Files:**
- Archive: `src/storage/`, `src/utils/`, `src/agent/promote.ts`, `src/agent/sync.ts`, `src/agent/templates.ts`, `src/agent/config-loader.ts`
- Modify: `src/agent/index.ts`
- Modify: `package.json`
- Modify: `src/targets/types.ts`
- Modify: `src/targets/claude.ts`

**Step 1: Archive remaining dead code**

```bash
mkdir -p archive/agent archive/storage archive/utils
git mv src/storage/atomic-reindex.ts archive/storage/
git mv src/storage/index.ts archive/storage/
git mv src/utils/retry.ts archive/utils/
git mv src/utils/index.ts archive/utils/
git mv src/agent/promote.ts archive/agent/
git mv src/agent/sync.ts archive/agent/
git mv src/agent/templates.ts archive/agent/
git mv src/agent/config-loader.ts archive/agent/
```

**Step 2: Update `src/agent/index.ts` — remove archived exports**

```typescript
/**
 * Agent module exports
 */

export * from "./types.js";
export * from "./paths.js";
export * from "./manager.js";
```

**Step 3: Remove `HooksConfig`/`McpServerConfig` import from `src/targets/types.ts`**

Remove the import line `import type { McpServerConfig, HooksConfig } from "../agent/config-loader.js";` and inline or simplify the types. The `McpConfig` interface should use a simple inline type:

```typescript
/**
 * Target adapter interface for multi-platform support
 */

export type TargetName = "claude";

export interface McpServerEntry {
  type?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface DeployResult {
  success: boolean;
  message: string;
  assetsCopied?: number;
  mcpsConfigured?: number;
}

/**
 * Target adapter interface
 * Each platform (Claude Code, Codex CLI, etc.) implements this interface
 */
export interface TargetAdapter {
  readonly name: TargetName;
  readonly displayName: string;

  detect(): boolean;
  getSettingsDir(): string;
  getConfigDirs(settingsDir: string): {
    skills: string;
    rules: string;
  };
  getMcpConfigPath(): string;
  getInstructionsDir(): string;

  injectMcp(name: string, config: McpServerEntry): { added: boolean; skipped: boolean };
  removeMcp(name: string): boolean;
  isSupported(): boolean;
}
```

**Step 4: Simplify `src/targets/claude.ts`**

Remove the `HooksConfig` import and the `injectHooks` method. Simplify `injectMcp` to accept a single `McpServerEntry` instead of the old batch format. Remove the `global` parameter from all methods (deploy is always project-local). Remove the old agent-hub MCP server injection from `injectMcp` — it should only wire external dependencies now.

Keep: `detect()`, `getSettingsDir()`, `getConfigDirs()`, `getMcpConfigPath()`, `injectMcp()`, `removeMcp()`, `isSupported()`.

Add: `getInstructionsDir()` returning `join(process.cwd(), ".claude")` for CLAUDE.md placement.

**Step 5: Remove `src/targets/index.ts` re-export of old types, simplify to:**

```typescript
export * from "./types.js";
export * from "./claude.js";
```

**Step 6: Strip all runtime dependencies from `package.json`**

```json
{
  "dependencies": {}
}
```

Remove: `@modelcontextprotocol/sdk`, `better-sqlite3`, `chokidar`, `node-llama-cpp`, `openai`, `sqlite-vec`, `tar`

Also remove their `@types/*` devDependencies: `@types/better-sqlite3`, `@types/tar`

Keep devDependencies: `tsx`, `typescript`, `vitest`, `@types/node`, `vitepress` (for docs)

**Step 7: Update `copy-templates` build script in `package.json`**

Remove the `copy-templates` script and the `&& npm run copy-templates` from the `build` script since templates are now in the registry, not bundled:

```json
"build": "tsc",
```

**Step 8: Run type check**

Run: `npx tsc --noEmit`
Expected: Errors from `src/cli/commands/` files that import old modules. That's fine — we'll rewrite those in the next tasks.

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: archive dead code and strip runtime dependencies"
```

---

## Task 2: Rewrite Core Types and Paths

**Files:**
- Modify: `src/agent/types.ts`
- Modify: `src/agent/paths.ts`
- Modify: `src/agent/manager.ts`

**Step 1: Rewrite `src/agent/types.ts`**

```typescript
/**
 * Core types for agent-hub ADK
 */

/** Asset types supported by the registry */
export type AssetType = "skill" | "rule" | "claude-md" | "dependency" | "agent";

/** An entry in the registry index */
export interface RegistryEntry {
  name: string;
  type: AssetType;
  description: string;
  source?: string; // For third-party assets: "github:user/repo"
}

/** Asset metadata (asset.json in registry) */
export interface AssetMeta {
  name: string;
  type: AssetType;
  description: string;
  version?: string;
  author?: string;
}

/** Agent manifest (local or registry) */
export interface AgentManifest {
  name: string;
  description?: string;
  assets: string[];
  created?: string;
}

/** Dependency config (config.json in registry) */
export interface DependencyConfig {
  install: string;
  mcp?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
}

/** Global config (~/.agent-hub/config.json) */
export interface GlobalConfig {
  registryUrl: string;
  defaultTarget: string;
}
```

**Step 2: Rewrite `src/agent/paths.ts`**

Strip all memory-related paths. Keep it focused on agent-hub local storage:

```typescript
/**
 * Agent Hub filesystem paths
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

/** Base directory for agent-hub data */
export function getBaseDir(): string {
  return join(homedir(), ".agent-hub");
}

/** Global config path */
export function getConfigPath(): string {
  return join(getBaseDir(), "config.json");
}

/** Registry cache directory */
export function getCacheDir(): string {
  return join(getBaseDir(), "cache");
}

/** Cached registry index path */
export function getCachedIndexPath(): string {
  return join(getCacheDir(), "index.json");
}

/** Cached registry repo path */
export function getCachedRegistryPath(): string {
  return join(getCacheDir(), "registry");
}

/** Agents directory */
export function getAgentsDir(): string {
  return join(getBaseDir(), "agents");
}

/** Specific agent manifest path */
export function getAgentPath(name: string): string {
  return join(getAgentsDir(), `${name}.json`);
}

/** Check if an agent exists locally */
export function agentExists(name: string): boolean {
  return existsSync(getAgentPath(name));
}

/** Ensure base directories exist */
export function ensureDirs(): void {
  const dirs = [getBaseDir(), getCacheDir(), getAgentsDir()];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
```

**Step 3: Rewrite `src/agent/manager.ts`**

```typescript
/**
 * Agent CRUD operations
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { getAgentPath, getAgentsDir, agentExists, ensureDirs } from "./paths.js";
import type { AgentManifest } from "./types.js";

/** Create a new agent with selected assets */
export function createAgent(name: string, assets: string[]): AgentManifest {
  ensureDirs();

  if (agentExists(name)) {
    throw new Error(`Agent "${name}" already exists`);
  }

  const manifest: AgentManifest = {
    name,
    assets,
    created: new Date().toISOString().split("T")[0],
  };

  writeFileSync(getAgentPath(name), JSON.stringify(manifest, null, 2));
  return manifest;
}

/** Load an agent manifest */
export function loadAgent(name: string): AgentManifest {
  const path = getAgentPath(name);
  if (!existsSync(path)) {
    throw new Error(`Agent "${name}" not found`);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

/** Add assets to an existing agent */
export function addAssets(name: string, assets: string[]): AgentManifest {
  const manifest = loadAgent(name);
  const newAssets = assets.filter((a) => !manifest.assets.includes(a));
  const updated = { ...manifest, assets: [...manifest.assets, ...newAssets] };
  writeFileSync(getAgentPath(name), JSON.stringify(updated, null, 2));
  return updated;
}

/** Remove assets from an agent */
export function removeAssets(name: string, assets: string[]): AgentManifest {
  const manifest = loadAgent(name);
  const updated = { ...manifest, assets: manifest.assets.filter((a) => !assets.includes(a)) };
  writeFileSync(getAgentPath(name), JSON.stringify(updated, null, 2));
  return updated;
}

/** Delete an agent */
export function deleteAgent(name: string): void {
  const path = getAgentPath(name);
  if (!existsSync(path)) {
    throw new Error(`Agent "${name}" not found`);
  }
  unlinkSync(path);
}

/** List all local agents */
export function listAgents(): AgentManifest[] {
  const dir = getAgentsDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")));
}

import { join } from "node:path";
```

**Step 4: Update `src/agent/index.ts`**

```typescript
export * from "./types.js";
export * from "./paths.js";
export * from "./manager.js";
```

**Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: Errors only in `src/cli/commands/` (not yet rewritten) and possibly `src/targets/claude.ts` if not yet updated.

**Step 6: Commit**

```bash
git add src/agent/
git commit -m "refactor: rewrite core types, paths, and agent manager for ADK"
```

---

## Task 3: Registry Module — Fetch and Cache

**Files:**
- Create: `src/registry/index.ts`
- Create: `src/registry/fetch.ts`
- Create: `src/registry/cache.ts`
- Test: `src/registry/registry.test.ts`

**Step 1: Write the test for cache operations**

Create `src/registry/registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readCachedIndex, writeCachedIndex } from "./cache.js";
import { resolveAssetPath } from "./fetch.js";
import type { RegistryEntry } from "../agent/types.js";

const TEST_DIR = join(tmpdir(), "agent-hub-test-registry");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("cache", () => {
  it("reads and writes index", () => {
    const entries: RegistryEntry[] = [
      { name: "debugging", type: "skill", description: "Debug workflows" },
    ];
    const indexPath = join(TEST_DIR, "index.json");
    writeCachedIndex(indexPath, entries);
    const result = readCachedIndex(indexPath);
    expect(result).toEqual(entries);
  });

  it("returns empty array for missing index", () => {
    const result = readCachedIndex(join(TEST_DIR, "missing.json"));
    expect(result).toEqual([]);
  });
});

describe("resolveAssetPath", () => {
  it("resolves skill path in registry", () => {
    const entry: RegistryEntry = { name: "debugging", type: "skill", description: "test" };
    expect(resolveAssetPath(entry)).toBe("skills/debugging");
  });

  it("resolves rule path", () => {
    const entry: RegistryEntry = { name: "coding-style", type: "rule", description: "test" };
    expect(resolveAssetPath(entry)).toBe("rules/coding-style");
  });

  it("resolves claude-md path", () => {
    const entry: RegistryEntry = { name: "senior-engineer", type: "claude-md", description: "test" };
    expect(resolveAssetPath(entry)).toBe("claude-md/senior-engineer");
  });

  it("resolves dependency path", () => {
    const entry: RegistryEntry = { name: "qmd", type: "dependency", description: "test" };
    expect(resolveAssetPath(entry)).toBe("dependencies/qmd");
  });

  it("resolves agent path", () => {
    const entry: RegistryEntry = { name: "fullstack", type: "agent", description: "test" };
    expect(resolveAssetPath(entry)).toBe("agents/fullstack");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/registry/registry.test.ts`
Expected: FAIL — modules don't exist yet

**Step 3: Implement `src/registry/cache.ts`**

```typescript
/**
 * Local cache for registry index
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { RegistryEntry } from "../agent/types.js";

/** Read cached registry index */
export function readCachedIndex(path: string): RegistryEntry[] {
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

/** Write registry index to cache */
export function writeCachedIndex(path: string, entries: RegistryEntry[]): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(entries, null, 2));
}
```

**Step 4: Implement `src/registry/fetch.ts`**

```typescript
/**
 * Fetch assets from the GitHub registry
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import type { RegistryEntry } from "../agent/types.js";
import { getCachedRegistryPath } from "../agent/paths.js";

const TYPE_TO_DIR: Record<string, string> = {
  skill: "skills",
  rule: "rules",
  "claude-md": "claude-md",
  dependency: "dependencies",
  agent: "agents",
};

/** Resolve the registry path for an asset entry */
export function resolveAssetPath(entry: RegistryEntry): string {
  const dir = TYPE_TO_DIR[entry.type];
  return `${dir}/${entry.name}`;
}

/** Clone or update the registry repo */
export function syncRegistry(registryUrl: string): string {
  const localPath = getCachedRegistryPath();

  if (existsSync(localPath)) {
    execSync("git pull --ff-only", { cwd: localPath, stdio: "pipe" });
  } else {
    mkdirSync(localPath, { recursive: true });
    execSync(`git clone --depth 1 ${registryUrl} ${localPath}`, { stdio: "pipe" });
  }

  return localPath;
}

/** Get the local filesystem path for an asset in the cached registry */
export function getAssetLocalPath(entry: RegistryEntry): string {
  const registryPath = getCachedRegistryPath();
  const assetPath = resolveAssetPath(entry);
  return `${registryPath}/${assetPath}`;
}
```

**Step 5: Implement `src/registry/index.ts`**

```typescript
export * from "./cache.js";
export * from "./fetch.js";
```

**Step 6: Run tests**

Run: `npx vitest run src/registry/registry.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/registry/
git commit -m "feat: add registry module with fetch, cache, and asset resolution"
```

---

## Task 4: Deploy Module — Copy Assets to Project

**Files:**
- Create: `src/deploy/index.ts`
- Create: `src/deploy/copy.ts`
- Create: `src/deploy/dependencies.ts`
- Test: `src/deploy/deploy.test.ts`

**Step 1: Write the test**

Create `src/deploy/deploy.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { copyAssetToProject } from "./copy.js";
import type { RegistryEntry } from "../agent/types.js";

const TEST_DIR = join(tmpdir(), "agent-hub-test-deploy");
const REGISTRY_DIR = join(TEST_DIR, "registry");
const PROJECT_DIR = join(TEST_DIR, "project");

beforeEach(() => {
  mkdirSync(join(REGISTRY_DIR, "skills", "debugging"), { recursive: true });
  mkdirSync(join(REGISTRY_DIR, "rules", "coding-style"), { recursive: true });
  mkdirSync(join(REGISTRY_DIR, "claude-md", "senior"), { recursive: true });
  mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });

  writeFileSync(join(REGISTRY_DIR, "skills", "debugging", "SKILL.md"), "# Debugging");
  writeFileSync(join(REGISTRY_DIR, "rules", "coding-style", "coding-style.md"), "# Style");
  writeFileSync(join(REGISTRY_DIR, "claude-md", "senior", "CLAUDE.md"), "# Senior");
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("copyAssetToProject", () => {
  it("copies skill to .claude/skills/", () => {
    const entry: RegistryEntry = { name: "debugging", type: "skill", description: "test" };
    copyAssetToProject(entry, REGISTRY_DIR, PROJECT_DIR);
    expect(existsSync(join(PROJECT_DIR, ".claude", "skills", "debugging", "SKILL.md"))).toBe(true);
  });

  it("copies rule to .claude/rules/", () => {
    const entry: RegistryEntry = { name: "coding-style", type: "rule", description: "test" };
    copyAssetToProject(entry, REGISTRY_DIR, PROJECT_DIR);
    expect(existsSync(join(PROJECT_DIR, ".claude", "rules", "coding-style.md"))).toBe(true);
  });

  it("copies claude-md to .claude/CLAUDE.md", () => {
    const entry: RegistryEntry = { name: "senior", type: "claude-md", description: "test" };
    copyAssetToProject(entry, REGISTRY_DIR, PROJECT_DIR);
    expect(readFileSync(join(PROJECT_DIR, ".claude", "CLAUDE.md"), "utf-8")).toBe("# Senior");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/deploy/deploy.test.ts`
Expected: FAIL

**Step 3: Implement `src/deploy/copy.ts`**

```typescript
/**
 * Copy assets from cached registry to project
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import type { RegistryEntry } from "../agent/types.js";
import { resolveAssetPath } from "../registry/fetch.js";

/** Copy a single asset to the project's .claude/ directory */
export function copyAssetToProject(
  entry: RegistryEntry,
  registryPath: string,
  projectDir: string,
): void {
  const assetDir = join(registryPath, resolveAssetPath(entry));
  const claudeDir = join(projectDir, ".claude");

  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  switch (entry.type) {
    case "skill": {
      const targetDir = join(claudeDir, "skills", entry.name);
      mkdirSync(targetDir, { recursive: true });
      copyDirContents(assetDir, targetDir, ["asset.json"]);
      break;
    }
    case "rule": {
      const targetDir = join(claudeDir, "rules");
      mkdirSync(targetDir, { recursive: true });
      // Copy all .md files except asset.json
      const files = readdirSync(assetDir).filter((f) => f !== "asset.json" && f.endsWith(".md"));
      for (const file of files) {
        copyFileSync(join(assetDir, file), join(targetDir, file));
      }
      break;
    }
    case "claude-md": {
      const sourceFile = join(assetDir, "CLAUDE.md");
      if (existsSync(sourceFile)) {
        writeFileSync(join(claudeDir, "CLAUDE.md"), readFileSync(sourceFile, "utf-8"));
      }
      break;
    }
    // Dependencies handled separately in dependencies.ts
  }
}

/** Copy directory contents, excluding specified files */
function copyDirContents(src: string, dest: string, exclude: string[]): void {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDirContents(srcPath, destPath, exclude);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
```

**Step 4: Implement `src/deploy/dependencies.ts`**

```typescript
/**
 * Install and wire external dependencies
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import type { RegistryEntry, DependencyConfig } from "../agent/types.js";
import type { McpServerEntry } from "../targets/types.js";
import { resolveAssetPath } from "../registry/fetch.js";

/** Load dependency config from registry */
export function loadDependencyConfig(
  entry: RegistryEntry,
  registryPath: string,
): DependencyConfig {
  const configPath = join(registryPath, resolveAssetPath(entry), "config.json");
  if (!existsSync(configPath)) {
    throw new Error(`Dependency config not found: ${configPath}`);
  }
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

/** Prompt user and install a dependency */
export async function installDependency(
  entry: RegistryEntry,
  config: DependencyConfig,
): Promise<boolean> {
  const answer = await askUser(`Install ${entry.name}? (${config.install}) [Y/n] `);
  if (answer.toLowerCase() === "n") {
    return false;
  }

  console.log(`Installing ${entry.name}...`);
  try {
    execSync(config.install, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(`Failed to install ${entry.name}: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

/** Convert dependency config to MCP server entry */
export function toMcpEntry(config: DependencyConfig): McpServerEntry | null {
  if (!config.mcp) return null;
  return {
    command: config.mcp.command,
    args: config.mcp.args,
    env: config.mcp.env,
  };
}

/** Simple user prompt */
function askUser(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim() || "y");
    });
  });
}
```

**Step 5: Implement `src/deploy/index.ts`**

```typescript
/**
 * Deploy orchestration
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentManifest, RegistryEntry } from "../agent/types.js";
import { readCachedIndex } from "../registry/cache.js";
import { getCachedIndexPath, getCachedRegistryPath } from "../agent/paths.js";
import { copyAssetToProject } from "./copy.js";
import { loadDependencyConfig, installDependency, toMcpEntry } from "./dependencies.js";
import { claudeAdapter } from "../targets/claude.js";

/** Deploy an agent's assets to the current project */
export async function deployAgent(manifest: AgentManifest, projectDir: string): Promise<void> {
  const index = readCachedIndex(getCachedIndexPath());
  const registryPath = getCachedRegistryPath();

  if (index.length === 0) {
    throw new Error("Registry not cached. Run 'agent-hub list' first to fetch the registry.");
  }

  console.log(`Deploying agent "${manifest.name}" to ${projectDir}...`);

  let copied = 0;
  let depsInstalled = 0;

  for (const assetName of manifest.assets) {
    const entry = index.find((e) => e.name === assetName);
    if (!entry) {
      console.error(`  Warning: asset "${assetName}" not found in registry, skipping`);
      continue;
    }

    if (entry.type === "dependency") {
      const config = loadDependencyConfig(entry, registryPath);
      const installed = await installDependency(entry, config);

      if (installed) {
        const mcpEntry = toMcpEntry(config);
        if (mcpEntry) {
          claudeAdapter.injectMcp(entry.name, mcpEntry);
        }
        depsInstalled++;
      }
    } else if (entry.type === "agent") {
      // Registry agent — resolve its assets recursively
      const agentJsonPath = join(registryPath, "agents", entry.name, "agent.json");
      const nestedManifest: AgentManifest = JSON.parse(readFileSync(agentJsonPath, "utf-8"));
      await deployAgent(nestedManifest, projectDir);
    } else {
      copyAssetToProject(entry, registryPath, projectDir);
      copied++;
      console.log(`  Copied: ${entry.name} (${entry.type})`);
    }
  }

  console.log(`\nDone. ${copied} assets copied, ${depsInstalled} dependencies installed.`);
}

export * from "./copy.js";
export * from "./dependencies.js";
```

**Step 6: Run tests**

Run: `npx vitest run src/deploy/deploy.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/deploy/
git commit -m "feat: add deploy module with asset copying and dependency wiring"
```

---

## Task 5: Rewrite CLI Commands

**Files:**
- Rewrite: `src/cli/index.ts`
- Rewrite: `src/cli/commands/create.ts`
- Rewrite: `src/cli/commands/agents.ts`
- Create: `src/cli/commands/list.ts`
- Create: `src/cli/commands/add.ts`
- Create: `src/cli/commands/remove.ts`
- Create: `src/cli/commands/deploy.ts`
- Create: `src/cli/commands/info.ts`
- Archive: `src/cli/commands/hire.ts`, `src/cli/commands/hire.test.ts`, `src/cli/commands/status.ts`, `src/cli/commands/delete.ts`

**Step 1: Archive old CLI commands**

```bash
mkdir -p archive/cli/commands
git mv src/cli/commands/hire.ts archive/cli/commands/
git mv src/cli/commands/hire.test.ts archive/cli/commands/
git mv src/cli/commands/status.ts archive/cli/commands/
git mv src/cli/commands/delete.ts archive/cli/commands/
```

**Step 2: Rewrite `src/cli/index.ts`**

```typescript
#!/usr/bin/env node
/**
 * Agent Hub CLI — AI Development Kit
 */

import { listCommand } from "./commands/list.js";
import { createCommand } from "./commands/create.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { deployCommand } from "./commands/deploy.js";
import { agentsCommand } from "./commands/agents.js";
import { infoCommand } from "./commands/info.js";

const HELP = `
Agent Hub — AI Development Kit

Usage:
  agent-hub <command> [options]

Commands:
  list                          Browse available assets and agents
  info <name>                   Show details about an asset or agent
  create <agent> [assets...]    Create agent from selected assets
  add <agent> [assets...]       Add assets to an existing agent
  remove <agent> [assets...]    Remove assets from an agent
  agents                        List your local agents
  deploy <agent>                Deploy agent to current project

Examples:
  agent-hub list
  agent-hub create my-agent debugging tdd coding-style senior-engineer
  agent-hub add my-agent qmd
  agent-hub deploy my-agent
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log("0.2.0");
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case "list":
        await listCommand(commandArgs);
        break;
      case "info":
        await infoCommand(commandArgs);
        break;
      case "create":
        await createCommand(commandArgs);
        break;
      case "add":
        await addCommand(commandArgs);
        break;
      case "remove":
        await removeCommand(commandArgs);
        break;
      case "agents":
        await agentsCommand(commandArgs);
        break;
      case "deploy":
        await deployCommand(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'agent-hub --help' for usage.");
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
```

**Step 3: Implement `src/cli/commands/list.ts`**

```typescript
/**
 * agent-hub list — Browse registry assets and agents
 */

import { readCachedIndex, writeCachedIndex } from "../../registry/cache.js";
import { syncRegistry } from "../../registry/fetch.js";
import { getCachedIndexPath, getCachedRegistryPath, getConfigPath } from "../../agent/paths.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GlobalConfig } from "../../agent/types.js";

const DEFAULT_REGISTRY = "https://github.com/agent-hub/registry.git";

function getRegistryUrl(): string {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    const config: GlobalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    return config.registryUrl || DEFAULT_REGISTRY;
  }
  return DEFAULT_REGISTRY;
}

export async function listCommand(_args: string[]): Promise<void> {
  console.log("Syncing registry...");
  const registryUrl = getRegistryUrl();

  try {
    syncRegistry(registryUrl);
  } catch (error) {
    console.error(`Failed to sync registry: ${error instanceof Error ? error.message : error}`);
    console.log("Showing cached index (may be stale)...\n");
  }

  // Read index.json from cached registry
  const registryPath = getCachedRegistryPath();
  const indexPath = join(registryPath, "index.json");

  if (!existsSync(indexPath)) {
    console.error("No registry index found. Check your registry URL.");
    return;
  }

  const entries = JSON.parse(readFileSync(indexPath, "utf-8"));

  // Also cache it locally
  writeCachedIndex(getCachedIndexPath(), entries);

  // Group by type
  const grouped: Record<string, typeof entries> = {};
  for (const entry of entries) {
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
  }

  for (const [type, items] of Object.entries(grouped)) {
    console.log(`\n${type.toUpperCase()}S:`);
    for (const item of items) {
      console.log(`  ${item.name.padEnd(25)} ${item.description}`);
    }
  }

  console.log(`\nTotal: ${entries.length} assets`);
}
```

**Step 4: Implement `src/cli/commands/info.ts`**

```typescript
/**
 * agent-hub info <name> — Show asset or agent details
 */

import { readCachedIndex } from "../../registry/cache.js";
import { getCachedIndexPath, getCachedRegistryPath } from "../../agent/paths.js";
import { resolveAssetPath } from "../../registry/fetch.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function infoCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: agent-hub info <name>");
    process.exit(1);
  }

  const name = args[0];
  const index = readCachedIndex(getCachedIndexPath());

  if (index.length === 0) {
    console.error("Registry not cached. Run 'agent-hub list' first.");
    process.exit(1);
  }

  const entry = index.find((e) => e.name === name);
  if (!entry) {
    console.error(`Asset "${name}" not found in registry.`);
    process.exit(1);
  }

  console.log(`Name:        ${entry.name}`);
  console.log(`Type:        ${entry.type}`);
  console.log(`Description: ${entry.description}`);

  // Try to show content from cached registry
  const registryPath = getCachedRegistryPath();
  const assetDir = join(registryPath, resolveAssetPath(entry));

  if (entry.type === "agent") {
    const agentJson = join(assetDir, "agent.json");
    if (existsSync(agentJson)) {
      const manifest = JSON.parse(readFileSync(agentJson, "utf-8"));
      console.log(`Assets:      ${manifest.assets.join(", ")}`);
    }
  } else {
    const metaPath = join(assetDir, "asset.json");
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      if (meta.version) console.log(`Version:     ${meta.version}`);
      if (meta.author) console.log(`Author:      ${meta.author}`);
    }
  }
}
```

**Step 5: Rewrite `src/cli/commands/create.ts`**

```typescript
/**
 * agent-hub create <agent> [assets...] — Create a new agent
 */

import { createAgent } from "../../agent/manager.js";

export async function createCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: agent-hub create <agent-name> [assets...]");
    process.exit(1);
  }

  const [name, ...assets] = args;
  const manifest = createAgent(name, assets);

  console.log(`Created agent "${manifest.name}"`);
  if (manifest.assets.length > 0) {
    console.log(`Assets: ${manifest.assets.join(", ")}`);
  } else {
    console.log("No assets added. Use 'agent-hub add' to add assets.");
  }
}
```

**Step 6: Implement `src/cli/commands/add.ts`**

```typescript
/**
 * agent-hub add <agent> [assets...] — Add assets to an agent
 */

import { addAssets } from "../../agent/manager.js";

export async function addCommand(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("Usage: agent-hub add <agent-name> <asset1> [asset2...]");
    process.exit(1);
  }

  const [name, ...assets] = args;
  const manifest = addAssets(name, assets);
  console.log(`Updated agent "${name}". Assets: ${manifest.assets.join(", ")}`);
}
```

**Step 7: Implement `src/cli/commands/remove.ts`**

```typescript
/**
 * agent-hub remove <agent> [assets...] — Remove assets from an agent
 */

import { removeAssets } from "../../agent/manager.js";

export async function removeCommand(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("Usage: agent-hub remove <agent-name> <asset1> [asset2...]");
    process.exit(1);
  }

  const [name, ...assets] = args;
  const manifest = removeAssets(name, assets);
  console.log(`Updated agent "${name}". Assets: ${manifest.assets.join(", ")}`);
}
```

**Step 8: Rewrite `src/cli/commands/agents.ts`**

```typescript
/**
 * agent-hub agents — List local agents
 */

import { listAgents } from "../../agent/manager.js";

export async function agentsCommand(_args: string[]): Promise<void> {
  const agents = listAgents();

  if (agents.length === 0) {
    console.log("No agents created yet. Use 'agent-hub create' to create one.");
    return;
  }

  console.log("Your agents:\n");
  for (const agent of agents) {
    console.log(`  ${agent.name}`);
    if (agent.assets.length > 0) {
      console.log(`    Assets: ${agent.assets.join(", ")}`);
    }
    if (agent.created) {
      console.log(`    Created: ${agent.created}`);
    }
    console.log();
  }
}
```

**Step 9: Implement `src/cli/commands/deploy.ts`**

```typescript
/**
 * agent-hub deploy <agent> — Deploy agent to current project
 */

import { loadAgent, agentExists } from "../../agent/paths.js";
import { readCachedIndex } from "../../registry/cache.js";
import { getCachedIndexPath, getCachedRegistryPath } from "../../agent/paths.js";
import { deployAgent } from "../../deploy/index.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentManifest } from "../../agent/types.js";

export async function deployCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: agent-hub deploy <agent-name>");
    process.exit(1);
  }

  const name = args[0];
  const projectDir = process.cwd();

  // Try local agent first, then registry
  let manifest: AgentManifest;

  if (agentExists(name)) {
    const { loadAgent } = await import("../../agent/manager.js");
    manifest = loadAgent(name);
  } else {
    // Check registry for pre-made agent
    const registryPath = getCachedRegistryPath();
    const agentJsonPath = join(registryPath, "agents", name, "agent.json");

    if (existsSync(agentJsonPath)) {
      manifest = JSON.parse(readFileSync(agentJsonPath, "utf-8"));
    } else {
      console.error(`Agent "${name}" not found locally or in registry.`);
      console.error("Create one with: agent-hub create <name> [assets...]");
      console.error("Or run 'agent-hub list' to see available registry agents.");
      process.exit(1);
    }
  }

  await deployAgent(manifest, projectDir);
}
```

**Step 10: Run type check and tests**

Run: `npx tsc --noEmit`
Expected: PASS (or minor fixable errors)

Run: `npx vitest run`
Expected: PASS

**Step 11: Commit**

```bash
git add src/cli/ archive/cli/
git commit -m "feat: rewrite CLI with new ADK commands (list, create, add, remove, deploy, agents, info)"
```

---

## Task 6: Clean Up and Final Integration

**Files:**
- Archive: `src/cli/conflict-resolver.ts`, `src/cli/conflict-resolver.test.ts` (keep for future use but not wired in v1)
- Modify: `package.json` — bump version to 0.2.0, update description
- Modify: `src/index.ts` — ensure it just routes to CLI

**Step 1: Archive conflict resolver (useful later but not wired in deploy v1)**

```bash
git mv src/cli/conflict-resolver.ts archive/cli/
git mv src/cli/conflict-resolver.test.ts archive/cli/
```

**Step 2: Update `package.json`**

Update version and description:
```json
{
  "name": "agent-hub",
  "version": "0.2.0",
  "description": "AI Development Kit — compose and deploy AI assistant configurations",
}
```

Also update keywords:
```json
"keywords": ["agent", "adk", "claude", "codex", "skills", "mcp", "cli"]
```

**Step 3: Verify entry point**

`src/index.ts` should already be:
```typescript
#!/usr/bin/env node
import("./cli/index.js");
```

**Step 4: Full build and test**

Run: `npx tsc --noEmit`
Expected: PASS

Run: `npx vitest run`
Expected: PASS

Run: `npx tsx src/index.ts --help`
Expected: Shows new help text with ADK commands

Run: `npx tsx src/index.ts list`
Expected: Attempts to sync registry (may fail if registry repo doesn't exist yet — that's fine)

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete ADK rescope — v0.2.0"
```

---

## Task 7: Seed the Registry Repo (Separate Repo)

This task creates the `agent-hub/registry` GitHub repo with initial assets.

**Step 1: Create the registry repo structure locally**

```bash
mkdir -p registry/{skills/debugging,skills/tdd,rules/coding-style,claude-md/senior-engineer,dependencies/qmd,agents/fullstack-senior}
```

**Step 2: Populate with initial assets from archived templates**

Move content from `archive/templates/` into registry format:
- `archive/templates/skills/` → skill assets
- `archive/templates/rules/` → rule assets

Each asset needs an `asset.json` + content file.

**Step 3: Create `index.json`**

```json
[
  { "name": "debugging", "type": "skill", "description": "Systematic debugging workflow" },
  { "name": "tdd", "type": "skill", "description": "Test-driven development workflow" },
  { "name": "coding-style", "type": "rule", "description": "Immutability, small files, error handling" },
  { "name": "senior-engineer", "type": "claude-md", "description": "Senior engineer identity and standards" },
  { "name": "qmd", "type": "dependency", "description": "Local semantic search via QMD" },
  { "name": "fullstack-senior", "type": "agent", "description": "Senior full-stack with strict standards + QMD" }
]
```

**Step 4: Push to GitHub as `agent-hub/registry`**

**Step 5: Test end-to-end**

```bash
agent-hub list                    # Should fetch and display registry
agent-hub create test-agent debugging coding-style
agent-hub deploy test-agent       # Should copy files to .claude/
```

---

## Summary

| Task | What | Commit Message |
|------|------|----------------|
| 1 | Archive dead code, strip deps | `refactor: archive dead code and strip runtime dependencies` |
| 2 | Rewrite types, paths, agent manager | `refactor: rewrite core types, paths, and agent manager for ADK` |
| 3 | Registry module (fetch, cache) | `feat: add registry module with fetch, cache, and asset resolution` |
| 4 | Deploy module (copy, dependencies) | `feat: add deploy module with asset copying and dependency wiring` |
| 5 | Rewrite all CLI commands | `feat: rewrite CLI with new ADK commands` |
| 6 | Clean up, bump version, final test | `feat: complete ADK rescope — v0.2.0` |
| 7 | Seed registry repo (separate) | (separate repo) |
