/**
 * Deploy orchestration
 */

import { existsSync, readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentManifest } from "../agent/types.js";
import { readIndex } from "../registry/cache.js";
import { getRegistryPath, resolveAssetPath } from "../registry/fetch.js";
import { copyAssetToProject } from "./copy.js";
import { loadDependencyConfig, installDependency, toMcpEntry } from "./dependencies.js";
import { claudeAdapter } from "../targets/claude.js";

/** Deploy an agent's assets to the current project */
export async function deployAgent(manifest: AgentManifest, projectDir: string): Promise<void> {
  const index = readIndex();
  const registryPath = getRegistryPath();

  if (index.length === 0) {
    throw new Error("No assets found in registry.");
  }

  console.log(`Deploying agent "${manifest.name}" to ${projectDir}...`);

  let copied = 0;
  let depsInstalled = 0;

  for (const assetName of manifest.assets) {
    const entry = index.find((e) => e.name === assetName);
    if (!entry) {
      console.error(`  Warning: asset "${assetName}" not found in registry, skipping`);
      continue;
    }

    if (entry.type === "dependency") {
      const config = loadDependencyConfig(entry, registryPath);
      const installed = await installDependency(entry, config);

      if (installed) {
        const mcpEntry = toMcpEntry(config);
        if (mcpEntry) {
          claudeAdapter.injectMcp(entry.name, mcpEntry);
        }
        // Copy bundled rule files to .claude/rules/
        if (config.rules && config.rules.length > 0) {
          const assetDir = join(registryPath, resolveAssetPath(entry));
          const rulesDir = join(projectDir, ".claude", "rules");
          mkdirSync(rulesDir, { recursive: true });
          for (const ruleFile of config.rules) {
            const src = join(assetDir, ruleFile);
            if (existsSync(src)) {
              copyFileSync(src, join(rulesDir, ruleFile));
              console.log(`  Copied rule: ${ruleFile}`);
            }
          }
        }
        depsInstalled++;
      }
    } else if (entry.type === "agent") {
      // Registry agent — resolve its assets recursively
      const agentJsonPath = join(registryPath, "agents", entry.name, "agent.json");
      if (existsSync(agentJsonPath)) {
        const nestedManifest: AgentManifest = JSON.parse(readFileSync(agentJsonPath, "utf-8"));
        await deployAgent(nestedManifest, projectDir);
      } else {
        console.error(`  Warning: agent "${entry.name}" manifest not found, skipping`);
      }
    } else {
      copyAssetToProject(entry, registryPath, projectDir);
      copied++;
      console.log(`  Copied: ${entry.name} (${entry.type})`);
    }
  }

  console.log(`\nDone. ${copied} assets copied, ${depsInstalled} dependencies installed.`);
}

export { copyAssetToProject } from "./copy.js";
export { loadDependencyConfig, installDependency, toMcpEntry } from "./dependencies.js";
