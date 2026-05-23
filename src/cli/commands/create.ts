/**
 * agent-hub create <agent> [assets...] — Create a new agent
 */

import { createAgent } from "../../agent/manager.js";

export async function createCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: agent-hub create <agent-name> [assets...]");
    process.exit(1);
  }

  const [name, ...assets] = args;
  const manifest = createAgent(name, assets);

  console.log(`Created agent "${manifest.name}"`);
  if (manifest.assets.length > 0) {
    console.log(`Assets: ${manifest.assets.join(", ")}`);
  } else {
    console.log("No assets added. Use 'agent-hub add' to add assets.");
  }
}
