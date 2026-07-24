import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Redis Client Error:', err);
  });

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
}
