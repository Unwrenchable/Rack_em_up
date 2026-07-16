# RackUp — Current Status (living doc)

**Last updated:** 2026-07-13  
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

1. Runtime smoke: auth → check-in → money complete → memories → Elo change  
2. `node rackup-backend/test-socket.js`  
3. Wire Coach UI fully to `/training/*` (partial)  
4. Throttler + e2e tests  
5. TypeORM migrations off `synchronize`