/**
 * RealAI provider client — OpenAI-compatible HTTP surface (+ health).
 *
 * For **rackup-coach abilities** (rating, moderation, SOTD, pyramid, …) use
 * `realai-coach.client.ts` → POST /v1/plugins/rackup-coach
 * (REALAI_RACKUP_WIRING_CONTRACT.md).
 *
 * This file remains for optional /v1/chat/completions (Hive GPU only).
 * Render realai-api has no default_llm — do not use chat there for Coach.
 * Local Hive: http://127.0.0.1:8001
 *
 * RealAI stays a separate process. RackUp never vendors that monorepo.
 */

import { isUnusableRealAiText } from './realai-text-guard';
import {
  isForbiddenRealAiUiHost,
  realAiCoachPaths,
  renderCloudKeyHint,
  resolveRealAiBaseUrl,
} from './realai-endpoint';

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
  coachPath: string;
  chatRequiresLocalGpu: boolean;
  hint?: string;
  error?: string;
};

function baseUrl(): string {
  return resolveRealAiBaseUrl();
}

function coachPath(): string {
  return realAiCoachPaths()[0];
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
  const base = {
    configured: true,
    baseUrl: url,
    model,
    coachPath: coachPath(),
    chatRequiresLocalGpu: true,
    hint: renderCloudKeyHint(url),
  };
  if (isForbiddenRealAiUiHost(url)) {
    return {
      ...base,
      reachable: false,
      error: 'REALAI_BASE_URL points at realaiui.vercel.app (UI, not API)',
    };
  }
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      return { ...base, reachable: false, error: `health ${res.status}` };
    }
    return { ...base, reachable: true };
  } catch (e) {
    return {
      ...base,
      reachable: false,
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

  // Render API-only RealAI has no default_llm / GGUF — do not treat that as coaching.
  if (isUnusableRealAiText(content)) {
    throw new Error(
      'RealAI chat/completions requires a local default_llm; use rackup-coach plugin instead',
    );
  }

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