/**
 * Agent CRUD operations
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
  const updated: AgentManifest = { ...manifest, assets: [...manifest.assets, ...newAssets] };
  writeFileSync(getAgentPath(name), JSON.stringify(updated, null, 2));
  return updated;
}

/** Remove assets from an agent */
export function removeAssets(name: string, assets: string[]): AgentManifest {
  const manifest = loadAgent(name);
  const updated: AgentManifest = { ...manifest, assets: manifest.assets.filter((a) => !assets.includes(a)) };
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
