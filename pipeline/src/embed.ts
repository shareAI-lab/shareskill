// Embedding Generation - Generate vectors using OpenAI text-embedding-3-large

import OpenAI from 'openai';
import { config } from './config.js';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiApiUrl,
    });
  }
  return openaiClient;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateSingleEmbedding(
  text: string,
  retries = config.maxRetries
): Promise<number[]> {
  if (!config.embeddingEnabled) {
    return [];
  }

  if (!text || text.trim().length === 0) {
    return [];
  }

  const openai = getOpenAI();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: config.embeddingModelId,
        input: text.slice(0, config.embeddingInputMaxChars),
        dimensions: config.embeddingDimensions,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      const isRateLimit = error.status === 429;
      const isServerError = error.status >= 500;

      if ((isRateLimit || isServerError) && attempt < retries) {
        const delay = config.retryDelay * (attempt + 1) * 1000;
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  return [];
}
