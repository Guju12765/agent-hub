/**
 * Embedding Provider Fallback
 * Adapted from OpenClaw's manager.ts fallback pattern
 *
 * Provides automatic fallback when primary embedding provider fails
 */

import type { EmbeddingProviderInterface } from "./provider.js";
import type { EmbeddingConfig } from "../../core/config/types.js";

export type ProviderType = "openai" | "gemini" | "local";

export interface FallbackState {
  /**
   * Provider that was being used before fallback
   */
  fallbackFrom?: ProviderType;

  /**
   * Reason for fallback (error message)
   */
  fallbackReason?: string;

  /**
   * Whether fallback has been activated
   */
  fallbackActive: boolean;
}

export interface FallbackConfig {
  /**
   * Primary provider to use
   */
  primary: ProviderType;

  /**
   * Fallback provider when primary fails
   * Set to "none" to disable fallback
   */
  fallback: ProviderType | "none";

  /**
   * Error patterns that trigger fallback
   */
  errorPatterns?: RegExp[];
}

const DEFAULT_ERROR_PATTERNS: RegExp[] = [
  /embedding/i,
  /embeddings/i,
  /batch/i,
  /rate[_ ]limit/i,
  /too many requests/i,
  /429/,
  /5\d\d/,
  /timeout/i,
  /network/i,
  /connection/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
];

/**
 * Check if an error message should trigger fallback
 */
export function shouldFallbackOnError(
  message: string,
  patterns: RegExp[] = DEFAULT_ERROR_PATTERNS
): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

/**
 * Determine the fallback provider based on primary provider
 */
export function getDefaultFallback(primary: ProviderType): ProviderType | "none" {
  switch (primary) {
    case "openai":
      return "local";
    case "gemini":
      return "local";
    case "local":
      return "none"; // No fallback for local provider
    default:
      return "none";
  }
}

/**
 * Provider Fallback Manager
 *
 * Manages automatic fallback between embedding providers
 */
export class ProviderFallbackManager {
  private config: FallbackConfig;
  private state: FallbackState;
  private currentProvider: EmbeddingProviderInterface;
  private fallbackProvider: EmbeddingProviderInterface | null = null;
  private createProvider: (type: ProviderType) => Promise<EmbeddingProviderInterface>;

  constructor(params: {
    config: FallbackConfig;
    provider: EmbeddingProviderInterface;
    createProvider: (type: ProviderType) => Promise<EmbeddingProviderInterface>;
  }) {
    this.config = {
      ...params.config,
      errorPatterns: params.config.errorPatterns ?? DEFAULT_ERROR_PATTERNS,
    };
    this.currentProvider = params.provider;
    this.createProvider = params.createProvider;
    this.state = {
      fallbackActive: false,
    };
  }

  /**
   * Get the current active provider
   */
  getProvider(): EmbeddingProviderInterface {
    return this.currentProvider;
  }

  /**
   * Get the current fallback state
   */
  getState(): FallbackState {
    return { ...this.state };
  }

  /**
   * Check if fallback should be activated for an error
   */
  shouldFallback(error: Error | string): boolean {
    if (this.state.fallbackActive) {
      // Already in fallback mode
      return false;
    }

    if (this.config.fallback === "none") {
      return false;
    }

    const message = typeof error === "string" ? error : error.message;
    return shouldFallbackOnError(message, this.config.errorPatterns);
  }

  /**
   * Activate fallback provider
   *
   * @returns true if fallback was activated, false if not possible
   */
  async activateFallback(reason: string): Promise<boolean> {
    if (this.state.fallbackActive) {
      return false;
    }

    if (this.config.fallback === "none") {
      return false;
    }

    if (this.config.fallback === this.config.primary) {
      return false;
    }

    try {
      // Create fallback provider
      this.fallbackProvider = await this.createProvider(this.config.fallback);

      // Update state
      this.state = {
        fallbackFrom: this.config.primary,
        fallbackReason: reason,
        fallbackActive: true,
      };

      // Switch to fallback provider
      this.currentProvider = this.fallbackProvider;

      console.error(
        `Embedding fallback: switched from ${this.config.primary} to ${this.config.fallback} (${reason})`
      );

      return true;
    } catch (err) {
      console.error(
        `Embedding fallback: failed to activate fallback provider: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return false;
    }
  }

  /**
   * Execute an embedding operation with automatic fallback
   */
  async withFallback<T>(
    operation: (provider: EmbeddingProviderInterface) => Promise<T>
  ): Promise<T> {
    try {
      return await operation(this.currentProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (this.shouldFallback(message)) {
        const activated = await this.activateFallback(message);
        if (activated) {
          // Retry with fallback provider
          return await operation(this.currentProvider);
        }
      }

      throw err;
    }
  }

  /**
   * Reset fallback state (use primary provider again)
   */
  async resetFallback(): Promise<void> {
    if (!this.state.fallbackActive) {
      return;
    }

    try {
      // Recreate primary provider
      const primaryProvider = await this.createProvider(this.config.primary);
      this.currentProvider = primaryProvider;
      this.state = {
        fallbackActive: false,
      };

      console.error(`Embedding fallback: reset to primary provider (${this.config.primary})`);
    } catch (err) {
      console.error(
        `Embedding fallback: failed to reset to primary: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}

/**
 * Create a fallback manager from embedding config
 */
export function createFallbackManager(params: {
  config: EmbeddingConfig;
  provider: EmbeddingProviderInterface;
  createProvider: (type: ProviderType) => Promise<EmbeddingProviderInterface>;
}): ProviderFallbackManager {
  const { config, provider, createProvider } = params;

  // Determine primary provider from config
  const primary: ProviderType =
    config.provider === "openai" || config.provider === "gemini" || config.provider === "local"
      ? config.provider
      : "local";

  // Determine fallback from config or use default
  let fallback: ProviderType | "none";
  if (config.fallback === "openai" || config.fallback === "gemini" || config.fallback === "local") {
    fallback = config.fallback;
  } else if (config.fallback === undefined) {
    fallback = getDefaultFallback(primary);
  } else {
    // "auto" or other values - use default
    fallback = getDefaultFallback(primary);
  }

  return new ProviderFallbackManager({
    config: {
      primary,
      fallback,
    },
    provider,
    createProvider,
  });
}
