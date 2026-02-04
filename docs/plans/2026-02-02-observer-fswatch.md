# Observer fs.watch() and Missing Features Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cross-platform observer triggering via fs.watch() and add missing --force flag to instinct-cli.js.

**Architecture:** Replace Unix-only signaling with fs.watch() on observations.jsonl. Add debouncing to prevent excessive triggers. Add --force flag to import command.

**Tech Stack:** Node.js fs.watch()

---

## Task 1: Add fs.watch() to start-observer.js

**Files:**
- Modify: `src/templates/skills/continuous-learning-v2/agents/start-observer.js`

**Step 1: Add debounce utility and file watcher**

After the constants, add:

```javascript
// Debounce utility
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

**Step 2: Update runDaemon() to use fs.watch()**

In the `runDaemon()` function, after writing the PID file and before the main loop, add file watching:

```javascript
  // Watch for new observations (cross-platform alternative to Unix signals)
  // Debounce to avoid excessive triggers during rapid tool use
  const debouncedAnalyze = debounce(async () => {
    try {
      await analyzeObservations();
    } catch (err) {
      log(`Watch trigger error: ${err.message}`);
    }
  }, 10000); // 10 second debounce

  // Start watching if file exists, create watcher when file appears
  const startWatcher = () => {
    if (fs.existsSync(OBSERVATIONS_FILE)) {
      try {
        const watcher = fs.watch(OBSERVATIONS_FILE, (eventType) => {
          if (eventType === 'change') {
            debouncedAnalyze();
          }
        });
        watcher.on('error', (err) => {
          log(`Watcher error: ${err.message}`);
        });
        log('File watcher started');
      } catch (err) {
        log(`Failed to start watcher: ${err.message}`);
      }
    }
  };

  startWatcher();
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/templates/skills/continuous-learning-v2/agents/start-observer.js
git commit -m "feat: add fs.watch() for cross-platform observer triggering"
```

---

## Task 2: Add --force flag to instinct-cli.js

**Files:**
- Modify: `src/templates/skills/continuous-learning-v2/scripts/instinct-cli.js`

**Step 1: Add --force to parseArgs()**

In the `parseArgs()` function, add handling for --force:

```javascript
    } else if (arg === '--force') {
      options.force = true;
```

**Step 2: Add confirmation prompt to cmdImport()**

The import command should prompt for confirmation unless --force is passed. Add after the summary display (before writing):

```javascript
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
```

**Step 3: Update help text**

In `printHelp()`, the import options should already show --force but verify it includes:

```
Import options:
  --dry-run                 Preview without importing
  --force                   Skip confirmation prompt
  --min-confidence <n>      Minimum confidence threshold (0-1)
```

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add src/templates/skills/continuous-learning-v2/scripts/instinct-cli.js
git commit -m "feat: add --force flag to instinct-cli import command"
```

---

## Task 3: Clean dist and Test

**Step 1: Clean stale files from dist**

```bash
rm -rf dist/templates/skills/continuous-learning-v2
npm run build
```

**Step 2: Recreate test agent**

```bash
echo "yes" | npx agent-hub delete test-observer-agent 2>/dev/null; true
npx agent-hub create test-observer-agent
```

**Step 3: Test start-observer.js with watcher**

```bash
# Start observer
node ~/.agent-hub/agents/test-observer-agent/skills/continuous-learning-v2/agents/start-observer.js start

# Check status
node ~/.agent-hub/agents/test-observer-agent/skills/continuous-learning-v2/agents/start-observer.js status

# Check log for "File watcher started"
cat ~/.claude/homunculus/observer.log

# Stop observer
node ~/.agent-hub/agents/test-observer-agent/skills/continuous-learning-v2/agents/start-observer.js stop
```

**Step 4: Test instinct-cli.js --force flag**

```bash
# Create a test instinct file
cat > /tmp/test-instinct.yaml << 'EOF'
---
id: test-instinct-1
trigger: "when testing"
confidence: 0.8
domain: testing
source: test
---

# Test Instinct

## Action
This is a test instinct.
EOF

# Test without --force (should prompt)
node ~/.agent-hub/agents/test-observer-agent/skills/continuous-learning-v2/scripts/instinct-cli.js import /tmp/test-instinct.yaml --dry-run

# Test with --force (should not prompt)
# node ~/.agent-hub/agents/test-observer-agent/skills/continuous-learning-v2/scripts/instinct-cli.js import /tmp/test-instinct.yaml --force
```

**Step 5: Clean up**

```bash
echo "yes" | npx agent-hub delete test-observer-agent
rm -f /tmp/test-instinct.yaml
```

---

## Summary

After completion:
- Observer uses fs.watch() for cross-platform real-time triggering
- 10-second debounce prevents excessive analysis during rapid tool use
- MIN_OBSERVATIONS=10 check still applies (no analysis until 10+ observations)
- instinct-cli.js import command has --force flag matching Python version
- No Unix-specific code (signals) - works on Windows, macOS, Linux
