// LLM Module - Unified LLM calling with XML output parsing
// Supports multiple providers with retry, timeout, and rate limiting

import { config, type LLMProvider } from './config.js';

export interface LLMResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

interface QueueItem {
  resolve: (value: LLMResponse) => void;
  reject: (error: Error) => void;
  prompt: string;
  retries: number;
}

class LLMClient {
  private queue: QueueItem[] = [];
  private activeRequests = 0;
  private lastRequestTime = 0;

  async call(prompt: string, maxRetries = config.maxRetries): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, prompt, retries: 0 });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) return;
    if (this.activeRequests >= config.llmMaxConcurrent) return;

    const minInterval = config.llmRequestInterval * 1000;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      setTimeout(() => this.processQueue(), minInterval - timeSinceLastRequest);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeRequests++;
    this.lastRequestTime = Date.now();

    try {
      const response = await this.makeRequest(item.prompt);
      item.resolve(response);
    } catch (error: any) {
      const isRetryable = error.status === 429 || error.status >= 500 ||
                          error.message?.includes('timeout') ||
                          error.message?.includes('ECONNRESET');

      if (isRetryable && item.retries < config.maxRetries) {
        item.retries++;
        const delay = Math.min(config.retryDelay * Math.pow(2, item.retries) * 1000, 60000);
        console.warn(`  LLM retry ${item.retries}/${config.maxRetries} in ${(delay/1000).toFixed(1)}s: ${error.message?.slice(0, 100)}`);
        setTimeout(() => {
          this.queue.unshift(item);
          this.processQueue();
        }, delay);
      } else {
        item.reject(error);
      }
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private async makeRequest(prompt: string): Promise<LLMResponse> {
    const provider = config.currentModel;
    const llmConfig = config.llmConfig;
    const timeout = config.llmTaskTimeout * 1000;

    if (provider === 'gemini') {
      return this.callGemini(llmConfig, prompt, timeout);
    } else if (provider === 'claude') {
      return this.callClaude(llmConfig, prompt, timeout);
    } else if (provider === 'ollama') {
      return this.callOllama(llmConfig, prompt, timeout);
    } else {
      return this.callOpenAICompatible(llmConfig, prompt, timeout);
    }
  }

  private async callOpenAICompatible(
    llmConfig: { id: string; url: string; apiKey: string },
    prompt: string,
    timeout: number
  ): Promise<LLMResponse> {
    const url = `${llmConfig.url.replace(/\/$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.id,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw Object.assign(new Error(`HTTP ${response.status}: ${error.slice(0, 200)}`), {
          status: response.status,
        });
      }

      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        } : undefined,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callGemini(
    llmConfig: { id: string; url: string; apiKey: string },
    prompt: string,
    timeout: number
  ): Promise<LLMResponse> {
    const url = `${llmConfig.url.replace(/\/$/, '')}/${llmConfig.id}:generateContent?key=${llmConfig.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2000 },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw Object.assign(new Error(`HTTP ${response.status}: ${error.slice(0, 200)}`), {
          status: response.status,
        });
      }

      const data = await response.json();
      return { content: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callClaude(
    llmConfig: { id: string; url: string; apiKey: string },
    prompt: string,
    timeout: number
  ): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(llmConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': llmConfig.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: llmConfig.id,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw Object.assign(new Error(`HTTP ${response.status}: ${error.slice(0, 200)}`), {
          status: response.status,
        });
      }

      const data = await response.json();
      return { content: data.content?.[0]?.text || '' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callOllama(
    llmConfig: { id: string; url: string; apiKey: string },
    prompt: string,
    timeout: number
  ): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (llmConfig.apiKey) headers['Authorization'] = `Bearer ${llmConfig.apiKey}`;

    try {
      const response = await fetch(llmConfig.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: llmConfig.id,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw Object.assign(new Error(`HTTP ${response.status}: ${error.slice(0, 200)}`), {
          status: response.status,
        });
      }

      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || data.message?.content || data.response || '' };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// XML parsing utilities
export function parseXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

export function parseXmlTagList(xml: string, tag: string): string[] {
  const content = parseXmlTag(xml, tag);
  if (!content) return [];

  const itemRegex = /<item>([^<]*)<\/item>/gi;
  const items: string[] = [];
  let match;
  while ((match = itemRegex.exec(content)) !== null) {
    const item = match[1].trim();
    if (item) items.push(item);
  }
  return items;
}

export function parseXmlWarnings(xml: string): Array<{
  file: string;
  line: number | null;
  severity: 'high' | 'medium' | 'low';
  type: 'prompt_injection' | 'malicious_code' | 'data_exfiltration' | 'credential_exposure' | 'destructive_operation' | 'other';
  description: string;
}> {
  // Support both <warnings> and <security_warnings> tags
  let warningsXml = parseXmlTag(xml, 'warnings') || parseXmlTag(xml, 'security_warnings');
  if (!warningsXml) return [];

  const validTypes = ['prompt_injection', 'malicious_code', 'data_exfiltration', 'credential_exposure', 'destructive_operation', 'other'];
  const warnings: Array<{ file: string; line: number | null; severity: 'high' | 'medium' | 'low'; type: 'prompt_injection' | 'malicious_code' | 'data_exfiltration' | 'credential_exposure' | 'destructive_operation' | 'other'; description: string }> = [];
  const warningRegex = /<warning>([\s\S]*?)<\/warning>/gi;
  let match;

  while ((match = warningRegex.exec(warningsXml)) !== null) {
    const warnXml = match[1];
    const file = parseXmlTag(warnXml, 'file') || '';
    const lineStr = parseXmlTag(warnXml, 'line');
    const severity = (parseXmlTag(warnXml, 'severity') || 'low').toLowerCase();
    const typeRaw = (parseXmlTag(warnXml, 'type') || 'other').toLowerCase();
    const description = parseXmlTag(warnXml, 'description') || '';

    if (description) {
      warnings.push({
        file,
        line: lineStr ? parseInt(lineStr, 10) : null,
        severity: ['high', 'medium', 'low'].includes(severity) ? severity as 'high' | 'medium' | 'low' : 'low',
        type: validTypes.includes(typeRaw) ? typeRaw as any : 'other',
        description: description.slice(0, 500),
      });
    }
  }

  return warnings;
}

// Singleton client
let llmClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClient) {
    llmClient = new LLMClient();
  }
  return llmClient;
}

export async function callLLM(prompt: string): Promise<LLMResponse> {
  return getLLMClient().call(prompt);
}
