# RackUp — Current Status (living doc)

**Last updated:** 2026-07-14 (V2 module scaffolding completed)
**Replaces:** older “Boot & Runtime Briefing” logs (baseline only).  
**Todos:** [`rackup-backend/PROJECT_TODO.md`](rackup-backend/PROJECT_TODO.md) (source of truth) · legacy [`rackup-backend/TODO.md`](rackup-backend/TODO.md) marked done/superseded.

## Product split (keep clean)

| Path | Role |
|------|------|
| `rackup-backend/` | NestJS API of record |
| `rackup-web/` | Vite React UI |
| RealAI (`Unwrenchable/realai` · branch `analysis-clean`) | **External AI provider** — not vendored here |

RealAI monorepo is large/messy by design of its stage. RackUp only talks to it via HTTP:

- `REALAI_BASE_URL` (default `http://localhost:8000`)
- `POST /v1/chat/completions` (OpenAI-compatible)
- Offline → **rules fallback** (app still works)

## Backend modules

| Module | Status |
|--------|--------|
| Auth / Users / JWT / RBAC | Done |
| Matchmaking | Done |
| Tournaments (+ list, report → memories + Elo) | Done |
| Money matches (+ complete, memories, Elo, notifs) | Done |
| Leagues (+ list) | Done |
| Halls + Hall Pulse | Done |
| Standard matches | Done |
| Match memories | Done |
| Friends | Done |
| Action board | Done |
| ChatGateway + sanitize + Redis presence | Done |
| Health (db/redis/realai) | Done |
| **Training** (RealAI provider) | Done (scaffold + fallback) |
| **Shot of the Day** (50+ catalog, non-repeat cycle) | Done |
| **Notifications** (in-app) | Done |
| **Reports** | Done |
| Elo rating on completed matches | Done |
| **Halls V2** (check-in/out, events, photos, leaderboard, Vegas seed) | Done |
| **Tournaments V2** (single-elim, double-elim, round-robin bracket gen) | Done |
| **Leagues V2** (seasons, standings, scheduling, external ratings) | Done |
| **RealAI V2** (coach, match summary, player insights, SOTD diagrams) | Done |
| **Matchmaking V2** (Redis-backed queue, haversine pairing, sessions) | Done |
| Stripe escrow / streaming / real vision AI | **Future** |
| Jest e2e / throttler / migrations | **Todo** |

## API map (`/api/v1`)

### Core (briefing baseline)
- `POST /auth/signup|login|refresh`
- `GET /users/me`
- `GET|POST|DELETE /matchmaking/*`
- `GET|POST /tournaments/*`
- `GET|POST /money-matches/*` (+ `/:id/complete`)
- `GET|POST|PATCH /leagues/*`
- Socket.IO `message` + `presence`

### Added after baseline
- `GET /halls`, `GET /halls/live`, `POST /halls/check-in`, `POST /halls/:id/claim`
- `POST /matches`, `GET /matches/:id`, `POST /matches/:id/report`
- `GET /users/me/memories`, `POST /users/me/memories/matches/:id/highlight`
- `GET|POST /friends/*`
- `GET|POST /action-board/*`
- `GET /health`
- `GET /training/provider`
- `GET /training/drills/today` (JWT)
- `POST /training/analyze` (JWT) — RealAI when up
- `POST /training/scouting` (JWT)
- `GET /shots/today` · `GET /shots/upcoming` · `GET /shots/catalog` · `GET /shots/:id`
- `GET|POST /notifications/*` (JWT)
- `GET|POST /reports/*` (JWT)

### V2 endpoints (under `/api/v1/*/v2`)
- `POST /halls/v2/checkin` · `POST /halls/v2/checkout` · `GET /halls/v2/feed/:hallId`
- `POST /halls/v2/events/create` · `POST /halls/v2/events/update`
- `POST /halls/v2/photos/upload`
- `GET /halls/v2/leaderboard/:hallId` · `POST /halls/v2/seed/vegas`
- `POST /tournaments/v2/create` · `POST /tournaments/v2/register` · `POST /tournaments/v2/start`
- `POST /tournaments/v2/report-match`
- `GET /tournaments/v2/bracket/:id` · `GET /tournaments/v2/rounds/:id` · `GET /tournaments/v2/standings/:id`
- `POST /leagues/v2/season/create` · `POST /leagues/v2/season/start`
- `GET /leagues/v2/season/:id/standings`
- `POST /leagues/v2/season/:id/schedule-match` · `POST /leagues/v2/season/:id/report-match`
- `POST /leagues/v2/ratings/import` · `GET /leagues/v2/ratings/player/:playerId`
- `POST /matchmaking/v2/search` · `POST /matchmaking/v2/cancel` · `POST /matchmaking/v2/confirm`
- `GET /matchmaking/v2/status/:sessionId`
- `POST /realai/v2/coach` · `POST /realai/v2/match-summary` · `POST /realai/v2/player-insights` · `POST /realai/v2/shot-of-the-day`

## Frontend (`rackup-web`)

Home · Find · Play · Social · Chat · Halls · Coach · Memories · Notifications · Profile · Settings  
Demo mode when API offline.

| UI | Status |
|----|--------|
| Shot of the Day (Coach + Home teaser, cue-ball diagram) | Done |
| Money confirm / dispute → API | Done |
| Training drills / analyze / provider status | Done |
| Challenge / tour register / complete-score forms | Partial (some toasts remain) |

## Run

```bash
# infra
docker compose up -d

# API
cd rackup-backend && cp .env.example .env && npm i && npm run start:dev

# UI
cd rackup-web && npm i && npm run dev

# Optional RealAI (analysis-clean checkout elsewhere)
# REALAI_BASE_URL=http://localhost:8000
```

## Intentional non-goals (for now)

- Do **not** copy `realai-clean` into this repo
- Full video-vision pipeline waits until RealAI analysis surface is stable
- Escrow / streaming stay roadmap

## Next hardening

### Phase 2 (Integration hooks) — NOT STARTED
- [ ] Scorekeeping V2 hooks for halls, tournaments, leagues reporting
- [ ] RealAI V2 integration for hall/tournament/league summary endpoints
- [ ] Redis V2 namespaces for halls/tournaments/leagues/matchmaking/realai
- [ ] Cross-module wiring (hall feed → tournament/league/realai)
- [ ] Unified rating normalization across V2 modules

### Phase 3 (Build + test) — NOT STARTED
- [ ] DB connection verification ("Database connected")
- [ ] Authenticated V2 smoke tests
- [ ] Tournament V2 runtime tests (create, register, start, bracket gen, report match, standings)
- [ ] League V2 runtime tests (create season, start, schedule match, report match, standings, ratings import)
- [ ] Hall V2 leaderboard/feed tests (check-in, checkout, feed, leaderboard, Vegas seed)
- [ ] Matchmaking V2 queue/session tests (search, cancel, confirm, status)
- [ ] RealAI V2 shot-of-the-day + match-summary + player-insights tests (requires RealAI running)
- [ ] Redis namespace population tests
- [ ] Full V2 route verification under `/api/v1/*/v2`

### Runtime smoke (existing pre-V2)
1. `docker compose up -d` + `npm run start:dev`
2. auth → check-in → money complete → memories → Elo change
3. `node rackup-backend/test-socket.js`
4. Wire Coach UI fully to `/training/*` (partial)
5. Throttler + e2e tests
6. TypeORM migrations off `synchronize`
