/**
 * agent-hub info <name> — Show asset or agent details
 */

import { readIndex } from "../../registry/cache.js";
import { getRegistryPath, resolveAssetPath } from "../../registry/fetch.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function infoCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: agent-hub info <name>");
    process.exit(1);
  }

  const name = args[0];
  const index = readIndex();

  const entry = index.find((e) => e.name === name);
  if (!entry) {
    console.error(`Asset "${name}" not found in registry.`);
    process.exit(1);
  }

  console.log(`Name:        ${entry.name}`);
  console.log(`Type:        ${entry.type}`);
  console.log(`Description: ${entry.description}`);

  const registryPath = getRegistryPath();
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
