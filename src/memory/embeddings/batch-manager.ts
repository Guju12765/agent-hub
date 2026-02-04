/**
 * Batch Embedding Manager
 * Orchestrates batch embedding operations for OpenAI and Gemini
 */

import {
  runOpenAiEmbeddingBatches,
  type OpenAiBatchRequest,
  type OpenAiEmbeddingClient,
} from "./batch-openai.js";
import {
  runGeminiEmbeddingBatches,
  type GeminiBatchRequest,
  type GeminiEmbeddingClient,
} from "./batch-gemini.js";
import {
  BatchFailureTracker,
  BATCH_FAILURE_LIMIT,
  runBatchWithFallback,
  type BatchFailureState,
} from "./batch-failure.js";

export interface BatchConfig {
  enabled: boolean;
  wait: boolean;
  concurrency: number;
  pollIntervalMs: number;
  timeoutMs: number;
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  enabled: false,
  wait: true,
  concurrency: 2,
  pollIntervalMs: 2000,
  timeoutMs: 60 * 60 * 1000, // 60 minutes
};

export class BatchEmbeddingManager {
  private config: BatchConfig;
  private tracker: BatchFailureTracker;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.tracker = new BatchFailureTracker(this.config.enabled);
  }

  isEnabled(): boolean {
    return this.config.enabled && this.tracker.isEnabled();
  }

  getStatus(): {
    enabled: boolean;
    disabled: boolean;
    failureCount: number;
    limit: number;
    lastError?: string;
    lastProvider?: string;
  } {
    const state = this.tracker.getState();
    return {
      enabled: this.config.enabled,
      disabled: !state.enabled,
      failureCount: state.failureCount,
      limit: BATCH_FAILURE_LIMIT,
      lastError: state.lastError,
      lastProvider: state.lastProvider,
    };
  }

  /**
   * Get raw batch failure state for status reporting
   */
  getBatchFailureState(): BatchFailureState {
    return this.tracker.getState();
  }

  /**
   * Run batch embeddings for OpenAI
   */
  async runOpenAiBatch(params: {
    openAi: OpenAiEmbeddingClient;
    agentId: string;
    texts: Array<{ id: string; text: string }>;
    debug?: (message: string, data?: Record<string, unknown>) => void;
  }): Promise<Map<string, number[]>> {
    if (!this.isEnabled()) {
      throw new Error("Batch embeddings not enabled");
    }

    const requests: OpenAiBatchRequest[] = params.texts.map((item) => ({
      custom_id: item.id,
      method: "POST",
      url: "/v1/embeddings",
      body: {
        model: params.openAi.model,
        input: item.text,
      },
    }));

    const result = await runBatchWithFallback({
      provider: "openai",
      tracker: this.tracker,
      run: async () => {
        const resultMap = await runOpenAiEmbeddingBatches({
          openAi: params.openAi,
          agentId: params.agentId,
          requests,
          wait: this.config.wait,
          pollIntervalMs: this.config.pollIntervalMs,
          timeoutMs: this.config.timeoutMs,
          concurrency: this.config.concurrency,
          debug: params.debug,
        });
        return resultMap;
      },
      fallback: async () => {
        // Fallback is handled by caller - throw to signal fallback needed
        throw new Error("Batch fallback needed");
      },
    });

    if (result instanceof Map) {
      return result;
    }
    // Fallback was used
    throw new Error("Batch embeddings failed, fallback to non-batch");
  }

  /**
   * Run batch embeddings for Gemini
   */
  async runGeminiBatch(params: {
    gemini: GeminiEmbeddingClient;
    agentId: string;
    texts: Array<{ id: string; text: string }>;
    taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
    debug?: (message: string, data?: Record<string, unknown>) => void;
  }): Promise<Map<string, number[]>> {
    if (!this.isEnabled()) {
      throw new Error("Batch embeddings not enabled");
    }

    const requests: GeminiBatchRequest[] = params.texts.map((item) => ({
      custom_id: item.id,
      content: { parts: [{ text: item.text }] },
      taskType: params.taskType ?? "RETRIEVAL_DOCUMENT",
    }));

    const result = await runBatchWithFallback({
      provider: "gemini",
      tracker: this.tracker,
      run: async () => {
        const resultMap = await runGeminiEmbeddingBatches({
          gemini: params.gemini,
          agentId: params.agentId,
          requests,
          wait: this.config.wait,
          pollIntervalMs: this.config.pollIntervalMs,
          timeoutMs: this.config.timeoutMs,
          concurrency: this.config.concurrency,
          debug: params.debug,
        });
        return resultMap;
      },
      fallback: async () => {
        // Fallback is handled by caller - throw to signal fallback needed
        throw new Error("Batch fallback needed");
      },
    });

    if (result instanceof Map) {
      return result;
    }
    // Fallback was used
    throw new Error("Batch embeddings failed, fallback to non-batch");
  }

  /**
   * Reset failure state (e.g., after config change)
   */
  reset(): void {
    this.tracker.enable();
  }

  /**
   * Get the underlying tracker for advanced use
   */
  getTracker(): BatchFailureTracker {
    return this.tracker;
  }
}
