#!/usr/bin/env node
/** Assert built dist/index.html has branded OG / Twitter / icon / manifest tags. */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const htmlPath = join(dist, 'index.html');
const origin = 'https://www.rackofchampions.com';

const requiredFiles = [
  'index.html',
  'og-image.png',
  'favicon.svg',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-192-maskable.png',
  'icon-512-maskable.png',
  'manifest.webmanifest',
  'sw.js',
];

const missing = requiredFiles.filter((f) => !existsSync(join(dist, f)));
if (missing.length) {
  console.error('Missing dist assets:', missing.join(', '));
  process.exit(1);
}

const html = readFileSync(htmlPath, 'utf8');
const needles = [
  'property="og:title"',
  'property="og:description"',
  'property="og:site_name"',
  'property="og:type"',
  `property="og:image" content="${origin}/og-image.png"`,
  `property="og:url" content="${origin}/"`,
  'name="twitter:card" content="summary_large_image"',
  `name="twitter:image" content="${origin}/og-image.png"`,
  'rel="apple-touch-icon"',
  'rel="manifest" href="/manifest.webmanifest"',
  'rel="icon" type="image/svg+xml"',
];

const absent = needles.filter((n) => !html.includes(n));
if (absent.length) {
  console.error('index.html missing share tags:\n - ' + absent.join('\n - '));
  process.exit(1);
}

if (html.includes('__PUBLIC_ORIGIN__')) {
  console.error('index.html still contains __PUBLIC_ORIGIN__ placeholder');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
for (const key of ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color', 'icons']) {
  if (!manifest[key]) {
    console.error(`manifest.webmanifest missing ${key}`);
    process.exit(1);
  }
}
if (manifest.display !== 'standalone') {
  console.error('manifest display must be standalone');
  process.exit(1);
}

console.log('Share meta + PWA assets OK');
console.log(`  og:image = ${origin}/og-image.png`);
console.log(`  title    = ${html.match(/<title>([^<]+)<\/title>/)?.[1]}`);
