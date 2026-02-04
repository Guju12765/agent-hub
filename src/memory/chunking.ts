/**
 * Text chunking utilities for memory indexing
 * Adapted from OpenClaw's src/memory/internal.ts
 */

import { createHash } from "node:crypto";

export interface ChunkingConfig {
  tokens: number;
  overlap: number;
}

export interface TextChunk {
  text: string;
  startLine: number;
  endLine: number;
  hash: string;
}

// OpenClaw uses 1 char = 1 token for embedding estimation (conservative)
// This ensures we never exceed embedding model limits
const CHARS_PER_TOKEN = 1;

/**
 * Truncate string safely for UTF-16 (avoids splitting surrogate pairs)
 * Matches OpenClaw's utils.ts implementation
 */
export function truncateUtf16Safe(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  let end = maxChars;
  // Check if we're in the middle of a surrogate pair
  const charCode = text.charCodeAt(end - 1);
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    // High surrogate - back up one to avoid splitting the pair
    end--;
  }

  return text.slice(0, end);
}

/**
 * Hash text content for deduplication
 * Copied from OpenClaw - uses full SHA256 hash
 */
export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, config: ChunkingConfig): TextChunk[] {
  const { tokens, overlap } = config;
  const maxChars = Math.max(32, tokens * CHARS_PER_TOKEN);
  const overlapChars = Math.max(0, overlap * CHARS_PER_TOKEN);

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const lines = text.split("\n");

  let currentChunk = "";
  let chunkStartPos = 0;
  let currentPos = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWithNewline = i < lines.length - 1 ? line + "\n" : line;

    // If adding this line would exceed max, save current chunk
    if (
      currentChunk.length > 0 &&
      currentChunk.length + lineWithNewline.length > maxChars
    ) {
      const trimmed = currentChunk.trim();
      if (trimmed.length > 0) {
        chunks.push({
          text: trimmed,
          startLine: chunkStartPos,
          endLine: currentPos,
          hash: hashText(trimmed),
        });
      }

      // Calculate overlap start position
      const overlapStart = Math.max(0, currentChunk.length - overlapChars);
      const overlapText = currentChunk.slice(overlapStart);

      currentChunk = overlapText;
      chunkStartPos = currentPos - overlapText.length;
    }

    currentChunk += lineWithNewline;
    currentPos += lineWithNewline.length;
  }

  // Don't forget the last chunk
  const trimmed = currentChunk.trim();
  if (trimmed.length > 0) {
    chunks.push({
      text: trimmed,
      startLine: chunkStartPos,
      endLine: currentPos,
      hash: hashText(trimmed),
    });
  }

  return chunks;
}

/**
 * Chunk markdown content (line-based, no heading awareness)
 * Aligned with OpenClaw's simpler chunking approach
 */
export function chunkMarkdown(
  content: string,
  config: ChunkingConfig
): TextChunk[] {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const maxChars = Math.max(32, config.tokens * 4);
  const overlapChars = Math.max(0, config.overlap * 4);
  const chunks: TextChunk[] = [];

  let current: Array<{ line: string; lineNo: number }> = [];
  let currentChars = 0;

  const flush = () => {
    if (current.length === 0) return;
    const firstEntry = current[0];
    const lastEntry = current[current.length - 1];
    if (!firstEntry || !lastEntry) return;
    const text = current.map((entry) => entry.line).join("\n");
    const startLine = firstEntry.lineNo;
    const endLine = lastEntry.lineNo;
    chunks.push({
      startLine,
      endLine,
      text,
      hash: hashText(text),
    });
  };

  const carryOverlap = () => {
    if (overlapChars <= 0 || current.length === 0) {
      current = [];
      currentChars = 0;
      return;
    }
    let acc = 0;
    const kept: Array<{ line: string; lineNo: number }> = [];
    for (let i = current.length - 1; i >= 0; i -= 1) {
      const entry = current[i];
      if (!entry) continue;
      acc += entry.line.length + 1;
      kept.unshift(entry);
      if (acc >= overlapChars) break;
    }
    current = kept;
    currentChars = kept.reduce((sum, entry) => sum + entry.line.length + 1, 0);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    const segments: string[] = [];
    if (line.length === 0) {
      segments.push("");
    } else {
      for (let start = 0; start < line.length; start += maxChars) {
        segments.push(line.slice(start, start + maxChars));
      }
    }
    for (const segment of segments) {
      const lineSize = segment.length + 1;
      if (currentChars + lineSize > maxChars && current.length > 0) {
        flush();
        carryOverlap();
      }
      current.push({ line: segment, lineNo });
      currentChars += lineSize;
    }
  }
  flush();
  return chunks;
}

/**
 * Create a snippet from text (for search results)
 */
export function createSnippet(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to break at a sentence or word boundary
  let snippet = truncateUtf16Safe(text, maxLength);
  const lastSentence = snippet.lastIndexOf(". ");
  const lastWord = snippet.lastIndexOf(" ");

  if (lastSentence > maxLength * 0.7) {
    snippet = snippet.slice(0, lastSentence + 1);
  } else if (lastWord > maxLength * 0.8) {
    snippet = snippet.slice(0, lastWord);
  }

  return snippet + "...";
}
