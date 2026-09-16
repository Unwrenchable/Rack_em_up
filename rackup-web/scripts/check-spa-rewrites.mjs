#!/usr/bin/env node
/**
 * Guard the Render SPA rewrite that live www.rackofchampions.com needs.
 * Render ignores public/_redirects; 404.html is served with HTTP 404.
 * The rewrite must live on the Blueprint that actually deploys rackup-web.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(webRoot, '..');

const failures = [];

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    failures.push(`missing file: ${path}`);
    return '';
  }
}

function mustInclude(label, text, needle) {
  if (!text.includes(needle)) failures.push(`${label} missing ${JSON.stringify(needle)}`);
}

function extractService(yaml, name) {
  // Top-level Blueprint services are `  - type:` (2-space). Nested
  // `      - type: rewrite` must not split the block.
  const blocks = yaml.match(/^  - type:.*(?:\n(?!  - type:).*)*/gm) || [];
  return blocks.find((b) => new RegExp(`^\\s*name:\\s*${name}\\s*$`, 'm').test(b)) || '';
}

const rootYaml = read(join(repoRoot, 'render.yaml'));
const nestedYaml = read(join(webRoot, '.render.yaml'));
const appTsx = read(join(webRoot, 'src/App.tsx'));
const redirects = read(join(webRoot, 'public/_redirects'));

const rootWeb = extractService(rootYaml, 'rackup-web');
if (!rootWeb) {
  failures.push('repo-root render.yaml has no rackup-web service (live Blueprint never applies SPA routes)');
} else {
  mustInclude('root render.yaml rackup-web', rootWeb, 'runtime: static');
  mustInclude('root render.yaml rackup-web', rootWeb, 'rootDir: rackup-web');
  mustInclude('root render.yaml rackup-web', rootWeb, 'staticPublishPath: dist');
  mustInclude('root render.yaml rackup-web', rootWeb, '--include=dev');
  mustInclude('root render.yaml rackup-web', rootWeb, 'type: rewrite');
  mustInclude('root render.yaml rackup-web', rootWeb, 'source: /*');
  mustInclude('root render.yaml rackup-web', rootWeb, 'destination: /index.html');
  mustInclude('root render.yaml rackup-web', rootWeb, 'VITE_API_URL');
  mustInclude('root render.yaml rackup-web', rootWeb, 'https://api.rackofchampions.com/api/v1');
  mustInclude('root render.yaml rackup-web', rootWeb, 'https://api.rackofchampions.com');
}

const nestedWeb = extractService(nestedYaml, 'rackup-web');
if (!nestedWeb) {
  failures.push('rackup-web/.render.yaml has no rackup-web service');
} else {
  mustInclude('rackup-web/.render.yaml', nestedWeb, 'rootDir: rackup-web');
  mustInclude('rackup-web/.render.yaml', nestedWeb, '--include=dev');
  mustInclude('rackup-web/.render.yaml', nestedWeb, 'type: rewrite');
  mustInclude('rackup-web/.render.yaml', nestedWeb, 'source: /*');
  mustInclude('rackup-web/.render.yaml', nestedWeb, 'destination: /index.html');
  mustInclude('rackup-web/.render.yaml', nestedWeb, 'https://api.rackofchampions.com/api/v1');
  if (/\n\s*rootDir:\s*\.\s*\n/.test(nestedWeb) && !nestedWeb.includes('rootDir: rackup-web')) {
    failures.push('rackup-web/.render.yaml rootDir: . is repo-root; Vite will not build');
  }
}

mustInclude('App.tsx', appTsx, "path=\"play\"");
mustInclude('App.tsx', appTsx, 'PlayPage');
mustInclude('App.tsx', appTsx, 'SeoHead');
mustInclude('public/_redirects', redirects, '/index.html');
mustInclude('root render.yaml', rootYaml, 'Redirects/Rewrites');
mustInclude('root render.yaml rackup-web', rootWeb, 'application/manifest+json');
mustInclude('root render.yaml rackup-web', rootWeb, '/robots.txt');
mustInclude('root render.yaml rackup-web', rootWeb, '/sitemap.xml');
mustInclude('rackup-web/.render.yaml', nestedWeb, 'application/manifest+json');

if (failures.length) {
  console.error('SPA rewrite check failed:\n - ' + failures.join('\n - '));
  process.exit(1);
}

console.log('SPA rewrite config OK');
console.log('  root Blueprint includes rackup-web /* → /index.html');
console.log('  VITE_API_URL = https://api.rackofchampions.com/api/v1');
console.log('  App.tsx routes PlayPage at /play');
