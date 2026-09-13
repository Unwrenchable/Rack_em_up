/** Only allow http(s) hrefs so javascript:/data: streams cannot execute. */
export function safeHttpHref(raw?: string | null): string | undefined {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return trimmed;
  } catch {
    /* ignore */
  }
  return undefined;
}
