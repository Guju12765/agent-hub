/**
 * Claude Code target adapter
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TargetAdapter, McpServerEntry, TargetName } from "./types.js";

interface McpJsonConfig {
  mcpServers?: Record<string, {
    type?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

/**
 * Load MCP config from .mcp.json file
 */
function loadMcpConfig(mcpPath: string): McpJsonConfig {
  if (!existsSync(mcpPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(mcpPath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Save MCP config to .mcp.json file
 */
function saveMcpConfig(mcpPath: string, config: McpJsonConfig): void {
  writeFileSync(mcpPath, JSON.stringify(config, null, 2) + "\n");
}

export class ClaudeAdapter implements TargetAdapter {
  readonly name: TargetName = "claude";
  readonly displayName = "Claude Code";

  detect(): boolean {
    return existsSync(join(process.cwd(), ".claude")) ||
           existsSync(join(process.cwd(), "CLAUDE.md"));
  }

  getSettingsDir(): string {
    return join(process.cwd(), ".claude");
  }

  getConfigDirs(settingsDir: string): {
    skills: string;
    rules: string;
  } {
    return {
      skills: join(settingsDir, "skills"),
      rules: join(settingsDir, "rules"),
    };
  }

  getMcpConfigPath(): string {
    return join(process.cwd(), ".mcp.json");
  }

  getInstructionsDir(): string {
    return join(process.cwd(), ".claude");
  }

  injectMcp(name: string, config: McpServerEntry): { added: boolean; skipped: boolean } {
    const mcpPath = this.getMcpConfigPath();
    const mcpJson = loadMcpConfig(mcpPath);

    if (!mcpJson.mcpServers) {
      mcpJson.mcpServers = {};
    }

    if (mcpJson.mcpServers[name]) {
      return { added: false, skipped: true };
    }

    mcpJson.mcpServers[name] = config;
    saveMcpConfig(mcpPath, mcpJson);
    return { added: true, skipped: false };
  }

  removeMcp(name: string): boolean {
    const mcpPath = this.getMcpConfigPath();

    if (!existsSync(mcpPath)) {
      return false;
    }

    const config = loadMcpConfig(mcpPath);

    if (!config.mcpServers || !config.mcpServers[name]) {
      return false;
    }

    delete config.mcpServers[name];
    saveMcpConfig(mcpPath, config);
    return true;
  }

  isSupported(): boolean {
    return true;
  }
}

/**
 * Singleton instance
 */
export const claudeAdapter = new ClaudeAdapter();
