# RackUp — PROJECT TODO

**Last updated:** 2026-07-13  
**Living status:** see root [`CURRENT_STATUS.md`](../CURRENT_STATUS.md)

---

## Done — foundation (P0–P3)

- [x] Nest bootstrap, `app.module`, TypeORM + Redis config
- [x] Auth (signup/login/refresh), JWT, RBAC roles
- [x] Users, matchmaking, tournaments, leagues, money matches
- [x] ChatGateway + Redis presence + chat sanitization
- [x] `ormconfig` entities (incl. tournament, memories, halls, matches, friends, action, notifs, reports)
- [x] Match memories + hooks (standard / tournament / money)
- [x] Halls + Hall Pulse (`/halls/live`) + check-in / claim
- [x] Standard matches create/report
- [x] `@nestjs/platform-socket.io`, CORS, `.env.example`
- [x] Health: DB + Redis + RealAI reachability
- [x] `tsc --noEmit` clean (verified in agent sessions)

---

## Done — V2 module scaffolding (Halls/Tournaments/Leagues/RealAI/Matchmaking)

- [x] Create halls v2 module/controller/service + entities + DTOs + Vegas seed endpoint
- [x] Wire halls v2 into app.module.ts + register entities in ormconfig.ts
- [x] Create tournaments v2 module/controller/service + bracket generation (single-elim, double-elim, round-robin)
- [x] Wire tournaments v2 into app.module.ts + register entities in ormconfig.ts
- [x] Create leagues v2 module/controller/service + rating normalization + external rating storage
- [x] Wire leagues v2 into app.module.ts + register entities in ormconfig.ts
- [x] Create realai v2 module/controller/service + shot-of-the-day structured diagram DTOs
- [x] Wire realai v2 into app.module.ts
- [x] Create matchmaking v2 module/controller/service + Redis-backed queue + haversine pairing
- [x] Wire matchmaking v2 into app.module.ts + register entities in ormconfig.ts
- [x] `npx tsc --noEmit` passes cleanly (V2 code compiles without errors)

---

## Done — product surface (P5)

- [x] Friends API
- [x] Action board API
- [x] Tournament + league **list** endpoints
- [x] Notifications (in-app) + money ACTIVE notifs
- [x] Player reports
- [x] Elo on match complete (standard / tournament / money)
- [x] RealAI external provider client + `/training/*` (offline rules fallback)
- [x] **Shot of the Day** — 52-shot catalog, non-repeat cycle, tip/speed/english detail
  - [x] `GET /shots/today` · `upcoming` · `catalog` · `:id`
  - [x] Massey/Venom-inspired exhibition set + fundamentals
  - [x] Coach + Home UI (cue-ball hit diagram)
- [x] Web app: Home / Find / Play / Social / Chat / Halls / Coach / Memories / Alerts / Profile / Settings
- [x] Demo mode when API offline
- [x] Money UI confirm + dispute wired to API
- [x] `docker-compose.yml` (Postgres + Redis)
- [x] Root `CURRENT_STATUS.md` (replaces stale boot briefing)

---

## Open — runtime verification (do next)

- [ ] P0.5 Start Postgres + Redis (`docker compose up -d`) and `npm run start:dev`
- [ ] P0.5b `node test-socket.js` (connect + message + presence)
- [ ] P1.5 Manual smoke: auth → check-in → money complete → **2 memories** + Elo change
- [ ] P1.6 `GET /shots/today` returns today’s shot; tomorrow differs
- [ ] P1.7 Coach SOTD + drills against live API (not only demo)

---

## Open — production hardening (P4)

- [ ] P4.3 Global throttler (`@nestjs/throttler`) on auth / money / chat
- [ ] P4.5 Jest + supertest e2e (auth, money, halls, shots, memories)
- [ ] P4.6 TypeORM migrations; turn off `synchronize` for non-dev
- [ ] P4.7 Structured logging (pino/winston) + correlation ids
- [ ] P4.8 Seed script (demo halls, users, sample SOTD completion)

---

## Open — product polish (P6)

- [ ] Wire remaining demo toasts → live APIs (challenge, register tour, league standings)
- [ ] Money complete score UI (POST `/money-matches/:id/complete`)
- [ ] SOTD “I made it” / user completions + streak
- [ ] Full shot catalog browser in web (filter difficulty/category)
- [ ] Friends list hydrated with display names from users
- [ ] Socket chat JWT auth (optional)

---

## Future — blueprint (P7+)

- [ ] RealAI multimodal / vision shot analysis (when `analysis-clean` stable)
- [ ] RealAI `/v1/tasks` multi-agent coach jobs
- [ ] Escrow (Stripe/PayPal) for money matches
- [ ] Live streaming / spectator / tips
- [ ] Push notifications (FCM/APNs)
- [ ] PostGIS heat maps
- [ ] Premium tier / hall B2B billing
- [ ] Do **not** vendor RealAI monorepo into RackUp

---

## Bot resume prompt

```
Continue RackUp from rackup-backend/PROJECT_TODO.md open items.
Prefer runtime smoke (docker compose, start:dev, test-socket, shots/today).
Do not copy realai-clean into this repo — HTTP provider only.
```
