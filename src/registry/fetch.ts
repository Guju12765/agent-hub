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
    const parent = localPath.substring(0, localPath.lastIndexOf("/") || localPath.lastIndexOf("\\"));
    if (!existsSync(parent)) {
      mkdirSync(parent, { recursive: true });
    }
    execSync(`git clone --depth 1 "${registryUrl}" "${localPath}"`, { stdio: "pipe" });
  }

  return localPath;
}

/** Get the local filesystem path for an asset in the cached registry */
export function getAssetLocalPath(entry: RegistryEntry): string {
  const registryPath = getCachedRegistryPath();
  const assetPath = resolveAssetPath(entry);
  return `${registryPath}/${assetPath}`;
}
