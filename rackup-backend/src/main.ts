import * as dotenv from 'dotenv';
dotenv.config();

// Force Express HTTP stack on Node 20+ (global Fetch API present).
// Nest must not type middleware against undici Request/Response.
// Note: do NOT clear globalThis.fetch - several services use fetch() (Stripe, RealAI, FCM, S3).

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import * as path from 'path';
import { AppModule } from './app.module';
import { WebsocketAdapter } from './websocket/websocket.adapter';

function safeDbHint(): string {
  const raw = (process.env.DATABASE_URL ?? '').trim();
  if (/^postgres(ql)?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      return `${u.hostname}${u.pathname}`;
    } catch {
      return 'DATABASE_URL(unparseable)';
    }
  }
  const host = process.env.DB_HOST ?? 'localhost';
  return `DB_HOST=${host}`;
}

async function bootstrap(): Promise<void> {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    {
      bufferLogs: true,
    },
  );

  const logger = new Logger('Bootstrap');
  app.useLogger(logger);

  // Local hall photo / asset storage
  const uploadRoot = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR, '..')
    : path.join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadRoot, { prefix: '/uploads/' });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
    exposedHeaders: ['x-correlation-id'],
  });

  app.useWebSocketAdapter(new WebsocketAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');

  logger.log(`RackUp backend running on http://0.0.0.0:${port}/api/v1`);
  logger.log(`Socket.IO path=/socket.io (chat + score_update + /tv namespace)`);
  logger.log(
    `db=${safeDbHint()} REDIS=${process.env.REDIS_URL ? 'set' : 'unset'}`,
  );
  logger.log(
    `synchronize=${process.env.TYPEORM_SYNC ?? '(dev default)'} NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}`,
  );
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  const message = err instanceof Error ? err.message : String(err);
  logger.error(
    `Boot failed before port bind: ${message}. ` +
      'On Render, set DATABASE_URL to the Postgres Internal Database URL (postgres://…), ' +
      'confirm the DB is Available, and unset DB_HOST/DB_USERNAME leftovers.',
  );
  process.exit(1);
});
