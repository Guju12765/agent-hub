/**
 * Default templates for agent configuration files
 */

import { writeFileSync, readFileSync, existsSync, copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAgentDir,
  getSkillsDir,
  getHooksDir,
  getSubagentsDir,
  getCommandsDir,
  getRulesDir,
  getScriptsDir,
  getPluginsConfigPath,
  getMcpServersConfigPath,
  getAgentClaudeMdPath,
} from "./paths.js";

/**
 * Get path to bundled template file
 */
function getPackageTemplatePath(templateName: string): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Navigate from dist/agent/ to dist/templates/
  return join(__dirname, "..", "templates", templateName);
}

/**
 * Recursively copy a directory
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(src)) return;
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
 * Default plugins.json template - loaded from templates/plugins.template.json
 */
export function getDefaultPluginsConfig(): object {
  const templatePath = getPackageTemplatePath("plugins.template.json");
  if (existsSync(templatePath)) {
    try {
      const content = readFileSync(templatePath, "utf-8");
      return JSON.parse(content);
    } catch {
      // Fall through to default
    }
  }
  // Fallback if template not found
  return {
    _comment: "Plugin dependencies. Plugins are downloaded on hire.",
    plugins: [],
  };
}

/**
 * Default mcp-servers.json template
 */
export function getDefaultMcpServersConfig(): object {
  return {
    _comment: "MCP server dependencies. Injected into settings.json on hire.",
    servers: {
      // filesystem: {
      //   command: "npx",
      //   args: ["-y", "@anthropic/mcp-server-filesystem", "/path"],
      // },
    },
  };
}

/**
 * Default skill template
 */
export function getDefaultSkillTemplate(agentName: string): string {
  return `<!--
SKILLS: Define reusable workflows and domain knowledge.

How to use:
1. Copy this file and rename (e.g., code-review.md)
2. Define the skill content below
3. Skills are copied to .claude/skills/ on hire

Delete this file when you've created your own skills.
-->

# Example Skill

When performing code review, check for:
1. Security vulnerabilities
2. Performance issues
3. Code style consistency
4. Test coverage
`;
}

/**
 * Create all default template files for an agent
 */
export function createDefaultTemplates(agentName: string): void {
  // Copy CLAUDE.template.md to agent's CLAUDE.md
  const claudeMdPath = getAgentClaudeMdPath(agentName);
  if (!existsSync(claudeMdPath)) {
    const templatePath = getPackageTemplatePath("CLAUDE.template.md");
    if (existsSync(templatePath)) {
      copyFileSync(templatePath, claudeMdPath);
    }
  }

  // Create plugins.json
  const pluginsPath = getPluginsConfigPath(agentName);
  if (!existsSync(pluginsPath)) {
    writeFileSync(pluginsPath, JSON.stringify(getDefaultPluginsConfig(), null, 2) + "\n");
  }

  // Create mcp-servers.json
  const mcpPath = getMcpServersConfigPath(agentName);
  if (!existsSync(mcpPath)) {
    writeFileSync(mcpPath, JSON.stringify(getDefaultMcpServersConfig(), null, 2) + "\n");
  }

  // Copy default skill directories from templates
  const skillsTemplateDir = getPackageTemplatePath("skills");
  const skillsDestDir = getSkillsDir(agentName);
  if (existsSync(skillsTemplateDir)) {
    const skillDirs = readdirSync(skillsTemplateDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
    for (const skillName of skillDirs) {
      const destSkillDir = join(skillsDestDir, skillName);
      if (!existsSync(destSkillDir)) {
        copyDirRecursive(join(skillsTemplateDir, skillName), destSkillDir);
      }
    }
  }

  // Copy default scripts from templates
  const scriptsTemplateDir = getPackageTemplatePath("scripts");
  const scriptsDestDir = getScriptsDir(agentName);
  if (existsSync(scriptsTemplateDir)) {
    copyDirRecursive(scriptsTemplateDir, scriptsDestDir);
  }

  // Copy default hooks from templates
  const hooksTemplateDir = getPackageTemplatePath("hooks");
  const hooksDestDir = getHooksDir(agentName);
  if (existsSync(hooksTemplateDir)) {
    const defaultHooksPath = join(hooksTemplateDir, "default.json");
    if (existsSync(defaultHooksPath)) {
      const destPath = join(hooksDestDir, "default.json");
      if (!existsSync(destPath)) {
        copyFileSync(defaultHooksPath, destPath);
      }
    }
  }

  // Copy default agents from templates
  const agentsTemplateDir = getPackageTemplatePath("agents");
  const agentsDestDir = getSubagentsDir(agentName);
  if (existsSync(agentsTemplateDir)) {
    const agentFiles = readdirSync(agentsTemplateDir).filter(f => f.endsWith(".md"));
    for (const file of agentFiles) {
      const destPath = join(agentsDestDir, file);
      if (!existsSync(destPath)) {
        copyFileSync(join(agentsTemplateDir, file), destPath);
      }
    }
  }

  // Copy default commands from templates
  const commandsTemplateDir = getPackageTemplatePath("commands");
  const commandsDestDir = getCommandsDir(agentName);
  if (existsSync(commandsTemplateDir)) {
    const commandFiles = readdirSync(commandsTemplateDir).filter(f => f.endsWith(".md"));
    for (const file of commandFiles) {
      const destPath = join(commandsDestDir, file);
      if (!existsSync(destPath)) {
        copyFileSync(join(commandsTemplateDir, file), destPath);
      }
    }
  }

  // Copy default rules from templates
  const rulesTemplateDir = getPackageTemplatePath("rules");
  const rulesDestDir = getRulesDir(agentName);
  if (existsSync(rulesTemplateDir)) {
    const ruleFiles = readdirSync(rulesTemplateDir).filter(f => f.endsWith(".md"));
    for (const file of ruleFiles) {
      const destPath = join(rulesDestDir, file);
      if (!existsSync(destPath)) {
        copyFileSync(join(rulesTemplateDir, file), destPath);
      }
    }
  }
}
