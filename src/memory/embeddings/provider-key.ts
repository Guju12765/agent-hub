/**
 * Provider Key Fingerprinting
 * Adapted from OpenClaw's computeProviderKey in manager.ts
 *
 * Creates a hash fingerprint of provider configuration for cache invalidation.
 * When Alice moves between projects with different embedding configs,
 * the provider key ensures cached embeddings are invalidated appropriately.
 */

import { createHash } from "node:crypto";

export interface ProviderKeyParams {
  provider: string;
  model: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

/**
 * Hash text using SHA-256, returning first 16 chars
 */
function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * Compute a unique key for provider configuration
 * Used to invalidate cache when provider config changes
 *
 * Adapted from OpenClaw's computeProviderKey (manager.ts:1729-1762)
 */
export function computeProviderKey(params: ProviderKeyParams): string {
  const { provider, model, baseUrl, headers = {} } = params;

  if (provider === "openai") {
    // Hash: provider, baseUrl, model, headers (excluding Authorization)
    const entries = Object.entries(headers)
      .filter(([key]) => key.toLowerCase() !== "authorization")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, value]);

    return hashText(
      JSON.stringify({
        provider: "openai",
        baseUrl,
        model,
        headers: entries,
      })
    );
  }

  if (provider === "gemini") {
    // Exclude Authorization and x-goog-api-key
    const entries = Object.entries(headers)
      .filter(([key]) => {
        const lower = key.toLowerCase();
        return lower !== "authorization" && lower !== "x-goog-api-key";
      })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, value]);

    return hashText(
      JSON.stringify({
        provider: "gemini",
        baseUrl,
        model,
        headers: entries,
      })
    );
  }

  // Local or other providers - just use provider and model
  return hashText(
    JSON.stringify({
      provider,
      model,
    })
  );
}

/**
 * Check if two provider keys match
 */
export function providerKeysMatch(key1: string, key2: string): boolean {
  return key1 === key2;
}

/**
 * Create provider key from embedding provider interface
 */
export function computeProviderKeyFromProvider(
  provider: { id: string; model: string },
  config?: { baseUrl?: string; headers?: Record<string, string> }
): string {
  return computeProviderKey({
    provider: provider.id,
    model: provider.model,
    baseUrl: config?.baseUrl,
    headers: config?.headers,
  });
}
