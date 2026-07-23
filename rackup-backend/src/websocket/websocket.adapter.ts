import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';

export class WebsocketAdapter extends IoAdapter {
  constructor(private app: INestApplication) {
    super(app);
  }

  create(port: number, options?: any) {
    return super.create(port, {
      ...options,
      path: '/socket.io',
    });
  }
}
