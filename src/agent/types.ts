/**
 * Core types for agent-hub ADK
 */

/** Asset types supported by the registry */
export type AssetType = "skill" | "rule" | "claude-md" | "dependency" | "agent";

/** An entry in the registry index */
export interface RegistryEntry {
  name: string;
  type: AssetType;
  description: string;
  source?: string; // For third-party assets: "github:user/repo"
}

/** Asset metadata (asset.json in registry) */
export interface AssetMeta {
  name: string;
  type: AssetType;
  description: string;
  version?: string;
  author?: string;
}

/** Agent manifest (local or registry) */
export interface AgentManifest {
  name: string;
  description?: string;
  assets: string[];
  created?: string;
}

/** Dependency config (config.json in registry) */
export interface DependencyConfig {
  install: string;
  mcp?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
}