/**
 * Agent filesystem paths and utilities
 */

import { homedir } from "node:os";
import { join, dirname, parse } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { AgentMetadata, AgentRegistry } from "./types.js";

// Base directory for all agents
export function getAgentsBaseDir(): string {
  return join(homedir(), ".agent-hub", "agents");
}

// Get path to registry file
export function getRegistryPath(): string {
  return join(getAgentsBaseDir(), "registry.json");
}

// Get agent directory
export function getAgentDir(agentName: string): string {
  return join(getAgentsBaseDir(), agentName);
}

// Get agent metadata path
export function getAgentMetadataPath(agentName: string): string {
  return join(getAgentDir(agentName), "agent.json");
}

// Get consolidated memory path (master level)
export function getConsolidatedMemoryPath(agentName: string): string {
  return join(getAgentDir(agentName), "MEMORY.md");
}

// Get CLAUDE.md path (master level)
export function getAgentClaudeMdPath(agentName: string): string {
  return join(getAgentDir(agentName), "CLAUDE.md");
}

// Get daily logs directory (master level)
export function getMasterDailyLogsDir(agentName: string): string {
  return join(getAgentDir(agentName), "memory");
}

// Get specific daily log path (master level)
export function getMasterDailyLogPath(agentName: string, date: string): string {
  return join(getMasterDailyLogsDir(agentName), `${date}.md`);
}

// Get index directory
export function getIndexDir(agentName: string): string {
  return join(getAgentDir(agentName), ".index");
}

// Get SQLite database path
export function getIndexDbPath(agentName: string): string {
  return join(getIndexDir(agentName), "memory.db");
}

// Get skills directory
export function getSkillsDir(agentName: string): string {
  return join(getAgentDir(agentName), "skills");
}

// Get hooks directory
export function getHooksDir(agentName: string): string {
  return join(getAgentDir(agentName), "hooks");
}

// Get agents (subagents) directory
export function getSubagentsDir(agentName: string): string {
  return join(getAgentDir(agentName), "agents");
}

// Get commands directory
export function getCommandsDir(agentName: string): string {
  return join(getAgentDir(agentName), "commands");
}

// Get rules directory
export function getRulesDir(agentName: string): string {
  return join(getAgentDir(agentName), "rules");
}

// Get scripts directory
export function getScriptsDir(agentName: string): string {
  return join(getAgentDir(agentName), "scripts");
}

// Get plugins.json path
export function getPluginsConfigPath(agentName: string): string {
  return join(getAgentDir(agentName), "plugins.json");
}

// Get mcp-servers.json path
export function getMcpServersConfigPath(agentName: string): string {
  return join(getAgentDir(agentName), "mcp-servers.json");
}

// Check if agent exists
export function agentExists(agentName: string): boolean {
  return existsSync(getAgentMetadataPath(agentName));
}

// Load agent registry
export function loadRegistry(): AgentRegistry {
  const registryPath = getRegistryPath();
  if (!existsSync(registryPath)) {
    return { agents: [] };
  }
  const content = readFileSync(registryPath, "utf-8");
  return JSON.parse(content);
}

// Save agent registry
export function saveRegistry(registry: AgentRegistry): void {
  const baseDir = getAgentsBaseDir();
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }
  writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));
}

// Load agent metadata
export function loadAgentMetadata(agentName: string): AgentMetadata | null {
  const metadataPath = getAgentMetadataPath(agentName);
  if (!existsSync(metadataPath)) {
    return null;
  }
  const content = readFileSync(metadataPath, "utf-8");
  return JSON.parse(content);
}

// Save agent metadata
export function saveAgentMetadata(agentName: string, metadata: AgentMetadata): void {
  const agentDir = getAgentDir(agentName);
  if (!existsSync(agentDir)) {
    mkdirSync(agentDir, { recursive: true });
  }
  writeFileSync(getAgentMetadataPath(agentName), JSON.stringify(metadata, null, 2));
}

// Ensure agent directories exist
export function ensureAgentDirs(agentName: string): void {
  const dirs = [
    getAgentDir(agentName),
    getMasterDailyLogsDir(agentName),
    getIndexDir(agentName),
    getSkillsDir(agentName),
    getHooksDir(agentName),
    getSubagentsDir(agentName),
    getCommandsDir(agentName),
    getRulesDir(agentName),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// Get current time in HH:MM format
export function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

/**
 * Detect the project directory by looking for .claude or .mcp.json
 * Walks up from cwd until it finds a project marker
 */
export function detectProjectDir(): string {
  let dir = process.cwd();
  const root = parse(dir).root;

  while (dir !== root) {
    // Check for project markers
    if (existsSync(join(dir, ".claude")) || existsSync(join(dir, ".mcp.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }

  // Fallback to cwd if no project markers found
  return process.cwd();
}

/**
 * Get memory directory (.claude/memory/)
 * @param workspaceDir - Optional explicit workspace directory (auto-detected if not provided)
 */
export function getMemoryDir(workspaceDir?: string): string {
  const baseDir = workspaceDir ?? detectProjectDir();
  return join(baseDir, ".claude", "memory");
}

/**
 * Get memory database path
 */
export function getMemoryDbPath(workspaceDir?: string): string {
  return join(getMemoryDir(workspaceDir), ".index", "memory.db");
}

/**
 * Get IDENTITY.md path
 */
export function getIdentityPath(workspaceDir?: string): string {
  return join(getMemoryDir(workspaceDir), "IDENTITY.md");
}

/**
 * Get MEMORY.md path
 */
export function getConsolidatedPath(workspaceDir?: string): string {
  return join(getMemoryDir(workspaceDir), "MEMORY.md");
}

/**
 * Get daily logs directory
 */
export function getDailyLogsDir(workspaceDir?: string): string {
  return join(getMemoryDir(workspaceDir), "logs");
}

/**
 * Get specific daily log path
 */
export function getDailyLogPath(date: string, workspaceDir?: string): string {
  return join(getDailyLogsDir(workspaceDir), `${date}.md`);
}

/**
 * Get sessions directory (for session logs)
 */
export function getSessionsDir(workspaceDir?: string): string {
  return join(getMemoryDir(workspaceDir), "sessions");
}

// Backward compatibility aliases
export const getProjectMemoryDir = (agentName: string, projectDir?: string): string =>
  getMemoryDir(projectDir);
export const getProjectDbPath = (agentName: string, projectDir?: string): string =>
  getMemoryDbPath(projectDir);
export const getProjectIdentityPath = (agentName: string, projectDir?: string): string =>
  getIdentityPath(projectDir);
export const getProjectConsolidatedPath = (agentName: string, projectDir?: string): string =>
  getConsolidatedPath(projectDir);
export const getProjectDailyLogsDir = (agentName: string, projectDir?: string): string =>
  getDailyLogsDir(projectDir);
