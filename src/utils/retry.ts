/**
 * Retry utilities adapted from OpenClaw
 */

export interface RetryOptions {
  attempts: number;
  minDelayMs: number;
  maxDelayMs: number;
  jitter?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Retry an async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { attempts, minDelayMs, maxDelayMs, jitter = 0.2, shouldRetry } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === attempts) {
        throw err;
      }

      if (shouldRetry && !shouldRetry(err)) {
        throw err;
      }

      // Calculate delay with exponential backoff
      const baseDelay = Math.min(minDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitterAmount = baseDelay * jitter * (Math.random() * 2 - 1);
      const delay = Math.max(0, baseDelay + jitterAmount);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Run tasks with concurrency limit
 */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const resolvedLimit = Math.max(1, Math.min(limit, tasks.length));
  const results: T[] = Array.from({ length: tasks.length });
  let next = 0;
  let firstError: unknown = null;

  const workers = Array.from({ length: resolvedLimit }, async () => {
    while (true) {
      if (firstError) return;
      const index = next;
      next += 1;
      if (index >= tasks.length) return;
      try {
        results[index] = await tasks[index]();
      } catch (err) {
        firstError = err;
        return;
      }
    }
  });

  await Promise.allSettled(workers);
  if (firstError) throw firstError;
  return results;
}

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Run a promise with a timeout
 * Adapted from OpenClaw's withTimeout pattern
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message?: string
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return await promise;
  }

  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const errorMsg = message ?? `Operation timed out after ${Math.round(timeoutMs / 1000)}s`;
      reject(new TimeoutError(errorMsg, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Timeout configuration for embedding operations
 * Adapted from OpenClaw's timeout constants
 */
export interface EmbeddingTimeoutConfig {
  /**
   * Timeout for single query embedding (remote provider)
   * Default: 60 seconds
   */
  queryRemoteMs: number;

  /**
   * Timeout for single query embedding (local provider)
   * Default: 5 minutes
   */
  queryLocalMs: number;

  /**
   * Timeout for batch embedding (remote provider)
   * Default: 2 minutes
   */
  batchRemoteMs: number;

  /**
   * Timeout for batch embedding (local provider)
   * Default: 10 minutes
   */
  batchLocalMs: number;

  /**
   * Timeout for loading sqlite-vec extension
   * Default: 30 seconds
   */
  vectorLoadMs: number;
}

/**
 * Default timeout configuration
 * Based on OpenClaw's timeout constants
 */
export const DEFAULT_EMBEDDING_TIMEOUTS: EmbeddingTimeoutConfig = {
  queryRemoteMs: 60_000,           // 60 seconds
  queryLocalMs: 5 * 60_000,        // 5 minutes
  batchRemoteMs: 2 * 60_000,       // 2 minutes
  batchLocalMs: 10 * 60_000,       // 10 minutes
  vectorLoadMs: 30_000,            // 30 seconds
};

/**
 * Get the appropriate timeout for an embedding operation
 */
export function getEmbeddingTimeout(
  operation: "query" | "batch",
  isLocal: boolean,
  config: Partial<EmbeddingTimeoutConfig> = {}
): number {
  const defaults = DEFAULT_EMBEDDING_TIMEOUTS;

  if (operation === "query") {
    return isLocal
      ? (config.queryLocalMs ?? defaults.queryLocalMs)
      : (config.queryRemoteMs ?? defaults.queryRemoteMs);
  }

  return isLocal
    ? (config.batchLocalMs ?? defaults.batchLocalMs)
    : (config.batchRemoteMs ?? defaults.batchRemoteMs);
}

/**
 * Retry configuration for embedding operations
 */
export interface EmbeddingRetryConfig {
  /**
   * Maximum retry attempts
   * Default: 3
   */
  maxAttempts: number;

  /**
   * Base delay between retries in milliseconds
   * Default: 500ms
   */
  baseDelayMs: number;

  /**
   * Maximum delay between retries in milliseconds
   * Default: 8000ms
   */
  maxDelayMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_EMBEDDING_RETRY: EmbeddingRetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
};

/**
 * Check if an error is retryable for embedding operations
 */
export function isRetryableEmbeddingError(message: string): boolean {
  return /(rate[_ ]limit|too many requests|429|resource has been exhausted|5\d\d|cloudflare|timeout)/i.test(
    message
  );
}

/**
 * Embed with retry and timeout
 * Combines retry logic with timeout protection
 */
export async function embedWithRetryAndTimeout<T>(
  embedFn: () => Promise<T>,
  options: {
    timeoutMs: number;
    retry?: Partial<EmbeddingRetryConfig>;
    operation?: string;
  }
): Promise<T> {
  const retryConfig = {
    ...DEFAULT_EMBEDDING_RETRY,
    ...options.retry,
  };

  return retryAsync(
    () => withTimeout(
      embedFn(),
      options.timeoutMs,
      options.operation
        ? `${options.operation} timed out after ${Math.round(options.timeoutMs / 1000)}s`
        : undefined
    ),
    {
      attempts: retryConfig.maxAttempts,
      minDelayMs: retryConfig.baseDelayMs,
      maxDelayMs: retryConfig.maxDelayMs,
      shouldRetry: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        return isRetryableEmbeddingError(message);
      },
    }
  );
}
