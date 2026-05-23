/**
 * Local embedding provider using node-llama-cpp
 * Runs completely locally with no API key required
 */

import { BaseEmbeddingProvider } from "./provider.js";

// Default model - small and efficient
const DEFAULT_MODEL = "hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf";

export interface LocalEmbeddingConfig {
  modelPath?: string;
  modelCacheDir?: string;
}

// Lazy-loaded types from node-llama-cpp
type Llama = any;
type LlamaModel = any;
type LlamaEmbeddingContext = any;

export class LocalEmbeddingProvider extends BaseEmbeddingProvider {
  readonly id = "local";
  readonly model: string;
  private _dimensions: number = 256; // Will be updated after model loads

  private modelCacheDir?: string;
  private llama: Llama | null = null;
  private embeddingModel: LlamaModel | null = null;
  private embeddingContext: LlamaEmbeddingContext | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: LocalEmbeddingConfig = {}) {
    super();
    this.model = config.modelPath?.trim() || DEFAULT_MODEL;
    this.modelCacheDir = config.modelCacheDir?.trim();
  }

  get dimensions(): number {
    return this._dimensions;
  }

  private async ensureContext(): Promise<LlamaEmbeddingContext> {
    if (this.embeddingContext) {
      return this.embeddingContext;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.embeddingContext!;
    }

    this.initPromise = this.initialize();
    await this.initPromise;
    return this.embeddingContext!;
  }

  private async initialize(): Promise<void> {
    try {
      // Dynamic import to keep startup light
      const nodeLlamaCpp = await import("node-llama-cpp");
      const { getLlama, resolveModelFile, LlamaLogLevel } = nodeLlamaCpp;

      console.error("Initializing local embedding model...");

      // Initialize Llama
      this.llama = await getLlama({ logLevel: LlamaLogLevel.error });

      // Resolve and load model
      const resolvedPath = await resolveModelFile(
        this.model,
        this.modelCacheDir || undefined
      );
      console.error(`Loading model from: ${resolvedPath}`);

      this.embeddingModel = await this.llama.loadModel({ modelPath: resolvedPath });

      // Create embedding context
      this.embeddingContext = await this.embeddingModel.createEmbeddingContext();

      // Get actual dimensions from model
      const testEmbedding = await this.embeddingContext.getEmbeddingFor("test");
      this._dimensions = testEmbedding.vector.length;

      console.error(`Local embedding model loaded (dimensions: ${this._dimensions})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Check if node-llama-cpp is missing
      if (message.includes("Cannot find module") || message.includes("node-llama-cpp")) {
        throw new Error(
          "Local embeddings unavailable: node-llama-cpp not installed.\n" +
          "To enable local embeddings:\n" +
          "1. Use Node 22 LTS\n" +
          "2. Run: npm install node-llama-cpp\n" +
          "3. On first run, the model will be downloaded automatically"
        );
      }

      throw new Error(`Failed to initialize local embeddings: ${message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    const ctx = await this.ensureContext();
    const embedding = await ctx.getEmbeddingFor(text);
    return Array.from(embedding.vector) as number[];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const ctx = await this.ensureContext();

    // Process sequentially (node-llama-cpp doesn't support true batching)
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await ctx.getEmbeddingFor(text);
      embeddings.push(Array.from(embedding.vector) as number[]);
    }

    return embeddings;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.embeddingContext) {
      await this.embeddingContext.dispose?.();
      this.embeddingContext = null;
    }
    if (this.embeddingModel) {
      await this.embeddingModel.dispose?.();
      this.embeddingModel = null;
    }
    if (this.llama) {
      await this.llama.dispose?.();
      this.llama = null;
    }
  }
}
