RackUp MEGA STATUS REPORT (for repo — alternate route)
Overview
This document is the authoritative, repo‑ready MEGA STATUS REPORT to add to the RackUp repository. It uses the existing living docs (CURRENT_STATUS.md, rackup-backend/PROJECT_TODO.md, rackup-backend/TODO.md, and frontend TODO notes) as the baseline and reframes the work into a single, actionable plan for moving RackUp from V2 scaffolding to production readiness. The report is organized for direct use in the repo: copy into MEGA_STATUS_REPORT.md or docs/MEGA_STATUS_REPORT.md.

Completed Summary
High level: RackUp is functionally complete across V1 and V2 scaffolding and core product surfaces. TypeScript compiles clean and the web UI builds under Vite.

Key completed items

Auth / Users / JWT / RBAC — implemented.

Matchmaking V1 and Matchmaking V2 (Redis queue, haversine pairing) — implemented.

Tournaments V1 / V2 — list endpoints and bracket generation implemented.

Leagues V1 / V2 — list endpoints, rating normalization helpers implemented.

Money matches, standard matches, match memories, friends, action board, notifications, reports — implemented.

Halls V1 / V2 — check-in/out, pulse, Vegas seed endpoint implemented.

RealAI provider client and RealAI V2 endpoints (coach, match-summary, player-insights, SOTD DTOs) — implemented with offline fallback.

Shot of the Day — 52-shot catalog, non-repeat cycle, API endpoints and UI diagrams implemented.

Frontend core pages — Home, Find, Play, Social, Chat, Halls, Coach, Memories, Notifications, Profile, Settings; demo mode present.

Infra — docker-compose.yml (Postgres + Redis), .env.example, health checks for DB/Redis/RealAI.

Remaining Work (grouped, concrete, actionable)
Each item below includes where to change code and what to implement. Items are grouped by priority and domain.

Integration Hooks (Phase 2) — P0–P1
Scorekeeping V2 hooks

Files: rackup-backend/src/halls/v2/halls.service.ts, rackup-backend/src/tournaments/v2/tournaments.service.ts, rackup-backend/src/leagues/v2/leagues.service.ts

Action: Add emitScoreUpdate() calls after match reports; implement scorekeeping.v2 event handlers in a new scorekeeping service (rackup-backend/src/scorekeeping/scorekeeping.service.ts) to persist and forward scores to hall/league/tournament feeds.

RealAI V2 summary integration

Files: rackup-backend/src/realai/v2/realai.service.ts, rackup-backend/src/halls/v2/halls.controller.ts, rackup-backend/src/tournaments/v2/tournaments.controller.ts, rackup-backend/src/leagues/v2/leagues.controller.ts

Action: Add endpoints that call RealAI summary endpoints on feed events; implement queued job submission and fallback handling.

Redis V2 namespaces

Files: rackup-backend/src/common/redis.service.ts or redis.module.ts

Action: Standardize keys: halls:v2:{hallId}:*, tournaments:v2:{tournamentId}:*, leagues:v2:{leagueId}:*, matchmaking:v2:{sessionId}:*, realai:v2:{jobId}:*. Add helper functions keyForHallV2(hallId, suffix).

Build + Test (Phase 3) — P0–P2
DB connection verification

Files: rackup-backend/src/health/health.service.ts and health.controller.ts

Action: Add explicit DB connection check that returns "Database connected" when TypeORM connection is healthy.

V2 route verification

Files: tests/smoke/v2-routes.spec.ts

Action: Add authenticated smoke tests for /api/v1/*/v2 endpoints.

Runtime tests

Files: tests/e2e/tournaments.v2.spec.ts, tests/e2e/leagues.v2.spec.ts, tests/e2e/halls.v2.spec.ts, tests/e2e/matchmaking.v2.spec.ts, tests/e2e/realai.v2.spec.ts

Action: Implement Jest + supertest flows that create/register/start/report and assert standings/brackets/feeds.

Production Hardening (P4) — P1–P3
Global throttler

Files: rackup-backend/src/app.module.ts, rackup-backend/src/common/throttler.config.ts

Action: Add @nestjs/throttler with sensible defaults and per-route overrides for auth/money/chat.

TypeORM migrations

Files: ormconfig.ts, migrations/*

Action: Add migration scripts, set synchronize: false in non-dev env, add npm run migrate.

Structured logging and correlation IDs

Files: rackup-backend/src/main.ts, rackup-backend/src/common/logger.service.ts

Action: Integrate pino or winston with request correlation middleware that injects x-correlation-id.

Seed script

Files: scripts/seed-demo.ts, package.json scripts

Action: Create idempotent seed script for demo halls, users, and SOTD completions.

Frontend Polish (P6) — P1–P3
Wire demo-to-live flows

Files: rackup-web/src/lib/api.ts, rackup-web/src/pages/PlayPage.tsx, rackup-web/src/pages/FindPage.tsx, rackup-web/src/pages/SocialPage.tsx

Action: Replace demo fallbacks with real API calls guarded by isDemoMode(). Ensure fetchLookingPlayers, fetchFriends, tournament register, and league standings call live endpoints and handle errors gracefully.

Money complete score UI

Files: rackup-web/src/pages/MoneyMatchPage.tsx, rackup-web/src/lib/api.ts

Action: Implement UI to POST /money-matches/:id/complete and show confirmation/dispute flows.

SOTD “I made it” + streak

Files: rackup-web/src/pages/ShotOfTheDay.tsx, rackup-backend/src/realai/v2/sotd.service.ts

Action: Add endpoint to record completion and increment streak; show streak UI and badge.

Shot catalog browser

Files: rackup-web/src/pages/ShotsCatalog.tsx, rackup-web/src/lib/api.ts

Action: Implement filters (difficulty, category) and pagination.

Friends display names

Files: rackup-web/src/components/FriendsList.tsx, rackup-web/src/lib/api.ts

Action: Hydrate friend entries with GET /users/:id display name.

Future Items (P7)
RealAI multimodal vision, multi-agent tasks, escrow, streaming, push notifications, PostGIS heat maps, premium billing — document only in TODO_REPO.md for later phases.

Prioritized Next Steps (concrete, ordered)
Runtime foundation (Immediate, P0)

docker compose up -d → start Postgres + Redis.

Add DB connection verification endpoint and smoke test.

Add Redis V2 key helpers and migrate any ephemeral keys to namespaced keys.

Integration hooks (High, P0–P1)

Implement scorekeeping.service.ts and wire emitScoreUpdate() in match report flows.

Add RealAI summary job submission on hall/tournament/league feed events.

V2 verification and tests (High, P1)

Add Jest + supertest e2e tests for V2 flows; run in CI.

Add authenticated smoke tests for /api/v1/*/v2.

