/**
 * OpenAI embedding provider
 * Adapted from OpenClaw's src/memory/embeddings-openai.ts
 */

import OpenAI from "openai";
import { BaseEmbeddingProvider } from "./provider.js";

const EMBEDDING_BATCH_SIZE = 100;
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 8000;

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  dimensions?: number;
}

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  readonly id = "openai";
  readonly model: string;
  readonly dimensions: number;

  private client: OpenAI;

  constructor(config: OpenAIEmbeddingConfig) {
    super();
    this.model = config.model ?? "text-embedding-3-small";
    this.dimensions = config.dimensions ?? 1536;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.embedWithRetry([text]);
    return result[0] ?? [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // Split into batches
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      batches.push(texts.slice(i, i + EMBEDDING_BATCH_SIZE));
    }

    // Process batches
    const results: number[][] = [];
    for (const batch of batches) {
      const batchResults = await this.embedWithRetry(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private async embedWithRetry(texts: string[]): Promise<number[][]> {
    let attempt = 0;
    let delayMs = RETRY_BASE_DELAY_MS;

    while (true) {
      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: texts,
          dimensions: this.dimensions,
        });

        // Sort by index to ensure correct order
        const sorted = response.data.sort((a, b) => a.index - b.index);
        return sorted.map((item) => item.embedding);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (!this.isRetryableError(message) || attempt >= RETRY_MAX_ATTEMPTS) {
          throw err;
        }

        const waitMs = Math.min(
          RETRY_MAX_DELAY_MS,
          Math.round(delayMs * (1 + Math.random() * 0.2))
        );

        console.warn(`OpenAI embeddings rate limited; retrying in ${waitMs}ms`);
        await this.sleep(waitMs);

        delayMs *= 2;
        attempt += 1;
      }
    }
  }

  private isRetryableError(message: string): boolean {
    return /(rate[_ ]limit|too many requests|429|5\d\d)/i.test(message);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
