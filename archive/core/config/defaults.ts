/**
 * Default configuration values for the Memory MCP Server
 */

import type { MemoryConfig, EmbeddingProvider } from "./types.js";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_CONFIG: MemoryConfig = {
  storage: {
    path: join(homedir(), ".local", "share", "memory-mcp", "memory.db"),
    vectorExtension: "auto",
  },
  embedding: {
    provider: "auto", // Auto-select best available provider
    model: "text-embedding-3-small",
    dimensions: 1536,
    fallback: "local", // Fall back to local if primary fails
  },
  capture: {
    auto: true,
    minLength: 10,
    maxLength: 2000,
    duplicateThreshold: 0.95,
  },
  search: {
    defaultLimit: 5,
    minScore: 0.35,
    hybrid: {
      enabled: true,
      vectorWeight: 0.7,
      textWeight: 0.3,
    },
  },
  chunking: {
    tokens: 400,
    overlap: 80,
  },
};

export function loadConfig(overrides?: Partial<MemoryConfig>): MemoryConfig {
  const config = { ...DEFAULT_CONFIG };

  if (overrides?.storage) {
    config.storage = { ...config.storage, ...overrides.storage };
  }
  if (overrides?.embedding) {
    config.embedding = { ...config.embedding, ...overrides.embedding };
  }
  if (overrides?.capture) {
    config.capture = { ...config.capture, ...overrides.capture };
  }
  if (overrides?.search) {
    config.search = {
      ...config.search,
      ...overrides.search,
      hybrid: { ...config.search.hybrid, ...overrides.search?.hybrid },
    };
  }
  if (overrides?.chunking) {
    config.chunking = { ...config.chunking, ...overrides.chunking };
  }

  // Resolve environment variables for embedding
  // Provider selection
  if (process.env.MEMORY_EMBEDDING_PROVIDER) {
    config.embedding.provider = process.env.MEMORY_EMBEDDING_PROVIDER as EmbeddingProvider;
  }

  // API keys
  if (process.env.OPENAI_API_KEY && !config.embedding.apiKey) {
    config.embedding.apiKey = process.env.OPENAI_API_KEY;
  }
  if (process.env.GOOGLE_API_KEY && !config.embedding.apiKey) {
    config.embedding.apiKey = process.env.GOOGLE_API_KEY;
  }
  if (process.env.GEMINI_API_KEY && !config.embedding.apiKey) {
    config.embedding.apiKey = process.env.GEMINI_API_KEY;
  }

  // Model settings
  if (process.env.MEMORY_EMBEDDING_MODEL) {
    config.embedding.model = process.env.MEMORY_EMBEDDING_MODEL;
  }
  if (process.env.MEMORY_EMBEDDING_DIMS) {
    config.embedding.dimensions = parseInt(process.env.MEMORY_EMBEDDING_DIMS, 10);
  }

  // Local model settings
  if (process.env.MEMORY_LOCAL_MODEL_PATH) {
    config.embedding.modelPath = process.env.MEMORY_LOCAL_MODEL_PATH;
  }
  if (process.env.MEMORY_LOCAL_MODEL_CACHE) {
    config.embedding.modelCacheDir = process.env.MEMORY_LOCAL_MODEL_CACHE;
  }

  // Storage path
  if (process.env.MEMORY_DB_PATH) {
    config.storage.path = process.env.MEMORY_DB_PATH;
  }

  return config;
}
