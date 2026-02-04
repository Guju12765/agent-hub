/**
 * Abstract embedding provider interface
 */

export interface EmbeddingProviderInterface {
  readonly id: string;
  readonly model: string;
  readonly dimensions: number;

  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export abstract class BaseEmbeddingProvider implements EmbeddingProviderInterface {
  abstract readonly id: string;
  abstract readonly model: string;
  abstract readonly dimensions: number;

  abstract embed(text: string): Promise<number[]>;

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Default implementation: sequential embedding
    // Subclasses can override for parallel/batch support
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}
