#!/usr/bin/env node
/**
 * Instinct CLI - Manage instincts for Continuous Learning v2
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Commands:
 *   status   - Show all instincts and their status
 *   import   - Import instincts from file or URL
 *   export   - Export instincts to file
 *   evolve   - Cluster instincts into skills/commands/agents
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');

// Configuration
const HOMUNCULUS_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const INSTINCTS_DIR = path.join(HOMUNCULUS_DIR, 'instincts');
const PERSONAL_DIR = path.join(INSTINCTS_DIR, 'personal');
const INHERITED_DIR = path.join(INSTINCTS_DIR, 'inherited');
const EVOLVED_DIR = path.join(HOMUNCULUS_DIR, 'evolved');
const OBSERVATIONS_FILE = path.join(HOMUNCULUS_DIR, 'observations.jsonl');

// Ensure directories exist
[PERSONAL_DIR, INHERITED_DIR,
 path.join(EVOLVED_DIR, 'skills'),
 path.join(EVOLVED_DIR, 'commands'),
 path.join(EVOLVED_DIR, 'agents')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─────────────────────────────────────────────
// Instinct Parser
// ─────────────────────────────────────────────

function parseInstinctFile(content) {
  const instincts = [];
  let current = {};
  let inFrontmatter = false;
  let contentLines = [];

  for (const line of content.split('\n')) {
    if (line.trim() === '---') {
      if (inFrontmatter) {
        // End of frontmatter
        inFrontmatter = false;
        if (Object.keys(current).length > 0) {
          current.content = contentLines.join('\n').trim();
          instincts.push(current);
          current = {};
          contentLines = [];
        }
      } else {
        // Start of frontmatter
        inFrontmatter = true;
        if (Object.keys(current).length > 0) {
          current.content = contentLines.join('\n').trim();
          instincts.push(current);
        }
        current = {};
        contentLines = [];
      }
    } else if (inFrontmatter) {
      // Parse YAML-like frontmatter
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();
        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');
        if (key === 'confidence') {
          current[key] = parseFloat(value);
        } else {
          current[key] = value;
        }
      }
    } else {
      contentLines.push(line);
    }
  }

  // Don't forget the last instinct
  if (Object.keys(current).length > 0) {
    current.content = contentLines.join('\n').trim();
    instincts.push(current);
  }

  return instincts.filter(i => i.id);
}

function loadAllInstincts() {
  const instincts = [];

  for (const directory of [PERSONAL_DIR, INHERITED_DIR]) {
    if (!fs.existsSync(directory)) continue;

    const files = fs.readdirSync(directory).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(directory, file), 'utf-8');
        const parsed = parseInstinctFile(content);
        for (const inst of parsed) {
          inst._sourceFile = path.join(directory, file);
          inst._sourceType = path.basename(directory);
        }
        instincts.push(...parsed);
      } catch (err) {
        console.error(`Warning: Failed to parse ${file}: ${err.message}`);
      }
    }
  }

  return instincts;
}

// ─────────────────────────────────────────────
// Status Command
// ─────────────────────────────────────────────

function cmdStatus() {
  const instincts = loadAllInstincts();

  if (instincts.length === 0) {
    console.log('No instincts found.');
    console.log(`\nInstinct directories:`);
    console.log(`  Personal:  ${PERSONAL_DIR}`);
    console.log(`  Inherited: ${INHERITED_DIR}`);
    return;
  }

  // Group by domain
  const byDomain = {};
  for (const inst of instincts) {
    const domain = inst.domain || 'general';
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(inst);
  }

  // Print header
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  INSTINCT STATUS - ${instincts.length} total`);
  console.log(`${'='.repeat(60)}\n`);

  // Summary by source
  const personal = instincts.filter(i => i._sourceType === 'personal');
  const inherited = instincts.filter(i => i._sourceType === 'inherited');
  console.log(`  Personal:  ${personal.length}`);
  console.log(`  Inherited: ${inherited.length}`);
  console.log();

  // Print by domain
  for (const domain of Object.keys(byDomain).sort()) {
    const domainInstincts = byDomain[domain];
    console.log(`## ${domain.toUpperCase()} (${domainInstincts.length})`);
    console.log();

    // Sort by confidence descending
    domainInstincts.sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5));

    for (const inst of domainInstincts) {
      const conf = inst.confidence || 0.5;
      const filled = Math.round(conf * 10);
      const confBar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
      const trigger = inst.trigger || 'unknown trigger';

      console.log(`  ${confBar} ${Math.round(conf * 100).toString().padStart(3)}%  ${inst.id || 'unnamed'}`);
      console.log(`            trigger: ${trigger}`);

      // Extract action from content
      const content = inst.content || '';
      const actionMatch = content.match(/## Action\s*\n\s*(.+?)(?:\n\n|\n##|$)/s);
      if (actionMatch) {
        const action = actionMatch[1].trim().split('\n')[0];
        const truncated = action.length > 60 ? action.slice(0, 60) + '...' : action;
        console.log(`            action: ${truncated}`);
      }

      console.log();
    }
  }

  // Observations stats
  if (fs.existsSync(OBSERVATIONS_FILE)) {
    const obsCount = fs.readFileSync(OBSERVATIONS_FILE, 'utf-8').trim().split('\n').filter(Boolean).length;
    console.log('\u2500'.repeat(60));
    console.log(`  Observations: ${obsCount} events logged`);
    console.log(`  File: ${OBSERVATIONS_FILE}`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

// ─────────────────────────────────────────────
// Import Command
// ─────────────────────────────────────────────

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function cmdImport(source, options) {
  let content;

  // Fetch content
  if (source.startsWith('http://') || source.startsWith('https://')) {
    console.log(`Fetching from URL: ${source}`);
    try {
      content = await fetchUrl(source);
    } catch (err) {
      console.error(`Error fetching URL: ${err.message}`);
      process.exit(1);
    }
  } else {
    const filePath = path.resolve(source);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    content = fs.readFileSync(filePath, 'utf-8');
  }

  // Parse instincts
  const newInstincts = parseInstinctFile(content);
  if (newInstincts.length === 0) {
    console.log('No valid instincts found in source.');
    process.exit(1);
  }

  console.log(`\nFound ${newInstincts.length} instincts to import.\n`);

  // Load existing
  const existing = loadAllInstincts();
  const existingIds = new Set(existing.map(i => i.id));

  // Categorize
  const toAdd = [];
  const duplicates = [];
  const toUpdate = [];

  for (const inst of newInstincts) {
    const instId = inst.id;
    if (existingIds.has(instId)) {
      const existingInst = existing.find(e => e.id === instId);
      if (existingInst && (inst.confidence || 0) > (existingInst.confidence || 0)) {
        toUpdate.push(inst);
      } else {
        duplicates.push(inst);
      }
    } else {
      toAdd.push(inst);
    }
  }

  // Filter by minimum confidence
  const minConf = options.minConfidence || 0;
  const filteredAdd = toAdd.filter(i => (i.confidence || 0.5) >= minConf);
  const filteredUpdate = toUpdate.filter(i => (i.confidence || 0.5) >= minConf);

  // Display summary
  if (filteredAdd.length > 0) {
    console.log(`NEW (${filteredAdd.length}):`);
    for (const inst of filteredAdd) {
      console.log(`  + ${inst.id} (confidence: ${(inst.confidence || 0.5).toFixed(2)})`);
    }
  }

  if (filteredUpdate.length > 0) {
    console.log(`\nUPDATE (${filteredUpdate.length}):`);
    for (const inst of filteredUpdate) {
      console.log(`  ~ ${inst.id} (confidence: ${(inst.confidence || 0.5).toFixed(2)})`);
    }
  }

  if (duplicates.length > 0) {
    console.log(`\nSKIP (${duplicates.length} - already exists with equal/higher confidence):`);
    for (const inst of duplicates.slice(0, 5)) {
      console.log(`  - ${inst.id}`);
    }
    if (duplicates.length > 5) {
      console.log(`  ... and ${duplicates.length - 5} more`);
    }
  }

  if (options.dryRun) {
    console.log('\n[DRY RUN] No changes made.');
    return;
  }

  if (filteredAdd.length === 0 && filteredUpdate.length === 0) {
    console.log('\nNothing to import.');
    return;
  }

  // Confirm unless --force
  if (!options.force) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`\nImport ${filteredAdd.length} new, update ${filteredUpdate.length}? [y/N] `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      return;
    }
  }

  // Write to inherited directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sourceName = source.startsWith('http') ? 'web-import' : path.basename(source, path.extname(source));
  const outputFile = path.join(INHERITED_DIR, `${sourceName}-${timestamp}.yaml`);

  const allToWrite = [...filteredAdd, ...filteredUpdate];
  let outputContent = `# Imported from ${source}\n# Date: ${new Date().toISOString()}\n\n`;

  for (const inst of allToWrite) {
    outputContent += '---\n';
    outputContent += `id: ${inst.id}\n`;
    outputContent += `trigger: "${inst.trigger || 'unknown'}"\n`;
    outputContent += `confidence: ${inst.confidence || 0.5}\n`;
    outputContent += `domain: ${inst.domain || 'general'}\n`;
    outputContent += `source: inherited\n`;
    outputContent += `imported_from: "${source}"\n`;
    if (inst.source_repo) {
      outputContent += `source_repo: ${inst.source_repo}\n`;
    }
    outputContent += '---\n\n';
    outputContent += (inst.content || '') + '\n\n';
  }

  fs.writeFileSync(outputFile, outputContent);

  console.log(`\n\u2705 Import complete!`);
  console.log(`   Added: ${filteredAdd.length}`);
  console.log(`   Updated: ${filteredUpdate.length}`);
  console.log(`   Saved to: ${outputFile}`);
}

// ─────────────────────────────────────────────
// Export Command
// ─────────────────────────────────────────────

function cmdExport(options) {
  let instincts = loadAllInstincts();

  if (instincts.length === 0) {
    console.log('No instincts to export.');
    process.exit(1);
  }

  // Filter by domain if specified
  if (options.domain) {
    instincts = instincts.filter(i => i.domain === options.domain);
  }

  // Filter by minimum confidence
  if (options.minConfidence) {
    instincts = instincts.filter(i => (i.confidence || 0.5) >= options.minConfidence);
  }

  if (instincts.length === 0) {
    console.log('No instincts match the criteria.');
    process.exit(1);
  }

  // Generate output
  let output = `# Instincts export\n# Date: ${new Date().toISOString()}\n# Total: ${instincts.length}\n\n`;

  for (const inst of instincts) {
    output += '---\n';
    for (const key of ['id', 'trigger', 'confidence', 'domain', 'source', 'source_repo']) {
      if (inst[key] !== undefined) {
        if (key === 'trigger') {
          output += `${key}: "${inst[key]}"\n`;
        } else {
          output += `${key}: ${inst[key]}\n`;
        }
      }
    }
    output += '---\n\n';
    output += (inst.content || '') + '\n\n';
  }

  // Write to file or stdout
  if (options.output) {
    fs.writeFileSync(options.output, output);
    console.log(`Exported ${instincts.length} instincts to ${options.output}`);
  } else {
    console.log(output);
  }
}

// ─────────────────────────────────────────────
// Evolve Command
// ─────────────────────────────────────────────

function cmdEvolve(options) {
  const instincts = loadAllInstincts();

  if (instincts.length < 3) {
    console.log('Need at least 3 instincts to analyze patterns.');
    console.log(`Currently have: ${instincts.length}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  EVOLVE ANALYSIS - ${instincts.length} instincts`);
  console.log(`${'='.repeat(60)}\n`);

  // Group by domain
  const byDomain = {};
  for (const inst of instincts) {
    const domain = inst.domain || 'general';
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(inst);
  }

  // High-confidence instincts
  const highConf = instincts.filter(i => (i.confidence || 0) >= 0.8);
  console.log(`High confidence instincts (>=80%): ${highConf.length}`);

  // Find clusters (instincts with similar triggers)
  const triggerClusters = {};
  for (const inst of instincts) {
    let trigger = (inst.trigger || '').toLowerCase();
    // Normalize trigger
    for (const word of ['when', 'creating', 'writing', 'adding', 'implementing', 'testing']) {
      trigger = trigger.replace(word, '').trim();
    }
    if (!triggerClusters[trigger]) triggerClusters[trigger] = [];
    triggerClusters[trigger].push(inst);
  }

  // Find clusters with 2+ instincts
  const skillCandidates = [];
  for (const [trigger, cluster] of Object.entries(triggerClusters)) {
    if (cluster.length >= 2) {
      const avgConf = cluster.reduce((sum, i) => sum + (i.confidence || 0.5), 0) / cluster.length;
      skillCandidates.push({
        trigger,
        instincts: cluster,
        avgConfidence: avgConf,
        domains: [...new Set(cluster.map(i => i.domain || 'general'))]
      });
    }
  }

  // Sort by cluster size and confidence
  skillCandidates.sort((a, b) => {
    if (b.instincts.length !== a.instincts.length) {
      return b.instincts.length - a.instincts.length;
    }
    return b.avgConfidence - a.avgConfidence;
  });

  console.log(`\nPotential skill clusters found: ${skillCandidates.length}`);

  if (skillCandidates.length > 0) {
    console.log(`\n## SKILL CANDIDATES\n`);
    for (let i = 0; i < Math.min(5, skillCandidates.length); i++) {
      const cand = skillCandidates[i];
      console.log(`${i + 1}. Cluster: "${cand.trigger}"`);
      console.log(`   Instincts: ${cand.instincts.length}`);
      console.log(`   Avg confidence: ${Math.round(cand.avgConfidence * 100)}%`);
      console.log(`   Domains: ${cand.domains.join(', ')}`);
      console.log(`   Instincts:`);
      for (const inst of cand.instincts.slice(0, 3)) {
        console.log(`     - ${inst.id}`);
      }
      console.log();
    }
  }

  // Command candidates
  const workflowInstincts = instincts.filter(i => i.domain === 'workflow' && (i.confidence || 0) >= 0.7);
  if (workflowInstincts.length > 0) {
    console.log(`\n## COMMAND CANDIDATES (${workflowInstincts.length})\n`);
    for (const inst of workflowInstincts.slice(0, 5)) {
      const trigger = inst.trigger || 'unknown';
      let cmdName = trigger.replace(/when /i, '').replace(/implementing /i, '').replace(/a /i, '');
      cmdName = cmdName.replace(/ /g, '-').slice(0, 20);
      console.log(`  /${cmdName}`);
      console.log(`    From: ${inst.id}`);
      console.log(`    Confidence: ${Math.round((inst.confidence || 0.5) * 100)}%`);
      console.log();
    }
  }

  // Agent candidates
  const agentCandidates = skillCandidates.filter(c => c.instincts.length >= 3 && c.avgConfidence >= 0.75);
  if (agentCandidates.length > 0) {
    console.log(`\n## AGENT CANDIDATES (${agentCandidates.length})\n`);
    for (const cand of agentCandidates.slice(0, 3)) {
      const agentName = cand.trigger.replace(/ /g, '-').slice(0, 20) + '-agent';
      console.log(`  ${agentName}`);
      console.log(`    Covers ${cand.instincts.length} instincts`);
      console.log(`    Avg confidence: ${Math.round(cand.avgConfidence * 100)}%`);
      console.log();
    }
  }

  if (options.generate) {
    console.log('\n[Would generate evolved structures here]');
    console.log(`  Skills would be saved to: ${path.join(EVOLVED_DIR, 'skills')}`);
    console.log(`  Commands would be saved to: ${path.join(EVOLVED_DIR, 'commands')}`);
    console.log(`  Agents would be saved to: ${path.join(EVOLVED_DIR, 'agents')}`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function printHelp() {
  console.log(`
Instinct CLI - Manage instincts for Continuous Learning v2

Usage: node instinct-cli.js <command> [options]

Commands:
  status                    Show all instincts and their status
  import <source>           Import instincts from file or URL
  export                    Export instincts to stdout or file
  evolve                    Analyze instincts and suggest evolutions

Import options:
  --dry-run                 Preview without importing
  --force                   Skip confirmation prompt
  --min-confidence <n>      Minimum confidence threshold (0-1)

Export options:
  --output, -o <file>       Output file (default: stdout)
  --domain <name>           Filter by domain
  --min-confidence <n>      Minimum confidence threshold (0-1)

Evolve options:
  --generate                Generate evolved structures

Examples:
  node instinct-cli.js status
  node instinct-cli.js import ./instincts.yaml
  node instinct-cli.js import https://example.com/instincts.yaml --dry-run
  node instinct-cli.js export -o backup.yaml --min-confidence 0.7
  node instinct-cli.js evolve --generate
`);
}

function parseArgs(args) {
  const options = {};
  const positionals = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--generate') {
      options.generate = true;
    } else if (arg === '--min-confidence' && args[i + 1]) {
      options.minConfidence = parseFloat(args[++i]);
    } else if ((arg === '--output' || arg === '-o') && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--domain' && args[i + 1]) {
      options.domain = args[++i];
    } else if (!arg.startsWith('-')) {
      positionals.push(arg);
    }
  }

  return { options, positionals };
}

async function main() {
  const args = process.argv.slice(2);
  const { options, positionals } = parseArgs(args);
  const command = positionals[0];

  switch (command) {
    case 'status':
      cmdStatus();
      break;
    case 'import':
      if (!positionals[1]) {
        console.error('Error: import requires a source file or URL');
        process.exit(1);
      }
      await cmdImport(positionals[1], options);
      break;
    case 'export':
      cmdExport(options);
      break;
    case 'evolve':
      cmdEvolve(options);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
