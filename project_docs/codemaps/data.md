# Data Layer Overview
> Last scanned: 2026-02-05 01:15

## Memory Module (src/memory/)
src/memory/
  |- index.ts              # Memory exports
  |- manager.ts            # MemoryManager class
  |- schema.ts             # SQLite schema definitions
  |- search.ts             # Semantic + keyword search
  |- chunking.ts           # Text chunking for indexing
  |- cache.ts              # Embedding cache
  |- sync.ts               # File sync to database
  |- watcher.ts            # File change watching
  |- hybrid.ts             # Hybrid search implementation
  |- embeddings/           # Embedding providers (13 files)
      |- index.ts          # Provider exports
      |- provider.ts       # Base provider interface
      |- provider-key.ts   # API key provider
      |- local.ts          # node-llama-cpp embeddings
      |- openai.ts         # OpenAI embeddings
      |- gemini.ts         # Gemini embeddings
      |- fallback.ts       # Fallback chain
      |- batch-manager.ts  # Batch processing
      |- batch-openai.ts   # OpenAI batching
      |- batch-gemini.ts   # Gemini batching
      |- batch-failure.ts  # Failure handling
      |- retry.ts          # Retry logic
      |- timeout.ts        # Timeout handling

## Storage Module (src/storage/)
src/storage/
  |- index.ts              # Storage exports
  |- atomic-reindex.ts     # Atomic reindex operations

## Core Config (src/core/)
src/core/config/
  |- index.ts              # Config exports
  |- defaults.ts           # Default values
  |- types.ts              # Config types

## Database
- SQLite with sqlite-vec for vector search
- Tables: chunks (content + embeddings), files (metadata)
- FTS5 for keyword search

## External Dependencies
better-sqlite3, sqlite-vec, node-llama-cpp, openai
