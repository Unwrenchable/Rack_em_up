/**
 * Live e2e against a running API + docker Postgres/Redis.
 *
 *   docker compose -f docker-compose.yml up -d
 *   TYPEORM_SYNC=true npm run start:dev   # terminal 1
 *   E2E_BASE_URL=http://localhost:3000/api/v1 npm run test:e2e
 *
 * If E2E_BASE_URL is unset or health fails, suite is skipped (CI smoke still runs).
 */
const BASE = process.env.E2E_BASE_URL ?? '';

async function api(path: string, init?: RequestInit & { token?: string }) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (init?.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

const describeLive = BASE ? describe : describe.skip;

describeLive('Live API e2e (docker)', () => {
  let token = '';
  let userId = '';
  const email = `e2e_${Date.now()}@rackup.test`;
  const password = 'TestPass123!';

  it('health is ok / degraded with database connected string', async () => {
    const { status, body } = await api('/health');
    expect(status).toBe(200);
    expect(body.db === 'up' || body.db === 'down').toBe(true);
    if (body.db === 'up') {
      expect(body.database).toBe('Database connected');
    }
  });

  it('auth signup + login (v2 preferred, v1 fallback)', async () => {
    let res = await api('/auth/v2/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        display_name: 'E2E Player',
      }),
    });
    if (res.status >= 400) {
      res = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          display_name: 'E2E Player',
        }),
      });
    }
    expect(res.status).toBeLessThan(500);
    if (res.status < 300 && res.body?.accessToken) {
      token = res.body.accessToken;
      userId = res.body.user?.id;
    } else {
      const login = await api('/auth/v2/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (login.status >= 400) {
        const login1 = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        expect(login1.status).toBeLessThan(300);
        token = login1.body.accessToken;
        userId = login1.body.user?.id;
      } else {
        token = login.body.accessToken;
        userId = login.body.user?.id;
      }
    }
    expect(token).toBeTruthy();
  });

  it('GET public user profile', async () => {
    if (!userId) return;
    const { status, body } = await api(`/users/${userId}`);
    expect(status).toBe(200);
    expect(body.displayName).toBeTruthy();
    expect(body.email).toBeUndefined();
  });

  it('SOTD maps + catalog', async () => {
    const maps = await api('/realai/v2/sotd/maps');
    expect(maps.status).toBe(200);
    expect(maps.body.total).toBeGreaterThanOrEqual(1);

    const today = await api('/shots/today');
    expect(today.status).toBe(200);
    expect(today.body.shot?.id).toBeTruthy();
  });

  it('SOTD complete streak (auth)', async () => {
    if (!token) return;
    const { status, body } = await api('/shots/complete', {
      method: 'POST',
      token,
    });
    expect(status).toBeLessThan(500);
    if (status < 300) {
      expect(body.streak).toBeGreaterThanOrEqual(1);
    }
  });

  it('tournament v2 create / list / register / start / bracket', async () => {
    if (!token) return;

    // Unauthenticated list must be V2 AuthGuard (401), not v1 ParseUUIDPipe (400 uuid).
    const unauth = await api('/tournaments/v2');
    expect(unauth.status).not.toBe(400);
    expect(unauth.status).toBe(401);

    const created = await api('/tournaments/v2/create', {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: `E2E Tour ${Date.now()}`,
        game: '9-ball',
        mode: 'SINGLE_ELIMINATION',
        seed_strategy: 'random',
      }),
    });
    expect(created.status).toBeLessThan(300);
    const tournamentId = created.body?.id as string;
    expect(tournamentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const list = await api('/tournaments/v2', { token });
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((t: { id: string }) => t.id === tournamentId)).toBe(true);

    const registerA = await api('/tournaments/v2/register', {
      method: 'POST',
      token,
      body: JSON.stringify({ tournamentId }),
    });
    expect(registerA.status).toBeLessThan(300);
    expect(registerA.body?.success).toBe(true);

    const emailB = `e2e_b_${Date.now()}@rackup.test`;
    const signupB = await api('/auth/v2/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: emailB,
        password,
        display_name: 'E2E Player B',
      }),
    });
    expect(signupB.status).toBeLessThan(300);
    const tokenB = signupB.body?.accessToken as string;
    expect(tokenB).toBeTruthy();

    const registerB = await api('/tournaments/v2/register', {
      method: 'POST',
      token: tokenB,
      body: JSON.stringify({ tournamentId }),
    });
    expect(registerB.status).toBeLessThan(300);

    const started = await api('/tournaments/v2/start', {
      method: 'POST',
      token,
      body: JSON.stringify({ tournamentId, seed_strategy: 'random' }),
    });
    expect(started.status).toBeLessThan(300);
    expect(started.body?.success).toBe(true);

    const bracket = await api(`/tournaments/v2/bracket/${tournamentId}`, { token });
    expect(bracket.status).toBe(200);
    expect(Array.isArray(bracket.body?.matches)).toBe(true);
    expect(bracket.body.matches.length).toBeGreaterThanOrEqual(1);
  });

  it('matchmaking v2 search enqueue', async () => {
    if (!token) return;
    const res = await api('/matchmaking/v2/search', {
      method: 'POST',
      token,
      body: JSON.stringify({
        lat: 36.17,
        lon: -115.14,
        radius: 15000,
        game: '9-ball',
        stakes: 'casual',
      }),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status < 300) {
      expect(res.body.radiusMeters).toBeDefined();
      expect(res.body.requestId).toBeTruthy();
    }
  });
});
