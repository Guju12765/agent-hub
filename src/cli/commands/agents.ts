/**
 * agent-hub agents — List local agents
 */

import { listAgents } from "../../agent/manager.js";

export async function agentsCommand(_args: string[]): Promise<void> {
  const agents = listAgents();

  if (agents.length === 0) {
    console.log("No agents created yet. Use 'agent-hub create' to create one.");
    return;
  }

  console.log("Your agents:\n");
  for (const agent of agents) {
    console.log(`  ${agent.name}`);
    if (agent.assets.length > 0) {
      console.log(`    Assets: ${agent.assets.join(", ")}`);
    }
    if (agent.created) {
      console.log(`    Created: ${agent.created}`);
    }
    console.log();
  }
}
