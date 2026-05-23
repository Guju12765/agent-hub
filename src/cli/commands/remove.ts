/**
 * agent-hub remove <agent> [assets...] — Remove assets from an agent
 */

import { removeAssets } from "../../agent/manager.js";

export async function removeCommand(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("Usage: agent-hub remove <agent-name> <asset1> [asset2...]");
    process.exit(1);
  }

  const [name, ...assets] = args;
  const manifest = removeAssets(name, assets);
  console.log(`Updated agent "${name}". Assets: ${manifest.assets.join(", ")}`);
}