Production hardening (Medium, P1–P2)

Add throttler, structured logging, correlation IDs, and TypeORM migrations.

Create seed script and CI job to run migrations + seed on staging.

Frontend polish and release candidate (Medium, P2)

Wire demo-to-live flows, money complete UI, SOTD streak, and catalog browser.

Run Vite build and fix any regressions.

CI and PR flow (Low, P2)

Add GitHub Actions pipeline: lint, build, test:e2e, migrate:ci, seed:ci.

Create branch prod-ready/integration-hardening and open PR with atomic commits.

Implementation Plan and PR Strategy
Branching: create prod-ready/integration-hardening as the integration branch. Implement work in small feature branches named feat/v2-scorekeeping, feat/realai-summary, chore/redis-namespaces, test/v2-e2e, feat/frontend-sotd-streak, etc.

Commits: keep commits atomic and descriptive. Example:

feat(scorekeeping): add scorekeeping service and emitScoreUpdate hook

chore(redis): add v2 key helpers and migrate keys

test(e2e): add tournaments.v2 runtime test

feat(frontend): wire tournament register to POST /tournaments/:id/register

PR checklist:

All new code has unit tests.

E2E tests pass locally and in CI.

Lint and TypeScript checks pass.

Migration scripts included and tested.

Seed script idempotent and documented.

Logging and correlation IDs present.

CI: GitHub Actions with matrix for Node versions; include a job to run docker-compose services for e2e tests.

TODO_REPO.md (root) — content outline to add now
Create TODO_REPO.md at repo root with the following structure and entries (copy/paste into file):

Title: TODO_REPO.md — RackUp Repo Wide TODO

Sections:

Backend (Integration + Hardening)

P0 rackup-backend/src/scorekeeping/scorekeeping.service.ts — implement scorekeeping service; wire emitScoreUpdate() in matches.report() flows.

P0 rackup-backend/src/common/redis.service.ts — add keyForHallV2, keyForTournamentV2, keyForLeagueV2, keyForMatchmakingV2, keyForRealaiV2.

P0 rackup-backend/src/realai/v2/realai.service.ts — add submitSummaryJob() and webhook handler.

P1 rackup-backend/src/health/health.controller.ts — add DB connection verification endpoint.

P1 ormconfig.ts + migrations/* — add migrations and disable synchronize in non-dev.

P1 rackup-backend/src/main.ts — integrate pino/winston and correlation middleware.

P1 rackup-backend/src/common/throttler.config.ts — add throttler config and apply to routes.

Frontend (Polish)

P1 rackup-web/src/lib/api.ts — ensure live-mode returns [] on errors and remove DEMO_* fallbacks.

P1 rackup-web/src/pages/PlayPage.tsx — wire tournament register confirm flow to POST /tournaments/:id/register.

P1 rackup-web/src/pages/MoneyMatchPage.tsx — implement complete score UI and POST /money-matches/:id/complete.

P1 rackup-web/src/pages/ShotOfTheDay.tsx — add “I made it” button and streak UI; call POST /realai/v2/sotd/complete.

P2 rackup-web/src/pages/ShotsCatalog.tsx — implement filters and pagination.

Integration Hooks

P0 Add hall feed → tournament/league/realai wiring in halls.v2 feed processor.

P0 Add job queue for RealAI summary jobs (Redis queue or Bull).

Runtime / Infra

P0 Add Redis V2 namespace population tests.

P0 Add scripts/seed-demo.ts.

P1 Add CI job to run migrations and seed on staging.

Production Hardening

P1 Add global throttler.

P1 Add structured logging and correlation IDs.

P1 Add Jest + supertest e2e tests.

Future

P7 Document RealAI multimodal vision and multi-agent tasks.

P7 Document escrow and streaming plans.

Add checkboxes for each item and include file path, function/endpoint, and priority.

Final notes and immediate actions you can commit now
Add MEGA_STATUS_REPORT.md to repo root with this content.

Create TODO_REPO.md using the outline above and commit it as chore(todo): add TODO_REPO.md.

Create branch prod-ready/integration-hardening and push the initial TODO and MEGA report.

Start with P0 tasks: add Redis key helpers and DB connection verification endpoint in a small PR chore/runtime: add redis key helpers and db health check. Run npm run build and npm test in CI.