/**
 * Regression: v1 `:id` must not steal `/tournaments/v2` or `/tournaments/v2/register`.
 * Boots a Nest+Express fixture with v1 registered first (the production-buggy order).
 */
import 'reflect-metadata';
import { Controller, Get, INestApplication, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';

import { TOURNAMENT_V1_UUID_PARAM } from '../../src/tournaments/tournament-route.constants';

@Controller('tournaments')
class ConstrainedV1Controller {
  @Get(TOURNAMENT_V1_UUID_PARAM)
  getById() {
    return { handler: 'v1-get' };
  }

  @Post(`${TOURNAMENT_V1_UUID_PARAM}/register`)
  register() {
    return { handler: 'v1-register' };
  }
}

@Controller('tournaments/v2')
class V2Controller {
  @Get()
  list() {
    return [{ handler: 'v2-list' }];
  }

  @Post('register')
  register() {
    return { handler: 'v2-register', accepted: 'tournamentId' };
  }

  @Post('start')
  start() {
    return { handler: 'v2-start' };
  }
}

@Controller('legacy/tournaments')
class UnconstrainedV1Controller {
  @Get(':id')
  getById() {
    return { handler: 'v1-get' };
  }

  @Post(':id/register')
  register() {
    return { handler: 'v1-register' };
  }
}

@Controller('legacy/tournaments/v2')
class UnconstrainedV2Controller {
  @Get()
  list() {
    return [{ handler: 'v2-list' }];
  }

  @Post('register')
  register() {
    return { handler: 'v2-register' };
  }
}

@Module({
  // v1 first — same order that stole V2 paths in production
  controllers: [
    ConstrainedV1Controller,
    V2Controller,
    UnconstrainedV1Controller,
    UnconstrainedV2Controller,
  ],
})
class TournamentRouteFixtureModule {}

async function json(app: INestApplication, path: string, init?: RequestInit) {
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const res = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

describe('Tournament V2 route precedence', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const server = express();
    app = await NestFactory.create<NestExpressApplication>(
      TournamentRouteFixtureModule,
      new ExpressAdapter(server),
      { logger: false },
    );
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('documents the unconstrained bug: v1 :id captures /v2 when registered first', async () => {
    const list = await json(app, '/legacy/tournaments/v2');
    expect(list.status).toBe(200);
    expect(list.body).toEqual({ handler: 'v1-get' });

    const register = await json(app, '/legacy/tournaments/v2/register', {
      method: 'POST',
      body: JSON.stringify({ tournamentId: '1ebfe450-9e16-4e6c-bddd-5fa218a44f92' }),
    });
    expect(register.status).toBe(200);
    expect(register.body).toEqual({ handler: 'v1-register' });
  });

  it('GET /tournaments/v2 reaches V2 list (array) even when v1 is registered first', async () => {
    const list = await json(app, '/tournaments/v2');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body).toEqual([{ handler: 'v2-list' }]);
  });

  it('POST /tournaments/v2/register with {tournamentId} reaches V2', async () => {
    const register = await json(app, '/tournaments/v2/register', {
      method: 'POST',
      body: JSON.stringify({ tournamentId: '1ebfe450-9e16-4e6c-bddd-5fa218a44f92' }),
    });
    expect(register.status).toBe(200);
    expect(register.body).toEqual({ handler: 'v2-register', accepted: 'tournamentId' });
  });

  it('POST /tournaments/v2/start still reaches V2', async () => {
    const start = await json(app, '/tournaments/v2/start', {
      method: 'POST',
      body: JSON.stringify({ tournamentId: '1ebfe450-9e16-4e6c-bddd-5fa218a44f92' }),
    });
    expect(start.status).toBe(200);
    expect(start.body).toEqual({ handler: 'v2-start' });
  });

  it('v1 UUID routes still match real tournament ids', async () => {
    const id = '1ebfe450-9e16-4e6c-bddd-5fa218a44f92';
    const get = await json(app, `/tournaments/${id}`);
    expect(get.status).toBe(200);
    expect(get.body).toEqual({ handler: 'v1-get' });

    const register = await json(app, `/tournaments/${id}/register`, { method: 'POST' });
    expect(register.status).toBe(200);
    expect(register.body).toEqual({ handler: 'v1-register' });
  });
});
