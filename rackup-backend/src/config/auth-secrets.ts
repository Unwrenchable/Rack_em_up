import { randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * Signing secrets for access JWTs, refresh JWTs, and the websocket gateway.
 *
 * Production (NODE_ENV=production) refuses to start when a secret is missing.
 * Dev and test may use a process-local random value generated once at startup.
 * Never fall back to a committed literal.
 */
const logger = new Logger('AuthSecrets');

const generated = new Map<string, string>();

const FORBIDDEN_ENV = 'production';

export function resolveSigningSecret(name: string): string {
  const fromEnv = (process.env[name] ?? '').trim();
  if (fromEnv.length > 0) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === FORBIDDEN_ENV) {
    throw new Error(
      `Missing required secret ${name}. Refusing to start when NODE_ENV=production. ` +
        `Set ${name} to a long random value and restart. ` +
        `If this process ever ran with a hard-coded default, rotate ${name} before trusting existing tokens.`,
    );
  }

  const existing = generated.get(name);
  if (existing) {
    return existing;
  }

  const created = randomBytes(32).toString('hex');
  generated.set(name, created);
  if (process.env.NODE_ENV !== 'test') {
    logger.warn(
      `${name} is not set. Using a random secret generated for this process only. ` +
        `Tokens will not survive a restart. Set ${name} to keep a stable dev secret.`,
    );
  }
  return created;
}

/** Access-token signing secret (HTTP JWT strategy + websocket gateway). */
export function jwtAccessSecret(): string {
  return resolveSigningSecret('JWT_SECRET');
}

/** Refresh-token signing secret. */
export function jwtRefreshSecret(): string {
  return resolveSigningSecret('JWT_REFRESH_SECRET');
}

/**
 * Resolve every signing secret once during boot.
 * In production this throws before the HTTP server listens when any are missing.
 */
export function assertSigningSecrets(): void {
  if (process.env.NODE_ENV === FORBIDDEN_ENV) {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
    const missing = required.filter((name) => (process.env[name] ?? '').trim().length === 0);
    if (missing.length > 0) {
      throw new Error(
        `Missing required secret ${missing.join(', ')}. Refusing to start when NODE_ENV=production. ` +
          `Set ${missing.join(' and ')} to a long random value and restart. ` +
          `If this process ever ran with a hard-coded default, rotate ${missing.join(' and ')} before trusting existing tokens.`,
      );
    }
  }
  jwtAccessSecret();
  jwtRefreshSecret();
}
