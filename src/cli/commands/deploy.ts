/**
 * agent-hub deploy <agent> — Deploy agent to current project
 */

import { agentExists } from "../../agent/paths.js";
import { loadAgent } from "../../agent/manager.js";
import { getCachedRegistryPath } from "../../agent/paths.js";
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
