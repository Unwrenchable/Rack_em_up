# RackUp FULL ROADMAP 2026 — Status vs Reality

**Date:** 2026-08-05  
**Companion truth:** [`TRUE_STATUS.md`](./TRUE_STATUS.md)  
**Do not treat “restore deleted V2” as open work** — scaffolding and most V2 logic are **already in the repo**.

This document maps the production roadmap you outlined to **DONE / PARTIAL / TODO** on disk.

---

## PHASE 0 — Stabilize V1

| Item | Status |
|------|--------|
| Auth, Users, Halls, Tournaments, Leagues, MM, Money, Memories, Notifs, Training, RealAI V1, Shots, Action Board | **DONE** |

**Roadmap:** maintenance only.

---

## PHASE 1 — Restore V2 scaffolding

| Item | Status |
|------|--------|
| Halls / Tournaments / Leagues / Matchmaking / RealAI / Auth V2 modules | **DONE** (present under `src/*/v2`) |
| Scorekeeping V2 module | **DONE** (not “never implemented”) |
| Entities (TournamentV2, matches, brackets, league seasons, ratings, timelines…) | **DONE** |
| Controllers / services / DTOs | **DONE** |

**Outcome already achieved:** V2 scaffolding is restored and wired in `AppModule`.  
**Do not re-delete or re-scaffold from zero.**

---

## PHASE 2 — Implement V2 logic

| Area | Status | Notes |
|------|--------|--------|
| **Tournament V2** bracket engine | **DONE** | SE / DE / RR / Swiss |
| Round advancement | **DONE** | + losers drop |
| Auto-seeding | **DONE** | manual / random / elo |
| Match lifecycle + report | **DONE** | → processReport |
| RealAI summary injection | **DONE** | on processReport |
| Standings | **DONE** | |
| Grand final + reset | **DONE** | GRAND_FINAL |
| Admin / TV | **DONE** | |
| **League V2** seasons / schedule / standings / report | **DONE** | |
| Rating normalization | **DONE** | APA/Fargo → unified |
| RealAI league insights UI | **PARTIAL** | API exists; deep UI light |
| **Matchmaking V2** Redis queue + radius | **DONE** | |
| RealAI skill profile in MM | **PARTIAL** | Elo used; full AI profile not |
| **Scorekeeping V2** processReport | **DONE** | |
| Timeline shot/rack/foul | **DONE** | |
| 8/9/10-ball rules helpers | **DONE** (this pass) | validate + foul classify |
| Full physics / vision shot class | **TODO** | needs RealAI vision |
| Exportable match summary | **DONE** | RealAI job + timeline |
| **RealAI V2** coach / summary / insights / SOTD maps | **DONE** | |
| SOTD → skill profile deep map | **PARTIAL** | candidates harvested |
| Coaching suggestions in UI | **PARTIAL** | Coach page + provider |

---

## PHASE 3 — Frontend V2 integration

| Item | Status |
|------|--------|
| Tournament V2 bracket UI | **DONE** |
| League standings fetch | **DONE** | may need id-bridge |
| Money match complete UI | **DONE** | dual-confirm |
| RealAI V2 SOTD diagrams | **DONE** |
| Scorekeeping UI | **DONE** (this pass) | `/scorekeeping` |
| SOTD streak | **DONE** | Coach page |
| Shot catalog browser | **DONE** | `/shots` |
| Friends display names | **DONE** | profiles |
| Chat JWT | **DONE** | |
| WebSocket reconnection | **DONE** | improved delays |
| Live hall feed | **DONE** | Halls V2 feed |

---

## PHASE 4 — Database & Redis hardening

| Item | Status |
|------|--------|
| dotenv.config() | **DONE** | `main.ts` |
| Migrations files | **DONE** | 3 baseline migrations |
| Disable synchronize in prod | **PARTIAL** | env-driven; demo often SYNC=true |
| Seed scripts | **DONE** | `seed:demo` + id-bridge |
| DB connection logs | **DONE** | “Database connected” on boot |
| Health checks | **DONE** | `/health`, `/health/scorekeeping` |
| Redis V2 namespaces | **DONE** | |
| Presence / MM queue | **DONE** | |
| RealAI job keys | **DONE** | |
| Hall feed cross-module | **PARTIAL** | scorekeeping → hall feed |

---

## PHASE 5 — DevOps & production readiness

| Item | Status |
|------|--------|
| Docker Compose + **healthchecks** | **DONE** (this pass) |
| CI smoke + typecheck/build | **DONE** | `.github/workflows/ci.yml` |
| Live e2e harness | **DONE** | opt-in `E2E_BASE_URL` |
| Structured logging | **PARTIAL** | Nest Logger + correlation middleware (not full pino) |
| Throttler / rate limit | **DONE** | global |
| Deployment scripts | **PARTIAL** | docker compose only |
| Monitoring / alerts | **TODO** | Sentry etc. |

---

## PHASE 6 — Final delivery criteria

| Criterion | Status |
|-----------|--------|
| V1 stable | **YES** |
| V2 fully implemented (product scope) | **MOSTLY YES** — not vision AI |
| RealAI V2 integrated into reports | **YES** |
| Frontend polished for demo | **YES** |
| DB + Redis hardened enough for demo/PR | **YES** |
| Enterprise prod (multi-region, billing, vision) | **NOT YET** |

**Honest delivery bar today:** **Demo / PR-ready production candidate**, not “enterprise complete.”

---

## Critical path remaining (only real open work)

1. **RealAI vision / multi-agent tasks** (when external RealAI ready)  
2. **PostGIS** hall heat maps  
3. **Full Stripe Connect + premium billing** (beyond stubs)  
4. **Prod migrations** discipline (`TYPEORM_SYNC=false`)  
5. **Observability** (Sentry, alerts)  
6. Optional: deeper AI skill profiles in matchmaking  

---

## Agent prompt (use this — not the obsolete “restore V2” prompt)

```
You are working on RackUp (NestJS + React + Postgres + Redis + RealAI).

DO NOT re-scaffold V2 from zero. V2 modules, ScorekeepingServiceV2.processReport,
timelines, tournaments V2, escrow, push, and SOTD maps already exist.

Authoritative status: TRUE_STATUS.md + ROADMAP_2026.md + TODO_REPO.md.

Prefer: runtime verify (docker, health Database connected), wire remaining UI,
prod migrations, RealAI vision when ready, PostGIS/billing only when asked.

Single report entry: ScorekeepingServiceV2.processReport after domain COMPLETED.
Money: dual stake + dual result confirm + escrow. Redis keys via redis-keys.ts.
```

---

## Quick verify commands

```bash
docker compose -f rackup-backend/docker-compose.yml up -d
cd rackup-backend && npm run start:dev   # expect: Database connected
cd rackup-web && npm run dev
curl -s localhost:3000/api/v1/health
curl -s localhost:3000/api/v1/health/scorekeeping
cd rackup-backend && npm run test:smoke
# UI: /scorekeeping  /tournaments  /money  /coach
```
