import * as dotenv from 'dotenv';
dotenv.config();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WebsocketAdapter } from './websocket/websocket.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // CORS – allow local + production frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      // Add your frontend Render URL here later
      // 'https://rackup-frontend.onrender.com',
    ],
    credentials: true,
  });

  app.useWebSocketAdapter(new WebsocketAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Important for Render
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`RackUp backend running on http://0.0.0.0:${port}/api/v1`);
}

bootstrap();
