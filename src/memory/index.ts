// Core
export * from "./manager.js";
export * from "./search.js";
export * from "./schema.js";
export * from "./cache.js";
export * from "./chunking.js";
export * from "./hybrid.js";

// Sync and watcher - export explicitly to avoid conflicts
export { syncMemory, type SyncResult, type FileEntry } from "./sync.js";
export { AgentMemoryWatcher, createMemoryWatcher, createAgentWatcher, type WatcherOptions } from "./watcher.js";

// Embeddings
export * from "./embeddings/index.js";
