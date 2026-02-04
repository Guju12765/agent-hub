/**
 * Timeout utilities for embedding operations
 * Matches OpenClaw's timeout configuration
 */

// Timeout values from OpenClaw (in milliseconds)
export const VECTOR_LOAD_TIMEOUT_MS = 30_000;
export const EMBEDDING_QUERY_TIMEOUT_REMOTE_MS = 60_000;
export const EMBEDDING_QUERY_TIMEOUT_LOCAL_MS = 5 * 60_000;
export const EMBEDDING_BATCH_TIMEOUT_REMOTE_MS = 2 * 60_000;
export const EMBEDDING_BATCH_TIMEOUT_LOCAL_MS = 10 * 60_000;

/**
 * Wrap a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param message Error message if timeout is reached
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return await promise;
  }

  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Resolve the appropriate timeout for an embedding operation
 * @param kind Type of operation ("query" or "batch")
 * @param isLocal Whether using a local embedding provider
 */
export function resolveEmbeddingTimeout(
  kind: "query" | "batch",
  isLocal: boolean
): number {
  if (kind === "query") {
    return isLocal ? EMBEDDING_QUERY_TIMEOUT_LOCAL_MS : EMBEDDING_QUERY_TIMEOUT_REMOTE_MS;
  }
  return isLocal ? EMBEDDING_BATCH_TIMEOUT_LOCAL_MS : EMBEDDING_BATCH_TIMEOUT_REMOTE_MS;
}
