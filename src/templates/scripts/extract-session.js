#!/usr/bin/env node
/**
 * Extract Session - Convert JSONL transcript to markdown
 * Cross-platform (Windows, macOS, Linux)
 *
 * Self-contained script (no external dependencies) for ES module compatibility.
 */

const fs = require('fs');
const path = require('path');

// Inline utilities (for ES module compatibility)
function getSessionsDir() {
  return path.join(process.cwd(), '.claude', 'memory', 'sessions');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function log(message) {
  console.error(message);
}

// Configuration
const config = {
  includedTools: ['Edit', 'Write', 'NotebookEdit', 'Bash'],
  bashPatterns: [/git commit/, /git push/, /git checkout/, /git merge/, /npm run build/, /npm test/],
  skipUserPatterns: ['<local-command', '<system-reminder', '<tool_result', '<command-name>/', 'tool_use_id'],
  maxContentLength: 1000,
  maxToolOutputLength: 200
};

function parseJsonl(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function getTextContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textBlock = content.find(b => b.type === 'text');
    return textBlock?.text || '';
  }
  return '';
}

function shouldSkipUser(content) {
  return config.skipUserPatterns.some(p => content.includes(p));
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max) + '...';
}

function extractToolInfo(block) {
  const { name, input } = block;
  if (name === 'Edit' || name === 'Write' || name === 'NotebookEdit') {
    const file = input?.file_path?.replace(/.*[\\\/]/, '') || 'unknown';
    return { tool: name, file };
  }
  if (name === 'Bash') {
    const cmd = input?.command || '';
    if (config.bashPatterns.some(p => p.test(cmd))) {
      return { tool: 'Bash', command: truncate(cmd, config.maxToolOutputLength) };
    }
  }
  return null;
}

function extractSession(entries) {
  const result = { sessionId: null, startTime: null, messages: [] };

  for (const entry of entries) {
    if (!result.sessionId && entry.sessionId) result.sessionId = entry.sessionId;
    if (!result.startTime && entry.timestamp) result.startTime = entry.timestamp;

    // User messages
    if (entry.type === 'user' && !entry.isMeta) {
      const content = getTextContent(entry.message?.content);
      if (content && !shouldSkipUser(content)) {
        result.messages.push({
          type: 'user',
          time: entry.timestamp,
          content: truncate(content, config.maxContentLength)
        });
      }
    }

    // Assistant responses
    if (entry.type === 'assistant' && entry.message?.content) {
      const blocks = Array.isArray(entry.message.content) ? entry.message.content : [];

      for (const block of blocks) {
        if (block.type === 'text' && block.text?.trim()) {
          result.messages.push({
            type: 'claude',
            time: entry.timestamp,
            content: truncate(block.text, config.maxContentLength)
          });
        }
        if (block.type === 'tool_use' && config.includedTools.includes(block.name)) {
          const toolMsg = extractToolInfo(block);
          if (toolMsg) {
            result.messages.push({ type: 'tool', time: entry.timestamp, ...toolMsg });
          }
        }
      }
    }
  }
  return result;
}

function formatMarkdown(session) {
  const lines = [];
  const startDate = session.startTime ? new Date(session.startTime) : new Date();
  const dateStr = startDate.toISOString().slice(0, 10);
  const shortId = session.sessionId?.slice(0, 8) || 'unknown';

  lines.push(`# Session: ${dateStr}`);
  lines.push('');
  lines.push(`**Session ID:** ${shortId}`);
  lines.push(`**Started:** ${startDate.toISOString().slice(11, 19)}`);
  lines.push(`**Extracted:** ${new Date().toISOString().slice(11, 19)}`);
  lines.push(`**Messages:** ${session.messages.filter(m => m.type === 'user').length} user, ${session.messages.filter(m => m.type === 'claude').length} assistant`);
  lines.push('');
  lines.push('---');
  lines.push('');

  let lastTime = '';
  for (const msg of session.messages) {
    const time = msg.time?.slice(11, 16) || '??:??';

    if (msg.type === 'user') {
      lines.push(`### ${time} - User`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    } else if (msg.type === 'claude') {
      if (time !== lastTime) {
        lines.push(`### ${time} - Claude`);
        lines.push('');
      }
      lines.push(msg.content);
      lines.push('');
    } else if (msg.type === 'tool') {
      if (msg.tool === 'Bash') {
        lines.push(`> [Bash] \`${msg.command}\``);
      } else {
        lines.push(`> [${msg.tool}] \`${msg.file}\``);
      }
      lines.push('');
    }
    lastTime = time;
  }

  return lines.join('\n');
}

async function main() {
  const transcriptPath = process.argv[2] || process.env.CLAUDE_TRANSCRIPT_PATH;

  if (!transcriptPath) {
    log('[ExtractSession] No transcript path. Usage: node extract-session.js <path>');
    process.exit(0);
  }

  if (!fs.existsSync(transcriptPath)) {
    log(`[ExtractSession] Transcript not found: ${transcriptPath}`);
    process.exit(0);
  }

  const entries = parseJsonl(transcriptPath);
  log(`[ExtractSession] Parsed ${entries.length} entries`);

  const session = extractSession(entries);
  log(`[ExtractSession] Extracted ${session.messages.length} messages`);

  const markdown = formatMarkdown(session);

  const sessionsDir = getSessionsDir();
  ensureDir(sessionsDir);

  const startDate = session.startTime ? new Date(session.startTime) : new Date();
  const dateStr = startDate.toISOString().slice(0, 10);
  const timeStr = startDate.toISOString().slice(11, 19).replace(/:/g, '');
  const shortId = session.sessionId?.slice(0, 8) || 'unknown';
  const outputFile = path.join(sessionsDir, `${dateStr}-${timeStr}-${shortId}-session.md`);

  writeFile(outputFile, markdown);
  log(`[ExtractSession] Written: ${outputFile}`);

  process.exit(0);
}

main().catch(err => {
  console.error('[ExtractSession] Error:', err.message);
  process.exit(0);
});
