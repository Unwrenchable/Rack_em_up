#!/usr/bin/env node
/** Assert built dist has robots.txt, sitemap.xml, JSON-LD, and branded defaults. */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const origin = 'https://www.rackofchampions.com';
const failures = [];

function mustExist(rel) {
  if (!existsSync(join(dist, rel))) failures.push(`missing dist/${rel}`);
}

function mustInclude(label, text, needle) {
  if (!text.includes(needle)) failures.push(`${label} missing ${JSON.stringify(needle)}`);
}

mustExist('robots.txt');
mustExist('sitemap.xml');
mustExist('index.html');
mustExist('manifest.json');
mustExist('manifest.webmanifest');

const robots = existsSync(join(dist, 'robots.txt'))
  ? readFileSync(join(dist, 'robots.txt'), 'utf8')
  : '';
mustInclude('robots.txt', robots, 'User-agent: *');
mustInclude('robots.txt', robots, 'Allow: /');
mustInclude('robots.txt', robots, `Sitemap: ${origin}/sitemap.xml`);
if (/^\s*Disallow:\s*\/\s*$/m.test(robots)) {
  failures.push('robots.txt Disallow: / would block crawl');
}

const sitemap = existsSync(join(dist, 'sitemap.xml'))
  ? readFileSync(join(dist, 'sitemap.xml'), 'utf8')
  : '';
const sitemapUrls = [
  `${origin}/`,
  `${origin}/find`,
  `${origin}/coach`,
  `${origin}/shots`,
  `${origin}/halls`,
  `${origin}/play`,
  `${origin}/social`,
  `${origin}/tournaments`,
];
for (const url of sitemapUrls) {
  mustInclude('sitemap.xml', sitemap, `<loc>${url}</loc>`);
}
for (const privatePath of ['/auth', '/profile', '/wallet', '/settings', '/chat', '/notifications']) {
  if (sitemap.includes(`${origin}${privatePath}`)) {
    failures.push(`sitemap.xml should omit auth-only ${privatePath}`);
  }
}

const html = existsSync(join(dist, 'index.html'))
  ? readFileSync(join(dist, 'index.html'), 'utf8')
  : '';
mustInclude(
  'index.html title',
  html,
  '<title>RackUp | Rack of Champions — Pool Matchmaking, Halls & Money Sets</title>',
);
mustInclude(
  'index.html description',
  html,
  'Find pool players near you, check into halls, book money sets, run tournaments, and train with Coach AI.',
);
mustInclude('index.html', html, 'application/ld+json');
mustInclude('index.html', html, '"@type": "Organization"');
mustInclude('index.html', html, '"@type": "WebSite"');
mustInclude('index.html', html, '"@type": "SoftwareApplication"');
mustInclude('index.html', html, 'rel="manifest" href="/manifest.json"');
mustInclude('index.html', html, `rel="canonical" href="${origin}/"`);
mustInclude('index.html', html, '<noscript>');
mustInclude('index.html', html, 'rel="sitemap"');
if (html.includes('__PUBLIC_ORIGIN__')) {
  failures.push('index.html still contains __PUBLIC_ORIGIN__ placeholder');
}

const publicRobots = readFileSync(join(root, 'public/robots.txt'), 'utf8');
const publicSitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf8');
if (publicRobots !== robots) failures.push('dist/robots.txt does not match public/robots.txt');
if (publicSitemap !== sitemap) failures.push('dist/sitemap.xml does not match public/sitemap.xml');

const seoSrc = readFileSync(join(root, 'src/lib/seo.ts'), 'utf8');
for (const title of [
  'RackUp | Rack of Champions — Pool Matchmaking, Halls & Money Sets',
  'Find Pool Players Near You | RackUp Matchmaking',
  'Pool Coach & Shot of the Day | RackUp Training',
  'Pool Shot Catalogue & Drills | RackUp',
  'Pool Halls Near You — Check In & Play | RackUp',
  'Money Sets, Tournaments & Leagues | RackUp Play',
  'Friends, Chat & Challenges | RackUp Social',
  'Your Pool Player Profile | RackUp',
  'Join RackUp | Sign In — Rack of Champions',
]) {
  mustInclude('src/lib/seo.ts', seoSrc, title);
}

if (failures.length) {
  console.error('SEO check failed:\n - ' + failures.join('\n - '));
  process.exit(1);
}

console.log('SEO foundation OK');
console.log(`  robots  = ${origin}/robots.txt`);
console.log(`  sitemap = ${origin}/sitemap.xml (${sitemapUrls.length} urls)`);
console.log(`  title   = ${html.match(/<title>([^<]+)<\/title>/)?.[1]}`);
