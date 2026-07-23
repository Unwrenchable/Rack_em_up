# Rack ’em Up Backend - V2 Roadmap TODO

This file tracks implementation progress for the V2 ecosystem.

## Phase 1: Project scaffolding (Halls/Tournaments/Leagues/RealAI V2 modules)
- [x] Create halls v2 module/controller/service + entities + DTOs
- [x] Add Vegas hall seed JSON + idempotent vegas seed endpoint
- [x] Wire halls v2 into app.module.ts
- [x] Register halls v2 entities into ormconfig.ts

- [x] Create tournaments v2 module/controller/service + bracket generation
- [x] Wire tournaments v2 into app.module.ts
- [x] Register tournaments v2 entities into ormconfig.ts

- [x] Create leagues v2 module/controller/service + rating normalization helpers + external rating storage
- [x] Wire leagues v2 into app.module.ts
- [x] Register leagues v2 entities into ormconfig.ts

- [x] Create realai v2 module/controller/service + shot-of-the-day structured diagram DTOs
- [x] Wire realai v2 into app.module.ts
- [x] Register realai v2 entities (if any) into ormconfig.ts

- [x] Create matchmaking v2 module/controller/service + entities
- [x] Wire matchmaking v2 into app.module.ts
- [x] Register matchmaking v2 entities into ormconfig.ts

## Phase 2: Integration hooks (non-breaking) — NOT STARTED
- [ ] Scorekeeping V2 hooks for halls, tournaments, league reporting
- [ ] RealAI V2 integration for hall/tournament/league summary endpoints
- [ ] Redis V2 namespaces for halls/tournaments/leagues/matchmaking/realai
- [ ] Cross-module wiring (hall feed → tournament/league/realai)
- [ ] Unified rating normalization across V2 modules

## Phase 3: Build + test — NOT STARTED
- [ ] DB connection verification ("Database connected")
- [ ] Authenticated V2 smoke tests
- [ ] Tournament V2 runtime tests (create, register, start, bracket gen, report match, standings)
- [ ] League V2 runtime tests (create season, start, schedule match, report match, standings, ratings import)
- [ ] Hall V2 leaderboard/feed tests (check-in, checkout, feed, leaderboard, Vegas seed)
- [ ] Matchmaking V2 queue/session tests (search, cancel, confirm, status)
- [ ] RealAI V2 shot-of-the-day + match-summary + player-insights tests (requires RealAI running)
- [ ] Redis namespace population tests
- [x] npx tsc --noEmit passes clean (code compiles)
- [ ] npm run start:dev and verify routes under /api/v1/*/v2
