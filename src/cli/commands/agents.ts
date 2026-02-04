/**
 * Agents command - List all agents
 */

import { listAgents } from "../../agent/index.js";

export async function agentsCommand(_args: string[]): Promise<void> {
  const agents = listAgents();

  if (agents.length === 0) {
    console.log("No agents found.");
    console.log("");
    console.log("Create one with:");
    console.log('  npx agent-hub create <name> --specialty "description"');
    return;
  }

  console.log("Available agents:\n");

  for (const agent of agents) {
    console.log(`  ${agent.name}`);
    if (agent.specialty) {
      console.log(`    ${agent.specialty}`);
    }
    console.log(`    Created: ${agent.created.split("T")[0]}`);
    console.log("");
  }
}
