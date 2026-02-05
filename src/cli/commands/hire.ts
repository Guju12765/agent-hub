/**
 * Hire command - Add agent to current project
 */

import { parseArgs } from "node:util";
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, basename, dirname } from "node:path";
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
import { ConflictResolver, mergeHooks, hooksHaveConflict, type ConflictAction } from "../conflict-resolver.js";

/**
 * Result of a copy operation with conflict resolution
 */
export interface CopyResult {
  action: ConflictAction | "copied";
  copied: boolean;
}

/**
 * Copy a single file with conflict resolution
 * Exported for testing
 */
export async function copyConfigFile(
  sourcePath: string,
  targetPath: string,
  resolver: ConflictResolver
): Promise<CopyResult> {
  // Ensure target directory exists
  const targetDir = dirname(targetPath);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (!existsSync(targetPath)) {
    copyFileSync(sourcePath, targetPath);
    return { action: "copied", copied: true };
  }

  // File exists - use resolver
  const action = await resolver.handleConflict(targetPath, sourcePath, "file");
  if (action === "abort") {
    throw new Error("Hire operation aborted by user");
  }
  if (action === "replace") {
    copyFileSync(sourcePath, targetPath);
    return { action: "replace", copied: true };
  }
  return { action, copied: false };
}

/**
 * Copy CLAUDE.md with conflict resolution
 * Exported for testing
 */
export async function copyClaudeMd(
  sourcePath: string,
  targetPath: string,
  resolver: ConflictResolver
): Promise<CopyResult> {
  return copyConfigFile(sourcePath, targetPath, resolver);
}

/**
 * Copy plugins.json with conflict resolution
 * Exported for testing
 */
export async function copyPluginsJson(
  sourcePath: string,
  targetPath: string,
  resolver: ConflictResolver
): Promise<CopyResult> {
  return copyConfigFile(sourcePath, targetPath, resolver);
}

/**
 * Recursively copy a directory with per-file conflict resolution
 * Exported for testing
 */
export async function copyDirWithConflictResolution(
  src: string,
  dest: string,
  resolver: ConflictResolver
): Promise<{ action: ConflictAction | "copied"; filesProcessed: number }> {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });
  let filesProcessed = 0;

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectory
      const result = await copyDirWithConflictResolution(srcPath, destPath, resolver);
      filesProcessed += result.filesProcessed;
    } else {
      // Handle file with conflict resolution
      if (!existsSync(destPath)) {
        copyFileSync(srcPath, destPath);
        filesProcessed++;
      } else {
        const action = await resolver.handleConflict(destPath, srcPath, "file");
        if (action === "abort") {
          throw new Error("Hire operation aborted by user");
        }
        if (action === "replace") {
          copyFileSync(srcPath, destPath);
        }
        filesProcessed++;
      }
    }
  }

  return { action: "copied", filesProcessed };
}

/**
 * Copy scripts directory with conflict resolution
 * Exported for testing
 */
export async function copyScriptsDir(
  sourcePath: string,
  targetPath: string,
  resolver: ConflictResolver
): Promise<CopyResult> {
  if (!existsSync(sourcePath)) {
    return { action: "keep", copied: false };
  }

  if (!existsSync(targetPath)) {
    // No conflict - copy entire directory
    copyDirRecursiveSimple(sourcePath, targetPath);
    return { action: "copied", copied: true };
  }

  // Directory exists - ask resolver at directory level
  const action = await resolver.handleConflict(targetPath, sourcePath, "skill-dir");
  if (action === "abort") {
    throw new Error("Hire operation aborted by user");
  }
  if (action === "replace") {
    // Use per-file conflict resolution when replacing
    await copyDirWithConflictResolution(sourcePath, targetPath, resolver);
    return { action: "replace", copied: true };
  }
  return { action, copied: false };
}

/**
 * Simple recursive directory copy (no conflict resolution)
 * Used when target doesn't exist
 */
function copyDirRecursiveSimple(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursiveSimple(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use copyClaudeMd with resolver instead
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
      update: { type: "boolean", short: "u" },
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
    console.error("  --update, -u          Update existing agent (re-hire with conflict resolution)");
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
  // Allow re-hire with --update flag
  if (!values.global && isAgentHiredInProject() && !values.update) {
    console.log(`Agent ${name} is already hired in this project.`);
    console.log(`Use --update to update agent files with conflict resolution.`);
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

      // Copy CLAUDE.md with conflict resolution
      const masterClaudeMd = getAgentClaudeMdPath(name);
      const projectClaudeMd = join(settingsDir, "CLAUDE.md");
      if (existsSync(masterClaudeMd)) {
        if (!isDryRun) {
          const claudeMdResult = await copyClaudeMd(masterClaudeMd, projectClaudeMd, resolver);
          if (claudeMdResult.action === "copied") {
            console.log("Created .claude/CLAUDE.md from agent template.");
          } else if (claudeMdResult.action === "replace") {
            console.log("Replaced .claude/CLAUDE.md with agent template.");
          }
        } else {
          if (!existsSync(projectClaudeMd)) {
            console.log("Would create .claude/CLAUDE.md from agent template.");
          } else {
            console.log("Would conflict: CLAUDE.md (already exists)");
          }
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

      // Copy scripts directory with conflict resolution
      const scriptsSource = getScriptsDir(name);
      const scriptsTarget = join(settingsDir, "scripts");
      if (existsSync(scriptsSource)) {
        if (!isDryRun) {
          const scriptsResult = await copyScriptsDir(scriptsSource, scriptsTarget, resolver);
          if (scriptsResult.action === "copied") {
            console.log("Copied scripts directory.");
          } else if (scriptsResult.action === "replace") {
            console.log("Updated scripts directory.");
          }
        } else {
          if (!existsSync(scriptsTarget)) {
            console.log("Would copy scripts directory.");
          } else {
            console.log("Would conflict: scripts directory (already exists)");
          }
        }
      }
    }

    // Load and inject MCP servers
    const mcpConfig = loadMcpServersConfig(name);
    if (!isDryRun) {
      const mcpResult = adapter.injectMcp(name, { servers: mcpConfig.servers }, !!values.global);
      if (mcpResult.skipped.length > 0) {
        console.log(`Note: MCP servers already configured (skipped): ${mcpResult.skipped.join(", ")}`);
      }
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

    // Copy plugins.json with conflict resolution
    const pluginsSource = getPluginsConfigPath(name);
    const pluginsTarget = join(settingsDir, "plugins.json");
    if (existsSync(pluginsSource)) {
      if (!isDryRun) {
        const pluginsResult = await copyPluginsJson(pluginsSource, pluginsTarget, resolver);
        if (pluginsResult.action === "copied") {
          console.log("Copied plugins.json to .claude/");
        } else if (pluginsResult.action === "replace") {
          console.log("Updated plugins.json in .claude/");
        }
      } else {
        if (!existsSync(pluginsTarget)) {
          console.log("Would copy plugins.json to .claude/");
        } else {
          console.log("Would conflict: plugins.json (already exists)");
        }
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
