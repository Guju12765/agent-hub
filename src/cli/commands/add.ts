/**
 * agent-hub add <agent> [assets...] — Add assets to an agent
 */

import { addAssets } from "../../agent/manager.js";

export async function addCommand(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("Usage: agent-hub add <agent-name> <asset1> [asset2...]");
    process.exit(1);
  }

  const [name, ...assets] = args;
  const manifest = addAssets(name, assets);
  console.log(`Updated agent "${name}". Assets: ${manifest.assets.join(", ")}`);
}
