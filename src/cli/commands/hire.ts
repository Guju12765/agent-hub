/**
 * Hire command - Add agent to current project
 */

import { parseArgs } from "node:util";
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import {
  agentExists,
  getMemoryDir,
  getConsolidatedPath,
  getAgentClaudeMdPath,
  getPluginsConfigPath,
  getScriptsDir,
  loadMcpServersConfig,
  loadHooksConfig,
  getSkillFiles,
  getSubagentFiles,
  getCommandFiles,
  getRuleFiles,
} from "../../agent/index.js";
import { claudeAdapter } from "../../targets/index.js";
import { ConflictResolver, mergeHooks, hooksHaveConflict } from "../conflict-resolver.js";

/**
 * Copy agent's CLAUDE.md to .claude/CLAUDE.md if it doesn't exist
 */
function copyClaudeMdFromMaster(agentName: string, settingsDir: string): boolean {
  const projectClaudeMd = join(settingsDir, "CLAUDE.md");

  if (existsSync(projectClaudeMd)) {
    return false; // Already exists, don't overwrite
  }

  // Ensure .claude directory exists
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }

  const masterClaudeMd = getAgentClaudeMdPath(agentName);
  if (existsSync(masterClaudeMd)) {
    copyFileSync(masterClaudeMd, projectClaudeMd);
    return true;
  }

  return false;
}

/**
 * Copy files from source paths to target directory
 * With conflict resolution support
 */
async function copyConfigFiles(
  files: string[],
  targetDir: string,
  resolver?: ConflictResolver
): Promise<number> {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  let copied = 0;
  for (const file of files) {
    const targetPath = join(targetDir, basename(file));
    if (!existsSync(targetPath)) {
      copyFileSync(file, targetPath);
      copied++;
    } else if (resolver) {
      // Conflict detected
      const action = await resolver.handleConflict(targetPath, file, "file");
      if (action === "abort") {
        throw new Error("Hire operation aborted by user");
      }
      if (action === "replace") {
        copyFileSync(file, targetPath);
      }
      // For "keep", "merge", "skip" - no action needed
    }
  }
  return copied;
}

/**
 * Recursively copy a directory
 */
function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy skill files/directories to target
 * Handles both flat .md files and skill directories
 * With conflict resolution support
 */
async function copySkillFiles(
  skillPaths: string[],
  targetDir: string,
  resolver?: ConflictResolver
): Promise<number> {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  let copied = 0;
  for (const skillPath of skillPaths) {
    const stat = statSync(skillPath);
    const name = basename(skillPath);
    const targetPath = join(targetDir, name);

    if (!existsSync(targetPath)) {
      if (stat.isDirectory()) {
        copyDirRecursive(skillPath, targetPath);
      } else {
        copyFileSync(skillPath, targetPath);
      }
      copied++;
    } else if (resolver) {
      // Conflict detected
      const type = stat.isDirectory() ? "skill-dir" : "file";
      const action = await resolver.handleConflict(targetPath, skillPath, type);
      if (action === "abort") {
        throw new Error("Hire operation aborted by user");
      }
      if (action === "replace") {
        if (stat.isDirectory()) {
          copyDirRecursive(skillPath, targetPath);
        } else {
          copyFileSync(skillPath, targetPath);
        }
      }
      // For "keep", "merge", "skip" - no action needed
    }
  }
  return copied;
}

/**
 * Check if agent is already hired in project
 * (memory directory exists and has MEMORY.md)
 */
function isAgentHiredInProject(): boolean {
  const memoryPath = getConsolidatedPath();
  return existsSync(memoryPath);
}

/**
 * Initialize project memory directory
 */
function initializeProjectMemory(): void {
  const memoryDir = getMemoryDir();
  const logsDir = join(memoryDir, "logs");
  const indexDir = join(memoryDir, ".index");

  mkdirSync(memoryDir, { recursive: true });
  mkdirSync(logsDir, { recursive: true });
  mkdirSync(indexDir, { recursive: true });
}

