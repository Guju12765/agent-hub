/**
 * agent-hub list — Browse registry assets and agents
 */

import { readIndex } from "../../registry/cache.js";

export async function listCommand(_args: string[]): Promise<void> {
  const entries = readIndex();

  if (entries.length === 0) {
    console.error("No assets found in registry.");
    return;
  }

  // Group by type
  const grouped: Record<string, typeof entries> = {};
  for (const entry of entries) {
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
  }

  for (const [type, items] of Object.entries(grouped)) {
    const label = type === "dependency" ? "DEPENDENCIES" : `${type.toUpperCase()}S`;
    console.log(`\n${label}:`);
    for (const item of items) {
      console.log(`  ${item.name.padEnd(25)} ${item.description}`);
    }
  }

  console.log(`\nTotal: ${entries.length} assets`);
}
