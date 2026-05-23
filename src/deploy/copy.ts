/**
 * Copy assets from cached registry to project
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RegistryEntry } from "../agent/types.js";
import { resolveAssetPath } from "../registry/fetch.js";

/** Copy a single asset to the project's .claude/ directory */
export function copyAssetToProject(
  entry: RegistryEntry,
  registryPath: string,
  projectDir: string,
): void {
  const assetDir = join(registryPath, resolveAssetPath(entry));
  const claudeDir = join(projectDir, ".claude");

  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  switch (entry.type) {
    case "skill": {
      const targetDir = join(claudeDir, "skills", entry.name);
      mkdirSync(targetDir, { recursive: true });
      copyDirContents(assetDir, targetDir, ["asset.json"]);
      break;
    }
    case "rule": {
      const targetDir = join(claudeDir, "rules");
      mkdirSync(targetDir, { recursive: true });
      const files = readdirSync(assetDir).filter((f) => f !== "asset.json" && f.endsWith(".md"));
      for (const file of files) {
        copyFileSync(join(assetDir, file), join(targetDir, file));
      }
      break;
    }
    case "claude-md": {
      const sourceFile = join(assetDir, "CLAUDE.md");
      if (existsSync(sourceFile)) {
        writeFileSync(join(claudeDir, "CLAUDE.md"), readFileSync(sourceFile, "utf-8"));
      }
      break;
    }
    // Dependencies handled separately in dependencies.ts
  }
}

/** Copy directory contents, excluding specified files */
function copyDirContents(src: string, dest: string, exclude: string[]): void {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDirContents(srcPath, destPath, exclude);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
