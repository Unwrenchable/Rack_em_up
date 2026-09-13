import { BadRequestException } from '@nestjs/common';

/** Absolute http(s) only. Empty / whitespace → null (clear). */
export function normalizeOptionalHttpUrl(raw?: string | null): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new BadRequestException('Stream URL must be an absolute http or https link');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Stream URL must be http or https');
  }
  if (!parsed.hostname) {
    throw new BadRequestException('Stream URL must be an absolute http or https link');
  }
  return parsed.toString();
}
