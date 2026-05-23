/**
 * Status command - Show agent status
 *
 * Note: Memory statistics now require the MCP server to be running.
 * This command shows basic agent metadata.
 */

import { getAgentInfo, getDefaultAgent } from "../../agent/index.js";

export async function statusCommand(args: string[]): Promise<void> {
  let name = args[0];

  if (!name) {
    // Try default agent
    name = getDefaultAgent() || "";
    if (!name) {
      console.error("Usage: npx agent-hub status <name>");
      console.error("");
      console.error("Or set a default agent:");
      console.error("  npx agent-hub default <name>");
      process.exit(1);
    }
  }

  const info = getAgentInfo(name);
  if (!info) {
    console.error(`Agent not found: ${name}`);
    process.exit(1);
  }

  console.log(`Agent: ${info.name}`);
  if (info.specialty) {
    console.log(`Specialty: ${info.specialty}`);
  }
  console.log(`Created: ${info.created.split("T")[0]}`);
  console.log("");
  console.log("Use the MCP server (memory_status tool) for detailed memory statistics.");
}
