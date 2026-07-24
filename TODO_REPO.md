# RackUp — Unified Repo-Wide TODO (Production Readiness)

This file consolidates all remaining backend, frontend, V2, RealAI, Redis, runtime, infra, and production-hardening tasks. Every item is concrete, actionable, and mapped to file paths.

---

## 🟥 P0 — Critical (Must Complete Before Launch)

### Backend
- [ ] Scorekeeping V2 Hooks  
  Files: src/halls/v2/halls.service.ts, src/tournaments/v2/tournaments.service.ts, src/leagues/v2/leagues.service.ts  
  Action: Add emitScoreUpdate() after match reports; create scorekeeping.service.ts.

- [ ] RealAI V2 Summary Integration  
  Files: src/realai/v2/realai.service.ts, halls/tournaments/leagues controllers  
  Action: Add summary job submission + webhook handler.

- [ ] Redis V2 Namespaces  
  Files: src/common/redis.service.ts  
  Action: Implement namespaced keys:  
    halls:v2:{id}:*  
    tournaments:v2:{id}:*  
    leagues:v2:{id}:*  
    matchmaking:v2:{id}:*  
    realai:v2:{id}:*

- [ ] DB Connection Verification  
  Files: src/health/health.controller.ts  
  Action: Add "Database connected" check.

### Frontend
- [ ] Wire Demo → Live APIs  
  Files: src/lib/api.ts, src/pages/FindPage.tsx, src/pages/PlayPage.tsx, src/pages/SocialPage.tsx  
  Action: Remove demo fallbacks; ensure live-mode returns [] on error.

- [ ] Tournament Register Confirm Flow  
  Files: src/pages/PlayPage.tsx  
  Action: Wire to POST /tournaments/:id/register.

---

## 🟧 P1 — High Priority

### Backend
- [ ] Unified Rating Normalization  
  Files: src/leagues/v2/normalization.ts  
  Action: Apply consistent rating updates across V2 modules.

- [ ] Full V2 Route Verification  
  Files: tests/smoke/v2-routes.spec.ts  
  Action: Add authenticated smoke tests.

- [ ] TypeORM Migrations  
  Files: ormconfig.ts, migrations/*  
  Action: Disable synchronize in non-dev; add migration scripts.

- [ ] Global Throttler  
  Files: src/app.module.ts  
  Action: Add @nestjs/throttler for auth/money/chat.

- [ ] Structured Logging + Correlation IDs  
  Files: src/main.ts, src/common/logger.service.ts  
  Action: Add pino/winston + middleware.

### Frontend
- [ ] Money Complete Score UI  
  Files: src/pages/MoneyMatchPage.tsx  
  Action: Wire to POST /money-matches/:id/complete.

- [ ] League Standings Live API  
  Files: src/pages/PlayPage.tsx  
  Action: Replace demo toast with real standings fetch.

- [ ] Friends Display Names  
  Files: src/components/FriendsList.tsx  
  Action: Hydrate via GET /users/:id.

---

## 🟨 P2 — Medium Priority

### Backend
- [ ] E2E Tests  
  Files: tests/e2e/*  
  Action: Add tests for halls/tournaments/leagues/matchmaking/realai.

### Frontend
- [ ] SOTD Streak Tracking  
  Files: src/pages/ShotOfTheDay.tsx  
  Action: Add “I made it” button + streak UI.

- [ ] Shot Catalog Browser  
  Files: src/pages/ShotsCatalog.tsx  
  Action: Add filters + pagination.

---

## 🟩 P3 — Optional / Future

### Backend
- [ ] RealAI multimodal vision  
- [ ] RealAI multi-agent tasks  
- [ ] Escrow (Stripe/PayPal)  
- [ ] Push notifications  
- [ ] PostGIS heat maps  

### Frontend
- [ ] Chat JWT auth  
- [ ] Premium tier UI  

---

## 📁 Files to Update
- CURRENT_STATUS.md  
- rackup-backend/PROJECT_TODO.md  
- rackup-backend/TODO.md  
- MEGA_STATUS_REPORT.md  
- TODO_REPO.md (this file)

