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
