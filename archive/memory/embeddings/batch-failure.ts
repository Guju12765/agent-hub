/**
 * Batch Failure Tracking
 * Adapted from OpenClaw's manager.ts batch failure handling
 *
 * Tracks batch embedding failures and auto-disables batch mode
 * after reaching failure threshold to prevent cascading errors.
 */

export const BATCH_FAILURE_LIMIT = 2;

export interface BatchFailureState {
  enabled: boolean;
  failureCount: number;
  lastError?: string;
  lastProvider?: string;
}

export interface RecordFailureParams {
  provider: string;
  message: string;
  attempts?: number;
  forceDisable?: boolean;
}

export interface RecordFailureResult {
  disabled: boolean;
  count: number;
}

/**
 * Batch Failure Tracker
 *
 * Tracks failures and auto-disables batch mode after threshold.
 * Uses lock to prevent race conditions in concurrent scenarios.
 */
export class BatchFailureTracker {
  private enabled: boolean = true;
  private failureCount: number = 0;
  private lastError?: string;
  private lastProvider?: string;
  private failureLock: Promise<void> = Promise.resolve();

  constructor(initialEnabled: boolean = true) {
    this.enabled = initialEnabled;
  }

  /**
   * Execute function with failure lock to prevent race conditions
   * Adapted from OpenClaw's withBatchFailureLock
   */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const wait = this.failureLock;
    this.failureLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await wait;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  /**
   * Check if batch mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current failure state
   */
  getState(): BatchFailureState {
    return {
      enabled: this.enabled,
      failureCount: this.failureCount,
      lastError: this.lastError,
      lastProvider: this.lastProvider,
    };
  }

  /**
   * Reset failure count after successful batch
   * Adapted from OpenClaw's resetBatchFailureCount
   */
  async resetFailures(): Promise<void> {
    await this.withLock(async () => {
      if (this.failureCount > 0) {
        console.error("memory embeddings: batch recovered; resetting failure count");
      }
      this.failureCount = 0;
      this.lastError = undefined;
      this.lastProvider = undefined;
    });
  }

  /**
   * Record a batch failure
   * Adapted from OpenClaw's recordBatchFailure
   *
   * @returns Whether batch is now disabled and current count
   */
  async recordFailure(params: RecordFailureParams): Promise<RecordFailureResult> {
    return await this.withLock(async () => {
      if (!this.enabled) {
        return { disabled: true, count: this.failureCount };
      }

      const increment = params.forceDisable
        ? BATCH_FAILURE_LIMIT
        : Math.max(1, params.attempts ?? 1);

      this.failureCount += increment;
      this.lastError = params.message;
      this.lastProvider = params.provider;

      const disabled = params.forceDisable || this.failureCount >= BATCH_FAILURE_LIMIT;
      if (disabled) {
        this.enabled = false;
      }

      return { disabled, count: this.failureCount };
    });
  }

  /**
   * Manually disable batch mode
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Re-enable batch mode (use with caution)
   */
  enable(): void {
    this.enabled = true;
    this.failureCount = 0;
    this.lastError = undefined;
    this.lastProvider = undefined;
  }
}

/**
 * Check if error message indicates a timeout
 * Adapted from OpenClaw's isBatchTimeoutError
 */
export function isBatchTimeoutError(message: string): boolean {
  return /timed out|timeout/i.test(message);
}

/**
 * Check if error should force-disable batch mode
 * Some errors indicate batch API is not available at all
 */
export function shouldForceDisableBatch(message: string): boolean {
  return /asyncBatchEmbedContent not available/i.test(message);
}

/**
 * Run a batch operation with timeout retry
 * Retries once on timeout errors
 * Adapted from OpenClaw's runBatchWithTimeoutRetry
 */
export async function runBatchWithTimeoutRetry<T>(params: {
  provider: string;
  run: () => Promise<T>;
}): Promise<T> {
  try {
    return await params.run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isBatchTimeoutError(message)) {
      console.error(`memory embeddings: ${params.provider} batch timed out; retrying once`);
      try {
        return await params.run();
      } catch (retryErr) {
        // Mark that we attempted twice
        (retryErr as { batchAttempts?: number }).batchAttempts = 2;
        throw retryErr;
      }
    }
    throw err;
  }
}

/**
 * Run a batch operation with automatic fallback on failure
 * Adapted from OpenClaw's runBatchWithFallback
 */
export async function runBatchWithFallback<T>(params: {
  provider: string;
  tracker: BatchFailureTracker;
  run: () => Promise<T>;
  fallback: () => Promise<number[][]>;
}): Promise<T | number[][]> {
  const { provider, tracker, run, fallback } = params;

  if (!tracker.isEnabled()) {
    return await fallback();
  }

  try {
    const result = await runBatchWithTimeoutRetry({
      provider,
      run,
    });
    await tracker.resetFailures();
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = (err as { batchAttempts?: number }).batchAttempts ?? 1;
    const forceDisable = shouldForceDisableBatch(message);

    const failure = await tracker.recordFailure({
      provider,
      message,
      attempts,
      forceDisable,
    });

    const suffix = failure.disabled ? "disabling batch" : "keeping batch enabled";
    console.error(
      `memory embeddings: ${provider} batch failed (${failure.count}/${BATCH_FAILURE_LIMIT}); ${suffix}; falling back to non-batch embeddings: ${message}`
    );

    return await fallback();
  }
}
