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
