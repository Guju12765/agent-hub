/**
 * Registry asset resolution
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { RegistryEntry } from "../agent/types.js";

const TYPE_TO_DIR: Record<string, string> = {
  skill: "skills",
  rule: "rules",
  "claude-md": "claude-md",
  dependency: "dependencies",
  agent: "agents",
};

/** Get the bundled registry path (ships with the package) */
export function getRegistryPath(): string {
  const thisFile = dirname(fileURLToPath(import.meta.url));
  // src/registry/ -> registry/ (dev) or dist/registry/ -> registry/ (installed)
  return join(thisFile, "..", "..", "registry");
}

/** Resolve the registry path for an asset entry */
export function resolveAssetPath(entry: RegistryEntry): string {
  const dir = TYPE_TO_DIR[entry.type];
  return `${dir}/${entry.name}`;
}

/** Get the local filesystem path for an asset in the registry */
export function getAssetLocalPath(entry: RegistryEntry): string {
  const registryPath = getRegistryPath();
  const assetPath = resolveAssetPath(entry);
  return join(registryPath, assetPath);
}
