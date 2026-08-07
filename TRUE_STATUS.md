# RackUp — True Current Status (repo truth, 2026-08-05)

**This document supersedes older merge/audit notes** that claimed V2 was deleted, Scorekeeping V2 was absent, dotenv was missing, etc.  
Those notes described an **earlier** snapshot. **On-disk code now says otherwise.**

**Full roadmap map:** [`ROADMAP_2026.md`](./ROADMAP_2026.md) — Phase 0–6 DONE/PARTIAL/TODO against production roadmap.

---

## 1. Correcting the outdated audit

| Claim from old sources | Reality in this workspace |
|------------------------|---------------------------|
| V2 modules deleted in merge (12k deletions) | **False now.** V2 trees present under `auth/v2`, `halls/v2`, `tournaments/v2`, `leagues/v2`, `matchmaking/v2`, `realai/v2` (~80+ V2 TS files) |
| Scorekeeping V2 absent | **False.** `ScorekeepingServiceV2.processReport`, timelines, controller `/scorekeeping/v2/*` |
| RealAI V2 not in match reports | **False.** `processReport` queues RealAI summary + timeline keyShots |
| dotenv not called | **False.** `main.ts` lines 1–2: `dotenv.config()` |
| No throttler / correlation logging | **False.** Global `ThrottlerGuard` + correlation-id + request logging middleware |
| No smoke tests | **False.** `npm run test:smoke` (15 tests) |
| Redis V2 incomplete | **Mostly false.** Canonical helpers + migrate-legacy util |
| Only SOTD is complete V2 | **Understates.** SOTD is one piece; MM/halls/tourneys/leagues/auth V2 + scorekeeping also shipped |
| Production not close | **Fair.** Demo/PR-ready; full prod (vision, PostGIS, real S3 billing) still open |

---

## 2. What is DONE (verified on disk)

### V1 backend — complete product surface
Auth, users/stats, matchmaking, matches, tournaments, money matches, leagues, halls, memories, friends, notifications, action board, training, shots, chat gateway.

### V2 backend — present and wired into `AppModule`
| Module | Status |
|--------|--------|
| Auth V2 | Sessions, refresh, email/password reset |
| Halls V2 | Check-in/out, feed, photos, Vegas seed |
| Tournaments V2 | Bracket gen (SE/DE/RR/Swiss), report, admin, TV, grand final |
| Leagues V2 | Seasons, standings, ratings import, unified rating |
| Matchmaking V2 | Redis queue, radius, haversine |
| RealAI V2 | Coach, summary jobs, insights, **52 SOTD maps** |
| Scorekeeping V2 | **processReport** + deep timelines + SOTD candidates |
| Money trust (3D) | Escrow mock/Stripe stub, arbiter, durable audit |
| P3 slice | Object storage, push, premium flags |

### Frontend
Pages for home/find/play/money/halls/chat/coach/tournaments/TV; Auth V2; MM/Halls/Tournament V2 wiring (3A); money dual-confirm; SOTD diagrams.

### Infra
Docker Compose Postgres+Redis · migrations files · smoke tests · CI workflow · throttler · logging middleware.

---

## 3. What is PARTIAL / still open

| Area | Gap |
|------|-----|
| **Runtime** | Must have docker up + API on :3000 or sockets show `ERR_CONNECTION_REFUSED` |
| **WebSocket** | Needs API running; Vite now proxies `/socket.io` (fixed this pass) |
| **Migrations in prod** | Files exist; many devs still use `TYPEORM_SYNC=true` |
| **Find looking list** | Still hydrates V1 looking board alongside MM V2 queue |
| **Grand final** | Heuristic champ detection; edge cases on complex DE brackets |
| **S3 / FCM / Stripe** | Code paths exist; need real credentials for prod |
| **P3 remaining** | Vision AI, multi-agent tasks, PostGIS, full billing, streaming tips |

---

## 4. Boot checklist (hit the mark locally)

```bash
# 1) Infra
docker compose -f rackup-backend/docker-compose.yml up -d

# 2) API (must print "Database connected" after Health onModuleInit)
cd rackup-backend
# ensure .env has DB_* and REDIS_URL
npm run start:dev
# expect: Database connected · Redis connected · RackUp backend running … :3000/api/v1

# 3) Web
cd rackup-web
# For local: either omit VITE_API_URL (proxy) or set:
# VITE_API_URL=http://localhost:3000/api/v1
npm run dev

# 4) Smoke
cd rackup-backend && npm run test:smoke
curl -s http://localhost:3000/api/v1/health | jq .
curl -s http://localhost:3000/api/v1/health/scorekeeping | jq .
```

**WebSocket:** With API on :3000 and Vite proxy, chat uses `getSocketUrl()` → same origin → `/socket.io` proxied.  
If you set `VITE_API_URL` to a Codespace URL, sockets must target that host (and the API must be running there).

---

## 5. Bottom line

You do **not** have “only V1 + deleted V2 + only SOTD.”

You have:

> **A working V1 product + a largely restored V2 stack + Scorekeeping V2 as the report spine + demo-oriented 3A–3D/P3 features.**

Critical path is no longer “rebuild V2 from zero.” It is:

1. **Runtime verify** (compose + dotenv + health shows Database connected)  
2. **Keep API up** so sockets don’t refuse  
3. **Prod hard remaining P3** (vision, PostGIS, real multi-node storage/billing) when ready  

Living todos: [`TODO_REPO.md`](./TODO_REPO.md) · mega: [`MEGA_STATUS_REPORT.md`](./MEGA_STATUS_REPORT.md)
