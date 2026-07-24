# RackUp MEGA STATUS REPORT

**Authoritative as of:** 2026-07-24 (P0+P1+P2 complete — PR ready)  
**Companion:** [`TODO_REPO.md`](./TODO_REPO.md)

---

## 1. Executive summary

RackUp is **PR-ready for real-world demo**: V1 product surface, V2 modules with integration hooks, production hardening, frontend live wiring, CI smoke, and optional live e2e.

| Track | Status |
|-------|--------|
| P0 integration + hardening | **Done** |
| P1 (profiles, MM radius, chat JWT, e2e, CI, Auth V2) | **Done** |
| P2 (losers bracket, seed, hall photos) | **Done** |
| P3 (escrow, vision AI, push, PostGIS, S3, premium) | Roadmap only |

---

## 2. Auth decision

**Web cutover to Auth V2** (`POST /auth/v2/login|signup`) with **V1 legacy fallback** if V2 fails. Refresh token stored when returned. V1 routes remain for compatibility; new clients should use V2.

---

## 3. Implementation map (P1/P2)

| Feature | Location |
|---------|----------|
| Public user profile | `GET /api/v1/users/:id`, `GET /users/profiles?ids=` |
| Friends / looking names | `api.ts` `fetchFriends` / `fetchLookingPlayers` + profiles |
| MM radius + expiry | `matchmaking-v2.service.ts`, `radius_meters`, env `MM_V2_*` |
| Chat JWT | `chat.gateway.ts` + `ChatPage` `auth: { token }` |
| Live e2e | `test/e2e/live-api.e2e.spec.ts` |
| CI | `.github/workflows/ci.yml` |
| Losers bracket | `bracket-generation.service.ts` + `advanceWinner` drop |
| Seed | `scripts/seed-demo.ts` → `npm run seed:demo` |
| Hall photos | `hall-photo-storage.service.ts`, static `/uploads` |

---

## 4. CI + tests

| Suite | Command | CI |
|-------|---------|-----|
| Smoke | `npm run test:smoke` | Yes |
| Typecheck/build BE+FE | `tsc` / `build` | Yes |
| Live e2e | `E2E_BASE_URL=... npm run test:e2e` | Opt-in (needs live stack) |

---

## 5. Dependency graph (final)

```
[DONE] All P0 (scorekeeping → redis → advance → realai → rating → smoke → throttler → migrations → web money/SOTD)
[DONE] P1 profiles → friends/looking names
[DONE] P1 matchmaking radius/expiry
[DONE] P1 chat JWT
[DONE] P1 Auth V2 cutover
[DONE] P1 CI + live e2e harness
[DONE] P2 losers bracket · seed · local photo storage

P3 only → escrow · vision · push · PostGIS · S3 · premium
```

---

## 6. Local demo / PR checklist

```bash
docker compose -f rackup-backend/docker-compose.yml up -d
cd rackup-backend && npm i && TYPEORM_SYNC=true npm run start:dev
npm run seed:demo   # optional
cd rackup-web && npm i && npm run dev
# open http://localhost:5173 — signup (Auth V2), coach SOTD, play money, chat with JWT
```

Demo seed users (after seed): `ace@rackup.demo` / `demo1234` (and vee/bank).

---

## 7. Known limitations

- Multi-node photo storage needs S3 (local disk only today).  
- Full double-elim grand finals reset not modeled.  
- Live e2e not forced in CI (requires compose + running API).  
- V1 matchmaking search still powers Find page (names hydrated).  

---

## 8. Atomic history (reference)

Commits 1–12 (P0/SOTD) + P1/P2 follow-ups can be split if rewriting history; all code is on `main`.

---

*PR-ready status 2026-07-24. Remaining work is P3 product roadmap only.*
