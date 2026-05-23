/**
 * Agent Manager - Create, list, and manage agents
 *
 * Note: Memory storage is now handled by the memory module via MemoryManager.
 * This module only manages agent metadata and directories.
 */

import { rmSync } from "node:fs";
import type { AgentMetadata } from "./types.js";
import {
  getAgentDir,
  agentExists,
  loadRegistry,
  saveRegistry,
  loadAgentMetadata,
  saveAgentMetadata,
  ensureAgentDirs,
  getIndexDbPath,
} from "./paths.js";


export interface CreateAgentOptions {
  specialty?: string;
}

export interface AgentInfo {
  name: string;
  specialty?: string;
  created: string;
}

/**
 * Create a new agent
 */
export function createAgent(name: string, options: CreateAgentOptions = {}): AgentMetadata {
  // Validate name
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(
      `Invalid agent name: "${name}". Use lowercase letters, numbers, and hyphens only.`
    );
  }

  if (agentExists(name)) {
    throw new Error(`Agent "${name}" already exists.`);
  }

  // Create metadata
  const metadata: AgentMetadata = {
    name,
    specialty: options.specialty,
    created: new Date().toISOString(),
    version: "1.0.0",
  };

  // Create directories and files
  ensureAgentDirs(name);
  saveAgentMetadata(name, metadata);
  // Add to registry
  const registry = loadRegistry();
  if (!registry.agents.includes(name)) {
    registry.agents.push(name);
    registry.agents.sort();
    saveRegistry(registry);
  }

  return metadata;
}

/**
 * Delete an agent
 */
export function deleteAgent(name: string): void {
  if (!agentExists(name)) {
    throw new Error(`Agent "${name}" does not exist.`);
  }

  // Remove directory
  const agentDir = getAgentDir(name);
  rmSync(agentDir, { recursive: true, force: true });

  // Update registry
  const registry = loadRegistry();
  registry.agents = registry.agents.filter(a => a !== name);
  if (registry.defaultAgent === name) {
    delete registry.defaultAgent;
  }
  saveRegistry(registry);
}

/**
 * List all agents
 */
export function listAgents(): AgentInfo[] {
  const registry = loadRegistry();
  const agents: AgentInfo[] = [];

  for (const name of registry.agents) {
    const metadata = loadAgentMetadata(name);
    if (metadata) {
      agents.push({
        name: metadata.name,
        specialty: metadata.specialty,
        created: metadata.created,
      });
    }
  }

  return agents;
}

/**
 * Get agent info
 */
export function getAgentInfo(name: string): AgentInfo | null {
  const metadata = loadAgentMetadata(name);
  if (!metadata) {
    return null;
  }

  return {
    name: metadata.name,
    specialty: metadata.specialty,
    created: metadata.created,
  };
}

/**
 * Set default agent
 */
export function setDefaultAgent(name: string): void {
  if (!agentExists(name)) {
    throw new Error(`Agent "${name}" does not exist.`);
  }

  const registry = loadRegistry();
  registry.defaultAgent = name;
  saveRegistry(registry);
}

/**
 * Get default agent name
 */
export function getDefaultAgent(): string | undefined {
  const registry = loadRegistry();
  return registry.defaultAgent;
}

/**
 * Get agent's index database path
 */
export function getAgentDbPath(name: string): string {
  if (!agentExists(name)) {
    throw new Error(`Agent "${name}" does not exist.`);
  }
  return getIndexDbPath(name);
}
