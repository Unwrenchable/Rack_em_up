/**
 * Last-line publish guard for POST /training/analyze.
 * The live Render bug returned the default_llm placeholder as coaching
 * with provider=realai and offlineFallback=false. That must never ship.
 */

import { isDefaultLlmPlaceholder, isUnusableRealAiText } from '../ai/realai-text-guard';

export const LIVE_DEFAULT_LLM_PLACEHOLDER =
  'Local RealAI is selected, but no local model is configured/loaded yet. Register a local model and set it as default_llm, then retry.';

export type PublicAnalyzeResponse = {
  analysis: string;
  provider: string;
  model: string;
  offlineFallback: boolean;
  status: 'realai' | 'rules-fallback';
  reason: string | null;
};

export function sanitizePublicAnalyze(input: {
  analysis: string;
  provider: string;
  model?: string;
  offlineFallback?: boolean;
  fallbackAnalysis: string;
}): PublicAnalyzeResponse {
  const raw = String(input.analysis ?? '');
  if (isDefaultLlmPlaceholder(raw)) {
    return {
      analysis: input.fallbackAnalysis,
      provider: 'rules-fallback',
      model: 'rules-fallback',
      offlineFallback: true,
      status: 'rules-fallback',
      reason: 'unusable_placeholder',
    };
  }
  if (isUnusableRealAiText(raw)) {
    return {
      analysis: input.fallbackAnalysis,
      provider: 'rules-fallback',
      model: 'rules-fallback',
      offlineFallback: true,
      status: 'rules-fallback',
      reason: 'plugin_unavailable',
    };
  }
  if (input.offlineFallback || input.provider === 'rules-fallback') {
    return {
      analysis: raw,
      provider: 'rules-fallback',
      model: input.model ?? 'rules-fallback',
      offlineFallback: true,
      status: 'rules-fallback',
      reason: 'plugin_unavailable',
    };
  }
  return {
    analysis: raw,
    provider: 'realai',
    model: input.model ?? 'rackup-coach',
    offlineFallback: false,
    status: 'realai',
    reason: null,
  };
}
