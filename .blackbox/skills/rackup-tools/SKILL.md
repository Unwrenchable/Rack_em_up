---
name: rackup-tools
description: Tool skills for agents on the live RackUp codebase. Covers NestJS + React Auth V2, Matchmaking V2, Tournaments V2, Halls V2, Money Matches, ScorekeepingServiceV2 processReport entry point, RealAI, Elo, Redis V2 keys, and id-bridge. Trigger on rackup tools, scorekeeping, processReport, matchmaking v2, or /tool in RackUp.
---

# RackUp Tools (Live Codebase)

## Overview

Accurate tooling for the **completed RackUp repo** (P0+P1+P2 + **Phase 2 Integration Hooks**, 2026-08-05).

- `rackup-backend/` — NestJS API (TypeORM + Redis)
- `rackup-web/` — Vite + React
- RealAI — external HTTP only

## Core Principles

- Prefer real NestJS controllers / services.
- **Single report entry point:** `ScorekeepingServiceV2.processReport(MatchReportPayload)` after domain COMPLETED persist. Do not scatter Elo / memories / RealAI / Redis emit.
- Money matches require **stake dual-confirm** then **result dual-confirm** before side effects.
- Redis keys only via `src/common/redis-keys.ts` (re-export `redis-keys.v2.ts`).
- Canonical namespaces: `halls:v2:*`, `tournaments:v2:*`, `leagues:v2:*`, `matchmaking:v2:*`, `realai:v2:*`, `scorekeeping:v2:*`, `audit:v2:money:*`, `idbridge:v2:*`.

## Scorekeeping V2 (Phase 2)

```
Domain validates + persists COMPLETED
  → ScorekeepingServiceV2.processReport
    → Elo, memories (std/money), Redis events, RealAI job, socket score_update, money audit
```

| Domain | File |
|--------|------|
| standard | `matches.service.ts` reportResult |
| money | `money-matches.service.ts` complete (after dual result confirm) |
| tournament_v2 | `tournaments-v2.service.ts` reportMatch |
| league_v2 | `leagues-v2.service.ts` reportMatch |

Health: `GET /health/scorekeeping` → lastReport, pendingRealAiJobs, recentEventCount.

## Live Categories

1. **Auth V2** — signup/login/refresh/logout/sessions  
2. **Users** — me, public profiles, stats, leaderboard  
3. **Matchmaking V2** — search/cancel/confirm/status (Redis + haversine)  
4. **Scorekeeping V2** — processReport only for post-report side effects  
5. **Money** — create/confirm/dispute/complete (dual result + audit)  
6. **Tournaments V2** — create/register/start/report/bracket/standings (+ id-bridge resolve)  
7. **Leagues V2** — seasons, standings (V1 id via bridge), schedule/report  
8. **Halls V2** — checkin/out, feed, events, photos, leaderboard, Vegas seed  
9. **Chat/Social** — ChatGateway JWT + Redis presence, friends, action board, notifs, reports  
10. **RealAI / SOTD** — coach, match-summary jobs, 52 maps, training fallback  
11. **Ops** — health, scorekeeping health, id-bridge, legacy Redis migrate on boot  

## Frontend V2 stubs (`api.ts`)

`mmV2Search/Confirm/Cancel/Status`, `hallV2CheckIn/Out/Feed`, `tournamentV2Bracket/ReportMatch/Standings`, `fetchScorekeepingHealth`, `resolveIdBridge`.

## Safety

- Never complete money Elo/memories/RealAI without both players confirming the same scores.  
- Dual-confirm stake then result; audit every money state change.  
- RealAI offline → catalog/rules fallback.  
- ID bridges required when UI still passes V1 league/tournament ids.

## Boundary (not done)

Escrow, streaming, push, PostGIS, S3 multi-node photos, premium, full DE grand-final reset, vision AI.
