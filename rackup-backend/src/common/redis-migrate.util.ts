import { Logger } from '@nestjs/common';
import { getRedisClient } from '../config/redis.config';
import { LEGACY_TO_CANONICAL } from './redis-keys';

const logger = new Logger('RedisMigrate');

/**
 * If a legacy V2 key still holds data and the canonical key does not,
 * copy (or rename) so older clients don't silently break.
 * Best-effort; never throws.
 */
export async function migrateLegacyRedisKeysIfPresent(): Promise<{
  migrated: string[];
  skipped: string[];
}> {
  const migrated: string[] = [];
  const skipped: string[] = [];

  try {
    const redis = await getRedisClient();

    for (const { legacy, canonical } of LEGACY_TO_CANONICAL) {
      if (legacy === canonical) {
        skipped.push(legacy);
        continue;
      }

      try {
        const legacyType = await redis.type(legacy);
        if (legacyType === 'none') {
          skipped.push(legacy);
          continue;
        }

        const canonicalExists = (await redis.exists(canonical)) > 0;
        if (canonicalExists) {
          skipped.push(legacy);
          continue;
        }

        // RENAME is atomic when target missing
        await redis.rename(legacy, canonical);
        migrated.push(`${legacy} → ${canonical}`);
        logger.log(`Migrated Redis key ${legacy} → ${canonical}`);
      } catch (err) {
        logger.warn(
          `migrate key ${legacy} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        skipped.push(legacy);
      }
    }
  } catch (err) {
    logger.warn(
      `migrateLegacyRedisKeysIfPresent: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return { migrated, skipped };
}
