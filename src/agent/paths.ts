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
  const dirs = [getBaseDir(), getAgentsDir()];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
