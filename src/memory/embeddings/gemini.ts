/**
 * Gemini embedding provider
 * Uses Google's Gemini API for embeddings (free tier available)
 */

import { BaseEmbeddingProvider } from "./provider.js";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-embedding-001";

export interface GeminiEmbeddingConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class GeminiEmbeddingProvider extends BaseEmbeddingProvider {
  readonly id = "gemini";
  readonly model: string;
  readonly dimensions = 768; // Gemini embedding dimensions

  private apiKey: string;
  private baseUrl: string;
  private modelPath: string;

  constructor(config: GeminiEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODEL;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.modelPath = this.model.startsWith("models/")
      ? this.model
      : `models/${this.model}`;
  }

  async embed(text: string): Promise<number[]> {
    if (!text.trim()) return [];

    const url = `${this.baseUrl}/${this.modelPath}:embedContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Gemini embeddings failed: ${response.status} ${payload}`);
    }

    const data = (await response.json()) as {
      embedding?: { values?: number[] };
    };

    return data.embedding?.values ?? [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const url = `${this.baseUrl}/${this.modelPath}:batchEmbedContents`;

    const requests = texts.map((text) => ({
      model: this.modelPath,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Gemini batch embeddings failed: ${response.status} ${payload}`);
    }

    const data = (await response.json()) as {
      embeddings?: Array<{ values?: number[] }>;
    };

    const embeddings = Array.isArray(data.embeddings) ? data.embeddings : [];
    return texts.map((_, index) => embeddings[index]?.values ?? []);
  }
}
