import aboutRaw from '../content/about.md?raw';
import faqRaw from '../content/faq.md?raw';

export type ContentDoc = {
  slug: string;
  path: string;
  metaTitle: string;
  metaDescription: string;
  title: string;
  excerpt: string;
  body: string;
  rest: string;
};

export type FaqItem = {
  question: string;
  answerMarkdown: string;
  answerText: string;
};

export const BLOG_SLUG_ORDER = [
  'find-pool-players-near-me',
  'how-pool-hall-check-in-works',
  'money-sets-and-stake-matches',
  'run-pool-tournaments-on-your-phone',
  'pool-coach-ai-and-shot-of-the-day',
  'jump-masse-combo-drills-catalogue',
  'rack-of-champions-vs-other-pool-apps',
] as const;

export type BlogSlug = (typeof BLOG_SLUG_ORDER)[number];

const YAML_KEY = /^(meta_title|meta_description)\s*:\s*(.*)$/;

export function parseFrontMatter(raw: string): {
  metaTitle: string;
  metaDescription: string;
  body: string;
} {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!text.startsWith('---')) {
    throw new Error('Content file is missing YAML front matter');
  }
  const close = text.indexOf('\n---', 3);
  if (close < 0) {
    throw new Error('Content file YAML front matter is not closed');
  }
  const yaml = text.slice(4, close).trim();
  const body = text.slice(close + 4).replace(/^\n/, '');
  const fields: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(YAML_KEY);
    if (!m) continue;
    fields[m[1]] = unquoteYaml(m[2].trim());
  }
  if (!fields.meta_title || !fields.meta_description) {
    throw new Error('Content file needs meta_title and meta_description');
  }
  return {
    metaTitle: fields.meta_title,
    metaDescription: fields.meta_description,
    body,
  };
}

function unquoteYaml(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, ' ');
  }
  return value;
}

export function firstHeading(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? stripMd(m[1]) : '';
}

export function splitTitle(markdown: string): { title: string; rest: string } {
  const m = markdown.match(/^#\s+(.+)\n+/);
  if (!m) return { title: firstHeading(markdown), rest: markdown };
  return { title: stripMd(m[1]), rest: markdown.slice(m[0].length) };
}

export function firstParagraph(markdown: string): string {
  const withoutHeading = markdown.replace(/^#\s+.+\n+/, '');
  const chunk = withoutHeading.split(/\n\s*\n/).find((p) => {
    const t = p.trim();
    return t && !t.startsWith('#') && !t.startsWith('|') && !t.startsWith('- ');
  });
  return chunk ? stripMd(chunk) : '';
}

export function stripMd(input: string): string {
  return input
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractFaqItems(markdown: string): FaqItem[] {
  const parts = markdown.replace(/\r\n/g, '\n').split(/^##\s+/m);
  const items: FaqItem[] = [];
  for (const part of parts.slice(1)) {
    const nl = part.indexOf('\n');
    const question = stripMd((nl < 0 ? part : part.slice(0, nl)).trim());
    const answerMarkdown = (nl < 0 ? '' : part.slice(nl + 1)).trim();
    if (!question || !answerMarkdown) continue;
    items.push({
      question,
      answerMarkdown,
      answerText: stripMd(answerMarkdown),
    });
  }
  return items;
}

function toDoc(slug: string, path: string, raw: string): ContentDoc {
  const parsed = parseFrontMatter(raw);
  const { title, rest } = splitTitle(parsed.body);
  return {
    slug,
    path,
    metaTitle: parsed.metaTitle,
    metaDescription: parsed.metaDescription,
    title: title || parsed.metaTitle,
    excerpt: firstParagraph(parsed.body) || parsed.metaDescription,
    body: parsed.body,
    rest,
  };
}

const blogModules = import.meta.glob('../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const blogBySlug: Record<string, ContentDoc> = {};
for (const [file, raw] of Object.entries(blogModules)) {
  const base = file.split('/').pop() ?? '';
  const slug = base.replace(/\.md$/, '');
  blogBySlug[slug] = toDoc(slug, `/blog/${slug}`, raw);
}

const missing = BLOG_SLUG_ORDER.filter((slug) => !blogBySlug[slug]);
if (missing.length) {
  throw new Error(`Missing blog markdown for: ${missing.join(', ')}`);
}

export const ABOUT = toDoc('about', '/about', aboutRaw);
export const FAQ = toDoc('faq', '/faq', faqRaw);
export const FAQ_ITEMS = extractFaqItems(FAQ.body);

export const BLOG_POSTS: ContentDoc[] = BLOG_SLUG_ORDER.map((slug) => blogBySlug[slug]);

export function getBlogPost(slug: string): ContentDoc | undefined {
  return blogBySlug[slug];
}
