# RackUp — Unified Repo-Wide TODO (Production Readiness)

**Last updated:** 2026-07-24  
**PR readiness:** P0 + P1 + P2 implemented; only P3/future remain.

---

## Completed — P0 / P1 / P2

### P0 (prior pass)
- [x] Scorekeeping V2 + report wiring  
- [x] Redis V2 keys  
- [x] Health `"Database connected"`  
- [x] Tournament bracket advance  
- [x] RealAI summary jobs  
- [x] Unified rating  
- [x] Smoke tests / throttler / logging / migrations  
- [x] Frontend money complete + standings  
- [x] SOTD streak + catalog + 52 maps  

### P1 (this pass)
- [x] **GET /users/:id + /users/profiles** — public profiles; friends & looking players hydrated  
  - Backend: `users.controller.ts`, `users.service.ts`  
  - Frontend: `fetchUserProfile` / `fetchUserProfiles` in `api.ts`  
- [x] **Matchmaking radius + queue expiry** — `radiusMeters`, expire stale requests/sessions, radius-filtered pairing  
  - `matchmaking-v2.service.ts`, entity column + migration  
- [x] **Chat socket JWT** — handshake `auth.token`; disconnect unauth; message throttle  
  - `chat.gateway.ts`, `ChatPage.tsx`  
- [x] **Live e2e** — `test/e2e/live-api.e2e.spec.ts` (`E2E_BASE_URL`, skips if offline)  
- [x] **CI** — `.github/workflows/ci.yml` (tsc, build, test:smoke backend; tsc/build frontend)  
- [x] **Auth V2 web cutover** — login/signup prefer `/auth/v2/*`, V1 legacy fallback; refresh stored  

### P2 (this pass)
- [x] **Losers bracket** — double-elim generates winners + losers R1; losers drop on report  
- [x] **Seed script** — `npm run seed:demo` (`scripts/seed-demo.ts`)  
- [x] **Hall photo storage** — local `uploads/hall-photos`, base64 or URL; static `/uploads`  

---

## 🟩 P3 — Future / roadmap only

- [ ] RealAI multimodal vision shot analysis  
- [ ] RealAI multi-agent `/v1/tasks`  
- [ ] Escrow (Stripe/PayPal) for money matches  
- [ ] Live streaming / spectator / tips  
- [ ] Push notifications (FCM/APNs)  
- [ ] PostGIS hall heat maps  
- [ ] Premium tier / hall B2B billing  
- [ ] Object storage (S3) replace local uploads  
- [ ] Full double-elim grand final reset series  
- [ ] Do **not** vendor RealAI monorepo  

---

## Known limitations (acceptable for PR)

| Item | Note |
|------|------|
| League standings | V1 league id may ≠ V2 season id → empty standings until linked |
| E2E in CI | Live e2e is opt-in via `E2E_BASE_URL`; CI runs smoke only |
| Auth V1 | Still available as legacy fallback |
| Local photos | Not durable multi-instance; use S3 for multi-node prod |
| Matchmaking V1 | Looking players still use V1 search + name hydration |

---

## Run for demo / PR

```bash
docker compose -f rackup-backend/docker-compose.yml up -d
cd rackup-backend && npm i && TYPEORM_SYNC=true npm run start:dev
# optional: npm run seed:demo
cd rackup-web && npm i && npm run dev

# checks
cd rackup-backend && npx tsc --noEmit && npm run test:smoke
cd rackup-web && npx tsc -b
# live e2e (API up):
E2E_BASE_URL=http://localhost:3000/api/v1 npm run test:e2e
```
