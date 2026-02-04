/**
 * Create command - Create a new agent
 */

import { parseArgs } from "node:util";
import { createAgent } from "../../agent/index.js";

export async function createCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      specialty: { type: "string", short: "s" },
    },
    allowPositionals: true,
  });

  const name = positionals[0];

  if (!name) {
    console.error("Usage: npx agent-hub create <name> [--specialty <desc>]");
    console.error("");
    console.error("Examples:");
    console.error('  npx agent-hub create alice-fullstack');
    console.error('  npx agent-hub create alice-fullstack -s "Full-stack AI engineer"');
    process.exit(1);
  }

  const metadata = createAgent(name, {
    specialty: values.specialty,
  });

  console.log(`Created agent: ${metadata.name}`);
  if (metadata.specialty) {
    console.log(`Specialty: ${metadata.specialty}`);
  }
  console.log("");
  console.log(`To use this agent in a project:`);
  console.log(`  npx agent-hub hire ${name}`);
}
