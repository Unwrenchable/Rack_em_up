/**
 * RealAI provider client — OpenAI-compatible HTTP surface.
 *
 * Scope source: Unwrenchable/realai `analysis-clean` (provider-grade /v1 contract).
 * Default local: http://localhost:8000  →  POST /v1/chat/completions
 *
 * RealAI stays a separate process. RackUp never vendors that monorepo.
 * When RealAI is down, callers should use rule-based fallbacks.
 */

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type RealAiChatResult = {
  content: string;
  model: string;
  provider: 'realai';
  offlineFallback: boolean;
};

export type RealAiStatus = {
  configured: boolean;
  reachable: boolean;
  baseUrl: string;
  model: string;
  error?: string;
};

function baseUrl(): string {
  return (process.env.REALAI_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');
}

function modelName(): string {
  return process.env.REALAI_MODEL ?? 'realai-2.0';
}

function apiKey(): string | undefined {
  return process.env.REALAI_API_KEY || undefined;
}

export async function getRealAiStatus(): Promise<RealAiStatus> {
  const url = baseUrl();
  const model = modelName();
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      return {
        configured: true,
        reachable: false,
        baseUrl: url,
        model,
        error: `health ${res.status}`,
      };
    }
    return { configured: true, reachable: true, baseUrl: url, model };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      baseUrl: url,
      model,
      error: e instanceof Error ? e.message : 'unreachable',
    };
  }
}

/**
 * Chat completion via RealAI OpenAI-compatible API.
 * Throws if network/API fails — callers choose fallback.
 */
export async function realAiChat(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<RealAiChatResult> {
  const url = `${baseUrl()}/v1/chat/completions`;
  const model = modelName();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = apiKey();
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.5,
      max_tokens: opts?.maxTokens ?? 800,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RealAI chat failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!content) throw new Error('RealAI returned empty content');

  return {
    content,
    model: data.model ?? model,
    provider: 'realai',
    offlineFallback: false,
  };
}

/** Prefer RealAI; on failure return offlineFallback content from a factory. */
export async function realAiChatOrFallback(
  messages: ChatMessage[],
  fallback: () => string,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<RealAiChatResult> {
  try {
    return await realAiChat(messages, opts);
  } catch {
    return {
      content: fallback(),
      model: 'rules-fallback',
      provider: 'realai',
      offlineFallback: true,
    };
  }
}