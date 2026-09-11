import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';

function corsOrigins(): true | string[] {
  const raw = (process.env.CORS_ORIGIN ?? '').trim();
  if (!raw) return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export class WebsocketAdapter extends IoAdapter {
  constructor(private app: INestApplication) {
    super(app);
  }

  create(port: number, options?: any) {
    return super.create(port, {
      ...options,
      path: '/socket.io',
      cors: {
        origin: corsOrigins(),
        credentials: true,
      },
    });
  }
}