export async function hireCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      global: { type: "boolean", short: "g" },
      "dry-run": { type: "boolean" },
      "force-keep": { type: "boolean" },
      "force-replace": { type: "boolean" },
    },
    allowPositionals: true,
  });

  const name = positionals[0];

  if (!name) {
    console.error("Usage: npx agent-hub hire <name> [options]");
    console.error("");
    console.error("Options:");
    console.error("  --global, -g          Add to global settings instead of project");
    console.error("  --dry-run             Show what would be copied without making changes");
    console.error("  --force-keep          Keep existing files, skip conflicts");
    console.error("  --force-replace       Replace all conflicting files");
    process.exit(1);
  }

  // Validate conflicting options
  if (values["force-keep"] && values["force-replace"]) {
    console.error("Error: Cannot use both --force-keep and --force-replace");
    process.exit(1);
  }

  if (!agentExists(name)) {
    console.error(`Agent not found: ${name}`);
    console.error("");
    console.error("Available agents:");
    console.error("  npx agent-hub agents");
    process.exit(1);
  }

  const adapter = claudeAdapter;

  // Check if target is supported
  if (!adapter.isSupported()) {
    console.error(`Target '${adapter.displayName}' is not fully supported yet.`);
    console.error("");
    console.log(adapter.getSetupInstructions());
    process.exit(1);
  }

  // Check if already hired in project (for non-global hires)
  if (!values.global && isAgentHiredInProject()) {
    console.log(`Agent ${name} is already hired in this project.`);
    return;
  }

  const settingsDir = adapter.getSettingsDir(!!values.global);

  // Initialize ConflictResolver
  const isDryRun = !!values["dry-run"];
  const forceMode = values["force-keep"] ? "keep" : values["force-replace"] ? "replace" : undefined;
  const resolver = new ConflictResolver(name, isDryRun, forceMode);

  if (isDryRun) {
    console.log("DRY RUN: No changes will be made\n");
  }

  try {
    // Initialize project memory (for non-global hires)
    if (!values.global) {
      if (!isDryRun) {
        initializeProjectMemory();
      }

      // Copy CLAUDE.md from master to .claude/CLAUDE.md if it doesn't exist
      if (!isDryRun && copyClaudeMdFromMaster(name, settingsDir)) {
        console.log("Created .claude/CLAUDE.md from agent template.");
      } else if (isDryRun) {
        const projectClaudeMd = join(settingsDir, "CLAUDE.md");
        const masterClaudeMd = getAgentClaudeMdPath(name);
        if (!existsSync(projectClaudeMd) && existsSync(masterClaudeMd)) {
          console.log("Would create .claude/CLAUDE.md from agent template.");
        }
      }

      // Copy config directories
      const configDirs = adapter.getConfigDirs(settingsDir);
      const skillsCopied = await copySkillFiles(getSkillFiles(name), configDirs.skills, resolver);
      const agentsCopied = await copyConfigFiles(getSubagentFiles(name), configDirs.agents, resolver);
      const commandsCopied = await copyConfigFiles(getCommandFiles(name), configDirs.commands, resolver);
      const rulesCopied = await copyConfigFiles(getRuleFiles(name), configDirs.rules, resolver);

      const totalCopied = skillsCopied + agentsCopied + commandsCopied + rulesCopied;
      if (totalCopied > 0) {
        console.log(`${isDryRun ? "Would copy" : "Copied"} ${totalCopied} config files.`);
      }

      // Copy scripts directory
      const scriptsSource = getScriptsDir(name);
      const scriptsTarget = join(settingsDir, "scripts");
      if (existsSync(scriptsSource)) {
        if (!existsSync(scriptsTarget)) {
          if (!isDryRun) {
            copyDirRecursive(scriptsSource, scriptsTarget);
            console.log("Copied scripts directory.");
          } else {
            console.log("Would copy scripts directory.");
          }
        } else if (isDryRun) {
          console.log("Would conflict: scripts directory (already exists)");
        }
      }
    }

    // Load and inject MCP servers
    const mcpConfig = loadMcpServersConfig(name);
    if (!isDryRun) {
      adapter.injectMcp(name, { servers: mcpConfig.servers }, !!values.global);
    } else {
      console.log(`Would inject ${Object.keys(mcpConfig.servers).length} MCP servers.`);
    }

    // Load and handle hooks with auto-merge
    const hooksConfig = loadHooksConfig(name);
    if (!isDryRun) {
      // Check for hook conflicts and auto-merge if possible
      const settingsPath = adapter.getSettingsPath(!!values.global);
      if (existsSync(settingsPath)) {
        const existingSettings = JSON.parse(readFileSync(settingsPath, "utf-8"));
        const existingHooks = existingSettings.hooks || {};

        if (hooksHaveConflict(existingHooks, hooksConfig)) {
          console.log("\nNote: Some hooks already exist. Auto-merging...");
          const merged = mergeHooks(existingHooks, hooksConfig);
          adapter.injectHooks(merged, !!values.global);
        } else {
          adapter.injectHooks(hooksConfig, !!values.global);
        }
      } else {
        adapter.injectHooks(hooksConfig, !!values.global);
      }
    } else {
      console.log(`Would inject ${Object.keys(hooksConfig).length} hook event types.`);
    }

    // Copy plugins.json to .claude/ as reference
    const pluginsSource = getPluginsConfigPath(name);
    const pluginsTarget = join(settingsDir, "plugins.json");
    if (existsSync(pluginsSource) && !existsSync(pluginsTarget)) {
      if (!isDryRun) {
        copyFileSync(pluginsSource, pluginsTarget);
      } else {
        console.log("Would copy plugins.json to .claude/");
      }
    }

    if (isDryRun) {
      console.log("\nDRY RUN complete. No changes were made.");
      return;
    }

    const scope = values.global ? "globally" : "in this project";
    console.log(`\nHired ${name} ${scope} (${adapter.displayName}).`);

    // Show summary
    const mcpCount = Object.keys(mcpConfig.servers).length;
    const hookCount = Object.keys(hooksConfig).length;
    if (mcpCount > 0) {
      console.log(`MCPs: ${mcpCount + 1} configured (including memory server).`);
    }
    if (hookCount > 0) {
      console.log(`Hooks: ${hookCount} event types configured.`);
    }
    console.log(`See .claude/plugins.json for recommended plugins.`);

    console.log("");
    console.log(`The agent is now available in ${adapter.displayName}.`);
    console.log(`Restart ${adapter.displayName} to activate the agent.`);

    // Show conflict resolution summary
    resolver.showSummary();
  } catch (error) {
    if (error instanceof Error && error.message === "Hire operation aborted by user") {
      console.log("\nHire operation aborted.");
      process.exit(1);
    }
    throw error;
  }
}
