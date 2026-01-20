import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { EMBEDDING_MODEL } from '@shareskill/shared';

const EMBEDDING_DIMENSIONS = 1536;

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY!,
      baseURL: env.OPENAI_API_URL || 'https://api.openai.com/v1',
    });
  }
  return _openai;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}
