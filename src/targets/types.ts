/**
 * Target adapter interface for multi-platform support
 */

import type { McpServerConfig, HooksConfig } from "../agent/config-loader.js";

/**
 * Supported target platforms
 */
export type TargetName = "claude";

/**
 * MCP server configuration for injection
 */
export interface McpConfig {
  servers: Record<string, McpServerConfig>;
}

/**
 * Result of a hire operation
 */
export interface HireResult {
  success: boolean;
  message: string;
  configsCopied?: number;
  mcpsConfigured?: number;
  hooksConfigured?: number;
}

/**
 * Result of a fire operation
 */
export interface FireResult {
  success: boolean;
  message: string;
}

/**
 * Target adapter interface
 * Each platform (Claude Code, Codex CLI, etc.) implements this interface
 */
export interface TargetAdapter {
  /** Target name identifier */
  readonly name: TargetName;

  /** Human-readable display name */
  readonly displayName: string;

  /**
   * Detect if this target is used in the current project
   * Checks for target-specific files/directories
   */
  detect(): boolean;

  /**
   * Get the settings directory path for this target
   * @param global - If true, return global settings path; otherwise project-local
   */
  getSettingsDir(global: boolean): string;

  /**
   * Get the settings file path for this target
   * @param global - If true, return global settings path; otherwise project-local
   */
  getSettingsPath(global: boolean): string;

  /**
   * Get the instructions file path (e.g., CLAUDE.md, codex.md)
   */
  getInstructionsPath(): string;

  /**
   * Get the config directories to copy (skills, agents, commands, rules)
   * @param settingsDir - The target settings directory
   */
  getConfigDirs(settingsDir: string): {
    skills: string;
    agents: string;
    commands: string;
    rules: string;
  };

  /**
   * Inject MCP server configurations into settings
   * @param agentName - The agent name
   * @param mcpConfig - Additional MCP servers to inject
   * @param global - If true, inject to global settings
   * @returns Object with arrays of added and skipped server names
   */
  injectMcp(agentName: string, mcpConfig: McpConfig, global: boolean): { added: string[]; skipped: string[] };

  /**
   * Inject hook configurations into settings
   * @param hooksConfig - Hooks to inject
   * @param global - If true, inject to global settings
   */
  injectHooks(hooksConfig: HooksConfig, global: boolean): void;

  /**
   * Remove agent MCP configuration from settings
   * @param agentName - The agent name to remove
   * @param global - If true, remove from global settings
   */
  removeMcp(agentName: string, global: boolean): boolean;

  /**
   * Check if the target is supported (has required dependencies)
   */
  isSupported(): boolean;

  /**
   * Get setup instructions for this target
   */
  getSetupInstructions(): string;
}
