const MAX_LEN = 1000;

export function sanitizeChatText(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  let text = input.trim();
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (text.length > MAX_LEN) {
    text = text.slice(0, MAX_LEN);
  }
  return text;
}