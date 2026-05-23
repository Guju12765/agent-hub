/**
 * Load agent configuration files (plugins.json, mcp-servers.json, hooks)
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  getPluginsConfigPath,
  getMcpServersConfigPath,
  getHooksDir,
  getSkillsDir,
  getSubagentsDir,
  getCommandsDir,
  getRulesDir,
} from "./paths.js";

export interface PluginRef {
  name: string;
  version?: string;
}

export interface PluginsConfig {
  plugins: PluginRef[];
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpServersConfig {
  servers: Record<string, McpServerConfig>;
}

export interface HookCommand {
  type: "command";
  command: string;
}

export interface HookMatcher {
  matcher: string;
  hooks: HookCommand[];
}

export interface HooksConfig {
  [eventName: string]: HookMatcher[];
}

/**
 * Load plugins.json for an agent
 */
export function loadPluginsConfig(agentName: string): PluginsConfig {
  const configPath = getPluginsConfigPath(agentName);
  if (!existsSync(configPath)) {
    return { plugins: [] };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return {
      plugins: Array.isArray(parsed.plugins) ? parsed.plugins : [],
    };
  } catch {
    return { plugins: [] };
  }
}

/**
 * Load mcp-servers.json for an agent
 */
export function loadMcpServersConfig(agentName: string): McpServersConfig {
  const configPath = getMcpServersConfigPath(agentName);
  if (!existsSync(configPath)) {
    return { servers: {} };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return {
      servers: typeof parsed.servers === "object" ? parsed.servers : {},
    };
  } catch {
    return { servers: {} };
  }
}

/**
 * Load all hook configurations from hooks/ directory
 * Merges all .json files (except those starting with _)
 */
export function loadHooksConfig(agentName: string): HooksConfig {
  const hooksDir = getHooksDir(agentName);
  if (!existsSync(hooksDir)) {
    return {};
  }

  const hooks: HooksConfig = {};

  try {
    const files = readdirSync(hooksDir);
    for (const file of files) {
      // Skip example files and non-json
      if (file.startsWith("_") || !file.endsWith(".json")) {
        continue;
      }

      const filePath = join(hooksDir, file);
      try {
        const content = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);

        // Merge hook events
        for (const [event, matchers] of Object.entries(parsed)) {
          if (event.startsWith("_")) continue; // Skip comments
          if (!Array.isArray(matchers)) continue;

          if (!hooks[event]) {
            hooks[event] = [];
          }
          hooks[event].push(...(matchers as HookMatcher[]));
        }
      } catch {
        // Skip invalid files
      }
    }
  } catch {
    // Directory read error
  }

  return hooks;
}

/**
 * List files in a config directory (skills, agents, commands, rules)
 * Returns absolute paths, excludes files starting with _
 */
export function listConfigFiles(dirPath: string, extension: string = ".md"): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  try {
    const files = readdirSync(dirPath);
    return files
      .filter((f) => !f.startsWith("_") && f.endsWith(extension))
      .map((f) => join(dirPath, f));
  } catch {
    return [];
  }
}

/**
 * Get all skill files for an agent
 * Skills can be either:
 * - Flat files: skills/my-skill.md
 * - Directories: skills/my-skill/SKILL.md
 */
export function getSkillFiles(agentName: string): string[] {
  const skillsDir = getSkillsDir(agentName);
  if (!existsSync(skillsDir)) return [];

  const results: string[] = [];
  try {
    const entries = readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith("_")) continue;

      const fullPath = join(skillsDir, entry.name);
      if (entry.isDirectory()) {
        // Check for SKILL.md inside directory
        const skillMd = join(fullPath, "SKILL.md");
        if (existsSync(skillMd)) {
          results.push(fullPath); // Return directory path
        }
      } else if (entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }
  return results;
}

/**
 * Get all subagent files for an agent
 */
export function getSubagentFiles(agentName: string): string[] {
  return listConfigFiles(getSubagentsDir(agentName), ".md");
}

/**
 * Get all command files for an agent
 */
export function getCommandFiles(agentName: string): string[] {
  return listConfigFiles(getCommandsDir(agentName), ".md");
}

/**
 * Get all rule files for an agent
 */
export function getRuleFiles(agentName: string): string[] {
  return listConfigFiles(getRulesDir(agentName), ".md");
}
