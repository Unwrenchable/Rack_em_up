import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function buildOptions(): Parameters<typeof createClient>[0] {
  const raw = (process.env.REDIS_URL || '').trim() || 'redis://localhost:6379';
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { url: raw };
  }
  const host = parsed.hostname;
  const isLocal = LOCAL_HOSTS.has(host);
  const wantTls =
    parsed.protocol === 'rediss:' ||
    (!isLocal && process.env.REDIS_TLS !== 'false');

  if (!wantTls) {
    return { url: raw };
  }

  // Hosted Redis (e.g. layerbase) routes by TLS SNI, so the servername must be set.
  parsed.protocol = 'rediss:';
  // eslint-disable-next-line no-console
  console.log(`[redis] target ${host}:${parsed.port || 6379} tls=on sni=${host}`);
  return {
    url: parsed.toString(),
    socket: {
      tls: true,
      servername: host,
      reconnectStrategy: (retries: number) => Math.min(retries * 500, 5000),
    } as any,
  };
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient(buildOptions()) as RedisClientType;

  redisClient.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Redis Client Error:', err?.message ?? err);
  });

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
}
