/**
 * Claude Code target adapter
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { TargetAdapter, McpConfig, TargetName } from "./types.js";
import type { HooksConfig } from "../agent/config-loader.js";

interface HookCommand {
  type: "command";
  command: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookCommand[];
}

interface ClaudeSettings {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

interface McpJsonConfig {
  mcpServers?: Record<string, {
    type?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

/**
 * Load Claude settings from file
 */
function loadSettings(settingsPath: string): ClaudeSettings {
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Save Claude settings to file
 */
function saveSettings(settingsPath: string, settings: ClaudeSettings): void {
  const dir = join(settingsPath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
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
    // Check for .claude directory or CLAUDE.md
    return existsSync(join(process.cwd(), ".claude")) ||
           existsSync(join(process.cwd(), "CLAUDE.md"));
  }

  getSettingsDir(global: boolean): string {
    return global
      ? join(homedir(), ".claude")
      : join(process.cwd(), ".claude");
  }

  getSettingsPath(global: boolean): string {
    return join(this.getSettingsDir(global), "settings.json");
  }

  /**
   * Get path to .mcp.json file
   * - Global: ~/.claude.json
   * - Project: ./.mcp.json (at project root)
   */
  getMcpConfigPath(global: boolean): string {
    return global
      ? join(homedir(), ".claude.json")
      : join(process.cwd(), ".mcp.json");
  }

  getInstructionsPath(): string {
    return join(process.cwd(), "CLAUDE.md");
  }

  getConfigDirs(settingsDir: string): {
    skills: string;
    agents: string;
    commands: string;
    rules: string;
  } {
    return {
      skills: join(settingsDir, "skills"),
      agents: join(settingsDir, "agents"),
      commands: join(settingsDir, "commands"),
      rules: join(settingsDir, "rules"),
    };
  }

  /**
   * Result of MCP injection with skip info
   */
  injectMcp(agentName: string, mcpConfig: McpConfig, global: boolean): { added: string[]; skipped: string[] } {
    const mcpPath = this.getMcpConfigPath(global);
    const config = loadMcpConfig(mcpPath);
    const added: string[] = [];
    const skipped: string[] = [];

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Add agent memory MCP server (always project-local memory)
    // On Windows, npx must be wrapped with "cmd /c"
    if (!config.mcpServers[agentName]) {
      const isWindows = process.platform === "win32";
      config.mcpServers[agentName] = isWindows
        ? {
            type: "stdio",
            command: "cmd",
            args: ["/c", "npx", "agent-hub", "--agent", agentName],
          }
        : {
            type: "stdio",
            command: "npx",
            args: ["agent-hub", "--agent", agentName],
          };
      added.push(agentName);
    } else {
      skipped.push(agentName);
    }

    // Add additional MCP servers from config
    for (const [serverName, serverConfig] of Object.entries(mcpConfig.servers)) {
      if (!config.mcpServers[serverName]) {
        config.mcpServers[serverName] = serverConfig;
        added.push(serverName);
      } else {
        skipped.push(serverName);
      }
    }

    saveMcpConfig(mcpPath, config);
    return { added, skipped };
  }

  injectHooks(hooksConfig: HooksConfig, global: boolean): void {
    const settingsPath = this.getSettingsPath(global);
    const settings = loadSettings(settingsPath);

    if (!settings.hooks) {
      settings.hooks = {};
    }

    // Add hooks from config
    for (const [eventName, matchers] of Object.entries(hooksConfig)) {
      if (!settings.hooks[eventName]) {
        settings.hooks[eventName] = [];
      }
      for (const matcher of matchers) {
        const exists = settings.hooks[eventName].some(
          (h) => JSON.stringify(h) === JSON.stringify(matcher)
        );
        if (!exists) {
          settings.hooks[eventName].push(matcher as HookMatcher);
        }
      }
    }

    saveSettings(settingsPath, settings);
  }

  removeMcp(agentName: string, global: boolean): boolean {
    const mcpPath = this.getMcpConfigPath(global);

    if (!existsSync(mcpPath)) {
      return false;
    }

    const config = loadMcpConfig(mcpPath);

    if (!config.mcpServers || !config.mcpServers[agentName]) {
      return false;
    }

    delete config.mcpServers[agentName];
    saveMcpConfig(mcpPath, config);
    return true;
  }

  isSupported(): boolean {
    // Claude Code is always supported
    return true;
  }

  getSetupInstructions(): string {
    return `Claude Code Setup:
1. Install Claude Code: https://claude.ai/code
2. Run: npx agent-hub hire <agent-name>
3. Restart Claude Code to activate the agent`;
  }
}

/**
 * Singleton instance
 */
export const claudeAdapter = new ClaudeAdapter();
