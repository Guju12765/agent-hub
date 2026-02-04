export * from "./provider.js";
export * from "./openai.js";
export * from "./gemini.js";
export * from "./local.js";
export * from "./batch-openai.js";
export * from "./batch-gemini.js";
export * from "./batch-manager.js";
export * from "./batch-failure.js";
export * from "./fallback.js";
export * from "./provider-key.js";
export * from "./retry.js";
export * from "./timeout.js";

import type { EmbeddingConfig } from "../../core/config/types.js";
import type { EmbeddingProviderInterface } from "./provider.js";
import { OpenAIEmbeddingProvider } from "./openai.js";
import { GeminiEmbeddingProvider } from "./gemini.js";
import { LocalEmbeddingProvider } from "./local.js";

export interface EmbeddingProviderResult {
  provider: EmbeddingProviderInterface;
  providerId: string;
  fallbackFrom?: string;
  fallbackReason?: string;
}

/**
 * Create an embedding provider based on config
 * Supports auto-selection and fallback
 */
export async function createEmbeddingProvider(
  config: EmbeddingConfig
): Promise<EmbeddingProviderResult> {
  const requestedProvider = config.provider;

  // Auto-select: try providers in order
  if (requestedProvider === "auto") {
    const errors: string[] = [];

    // Try OpenAI first if API key exists
    if (config.apiKey || process.env.OPENAI_API_KEY) {
      try {
        const provider = createOpenAIProvider(config);
        return { provider, providerId: "openai" };
      } catch (err) {
        errors.push(`OpenAI: ${formatError(err)}`);
      }
    }

    // Try Gemini if API key exists
    const geminiKey = config.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const provider = createGeminiProvider({ ...config, apiKey: geminiKey });
        return { provider, providerId: "gemini" };
      } catch (err) {
        errors.push(`Gemini: ${formatError(err)}`);
      }
    }

    // Try local as last resort
    try {
      const provider = await createLocalProvider(config);
      return { provider, providerId: "local" };
    } catch (err) {
      errors.push(`Local: ${formatError(err)}`);
    }

    throw new Error(
      "No embedding provider available.\n" +
      "Options:\n" +
      "1. Set OPENAI_API_KEY for OpenAI embeddings\n" +
      "2. Set GOOGLE_API_KEY for Gemini embeddings (free tier)\n" +
      "3. Local embeddings require node-llama-cpp\n\n" +
      "Errors:\n" + errors.join("\n")
    );
  }

  // Specific provider requested
  try {
    const provider = await createSpecificProvider(requestedProvider, config);
    return { provider, providerId: requestedProvider };
  } catch (primaryErr) {
    const primaryReason = formatError(primaryErr);

    // Try fallback if configured
    if (config.fallback && config.fallback !== requestedProvider) {
      try {
        const fallbackProvider = await createSpecificProvider(config.fallback, config);
        return {
          provider: fallbackProvider,
          providerId: config.fallback,
          fallbackFrom: requestedProvider,
          fallbackReason: primaryReason,
        };
      } catch (fallbackErr) {
        throw new Error(
          `${primaryReason}\n\nFallback to ${config.fallback} failed: ${formatError(fallbackErr)}`
        );
      }
    }

    throw new Error(primaryReason);
  }
}

async function createSpecificProvider(
  provider: string,
  config: EmbeddingConfig
): Promise<EmbeddingProviderInterface> {
  switch (provider) {
    case "openai":
      return createOpenAIProvider(config);

    case "gemini":
      return createGeminiProvider(config);

    case "local":
      return createLocalProvider(config);

    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }
}

function createOpenAIProvider(config: EmbeddingConfig): EmbeddingProviderInterface {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key required. Set OPENAI_API_KEY environment variable.");
  }
  return new OpenAIEmbeddingProvider({
    apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    dimensions: config.dimensions,
  });
}

function createGeminiProvider(config: EmbeddingConfig): EmbeddingProviderInterface {
  const apiKey = config.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Google API key required. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.");
  }
  return new GeminiEmbeddingProvider({
    apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
  });
}

async function createLocalProvider(config: EmbeddingConfig): Promise<EmbeddingProviderInterface> {
  const provider = new LocalEmbeddingProvider({
    modelPath: config.modelPath,
    modelCacheDir: config.modelCacheDir,
  });

  // Trigger initialization to verify it works
  await provider.embed("test");

  return provider;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
