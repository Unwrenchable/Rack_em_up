import { readdirSync, readFileSync, statSync } from 'fs';
import * as path from 'path';
import {
  assertSigningSecrets,
  jwtAccessSecret,
  jwtRefreshSecret,
  resolveSigningSecret,
} from './auth-secrets';

const OLD_ACCESS = ['dev', 'access', 'secret'].join('_');
const OLD_REFRESH = ['dev', 'refresh', 'secret'].join('_');

function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walkTs(full, out);
      continue;
    }
    if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('resolveSigningSecret', () => {
  const prevNode = process.env.NODE_ENV;
  const prevAccess = process.env.JWT_SECRET;
  const prevRefresh = process.env.JWT_REFRESH_SECRET;

  afterEach(() => {
    if (prevNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNode;
    if (prevAccess === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevAccess;
    if (prevRefresh === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = prevRefresh;
  });

  it('returns the configured value in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'prod-access-value';
    process.env.JWT_REFRESH_SECRET = 'prod-refresh-value';
    expect(jwtAccessSecret()).toBe('prod-access-value');
    expect(jwtRefreshSecret()).toBe('prod-refresh-value');
  });

  it('refuses to start in production when a signing secret is missing or blank', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => resolveSigningSecret('JWT_SECRET')).toThrow(/Missing required secret JWT_SECRET/);
    expect(() => resolveSigningSecret('JWT_SECRET')).toThrow(/NODE_ENV=production/);

    process.env.JWT_REFRESH_SECRET = '   ';
    expect(() => jwtRefreshSecret()).toThrow(/Missing required secret JWT_REFRESH_SECRET/);
  });

  it('names every missing secret when production boot checks them together', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = ' ';
    expect(() => assertSigningSecrets()).toThrow(
      /Missing required secret JWT_SECRET, JWT_REFRESH_SECRET/,
    );
  });

  it('generates one random non-literal secret per variable outside production', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    const accessA = jwtAccessSecret();
    const accessB = jwtAccessSecret();
    const refresh = jwtRefreshSecret();

    expect(accessA).toBe(accessB);
    expect(accessA).not.toBe(refresh);
    expect(accessA).not.toBe(OLD_ACCESS);
    expect(refresh).not.toBe(OLD_REFRESH);
    expect(accessA).toMatch(/^[0-9a-f]{64}$/);
    expect(refresh).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('signing secret literals', () => {
  it('does not commit fallback literals for JWT or other signing secrets', () => {
    const srcRoot = path.join(__dirname, '..');
    const files = walkTs(srcRoot);
    const literalFallback =
      /process\.env\.([A-Z0-9_]+)\s*(?:\?\?|\|\|)\s*(['"`])([^'"`]+)\2/g;
    // TTLs such as JWT_EXPIRES_IN are not signing secrets.
    const secretName =
      /(SECRET|SIGNING_KEY|PRIVATE_KEY|API_KEY|SESSION|ADMIN_PASSWORD)($|_)/;

    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (text.includes(OLD_ACCESS) || text.includes(OLD_REFRESH)) {
        hits.push(`${path.relative(srcRoot, file)} still contains a removed signing-secret literal`);
      }
      literalFallback.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = literalFallback.exec(text))) {
        const name = match[1];
        if (name.startsWith('DB_')) continue;
        if (!secretName.test(name)) continue;
        hits.push(
          `${path.relative(srcRoot, file)} falls back ${name} to a committed literal`,
        );
      }
    }

    expect(hits).toEqual([]);
  });
});
