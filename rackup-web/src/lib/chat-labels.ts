/** Visible conversation name — never the generic "Thread" / duplicate "DM" chrome. */
export function conversationLabel(t: {
  title?: string | null;
  kind?: string;
  lastMessagePreview?: string | null;
}): string {
  const title = t.title?.trim();
  if (title) return title;
  const preview = t.lastMessagePreview?.trim();
  if (preview) {
    return preview.length > 24 ? `${preview.slice(0, 23)}…` : preview;
  }
  return t.kind === 'GROUP' ? 'Group' : 'Chat';
}

export function chatThreadPath(threadId: string, name?: string | null) {
  const qs = new URLSearchParams({ thread: threadId });
  const trimmed = name?.trim();
  if (trimmed) qs.set('name', trimmed);
  return `/chat?${qs.toString()}`;
}
