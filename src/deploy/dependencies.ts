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
