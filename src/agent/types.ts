/**
 * Agent types and interfaces
 */

export interface AgentMetadata {
  name: string;
  specialty?: string;
  created: string;
  version: string;
}

export interface AgentRegistry {
  agents: string[];
  defaultAgent?: string;
}
