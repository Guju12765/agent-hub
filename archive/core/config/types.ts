/**
 * Configuration types for the Memory MCP Server
 */

export type EmbeddingProvider = "openai" | "gemini" | "local" | "auto";

export type MemorySource = "manual" | "auto" | "session" | "mcp" | string;

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  dimensions?: number;
  // Local embedding options
  modelPath?: string;
  modelCacheDir?: string;
  // Fallback provider if primary fails
  fallback?: EmbeddingProvider;
}

export interface StorageConfig {
  path: string;
  vectorExtension?: string;
}

export interface CaptureConfig {
  auto: boolean;
  minLength: number;
  maxLength: number;
  duplicateThreshold: number;
}

export interface SearchConfig {
  defaultLimit: number;
  minScore: number;
  hybrid: {
    enabled: boolean;
    vectorWeight: number;
    textWeight: number;
  };
}

export interface ChunkingConfig {
  tokens: number;
  overlap: number;
}

export interface BatchConfig {
  enabled: boolean;
  wait: boolean;
  concurrency: number;
  pollIntervalMs: number;
  timeoutMs: number;
}

export interface CacheConfig {
  enabled: boolean;
  maxEntries?: number;
  pruneCount?: number;
}

export interface SyncConfig {
  onSessionStart: boolean;
  onSearch: boolean;
  watch: boolean;
  watchDebounceMs: number;
  intervalMinutes?: number;
  sessions?: {
    deltaBytes: number;
    deltaMessages: number;
  };
}

export interface TimeoutsConfig {
  queryEmbeddingRemoteMs: number;
  queryEmbeddingLocalMs: number;
  batchEmbeddingRemoteMs: number;
  batchEmbeddingLocalMs: number;
  vectorLoadMs: number;
}

export interface MemoryConfig {
  storage: StorageConfig;
  embedding: EmbeddingConfig;
  capture: CaptureConfig;
  search: SearchConfig;
  chunking: ChunkingConfig;
  batch?: BatchConfig;
  cache?: CacheConfig;
  sync?: SyncConfig;
  timeouts?: TimeoutsConfig;
}

export interface Memory {
  id: string;
  text: string;
  source: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryChunk {
  id: string;
  memoryId: string;
  text: string;
  startLine: number;
  endLine: number;
  hash: string;
}

export interface SearchResult {
  memory: Memory;
  score: number;
  snippet: string;
}

export interface MemoryStatus {
  totalChunks: number;
  embeddedChunks: number;
  totalFiles: number;
  vectorAvailable: boolean;
  ftsAvailable: boolean;
  embeddingModel: string;
}
