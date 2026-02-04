/**
 * Retry utility for embedding operations
 * Matches OpenClaw's retry logic
 */

const EMBEDDING_RETRY_MAX_ATTEMPTS = 3;
const EMBEDDING_RETRY_BASE_DELAY_MS = 500;
const EMBEDDING_RETRY_MAX_DELAY_MS = 8000;
const JITTER_FACTOR = 0.2; // ±20%

function addJitter(delay: number): number {
  const jitter = delay * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

function isRetryableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate") ||
    lower.includes("limit") ||
    lower.includes("429") ||
    lower.includes("503") ||
    lower.includes("timeout")
  );
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

export async function retryEmbedding<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? EMBEDDING_RETRY_MAX_ATTEMPTS;
  const baseDelay = options?.baseDelay ?? EMBEDDING_RETRY_BASE_DELAY_MS;
  const maxDelay = options?.maxDelay ?? EMBEDDING_RETRY_MAX_DELAY_MS;

  let attempt = 0;
  let delayMs = baseDelay;

  while (true) {
    attempt++;
    try {
      return await operation();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (!isRetryableError(message) || attempt >= maxAttempts) {
        throw err;
      }

      const waitMs = addJitter(Math.min(delayMs, maxDelay));
      options?.onRetry?.(attempt, waitMs, err as Error);

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      delayMs *= 2; // Exponential backoff
    }
  }
}

// Export constants for external use
export {
  EMBEDDING_RETRY_MAX_ATTEMPTS,
  EMBEDDING_RETRY_BASE_DELAY_MS,
  EMBEDDING_RETRY_MAX_DELAY_MS,
};
