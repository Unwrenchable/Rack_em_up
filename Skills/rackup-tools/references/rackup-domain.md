# RackUp Live Domain Reference (2026-09-08)

## Repo Layout
- `rackup-backend/` — NestJS 10 + TypeORM + Redis + Express 4.22.2
- `rackup-web/` — Vite + React
- RealAI — external HTTP provider only. Not vendored. Not the RealAI monorepo.

## RealAI / Training / SOTD
- Canonical: `POST {REALAI_BASE_URL}/v1/plugins/rackup-coach`
- App: `POST /api/v1/realai/v2/coach-plugin`
- `/v1/chat/completions` is training fallback only
- `/health` check + offline SOTD catalog (`GET /api/v1/realai/v2/sotd/maps`)
- Coach, match-summary, player-insights, 52 SOTD maps, streak
- Glicko-2 via `rating_update` (ladder `roc_glicko2`). Do not invent deltas.

## Redis Canonical Namespaces
- `halls:v2:*`
- `tournaments:v2:*`
- `leagues:v2:*`
- `matchmaking:v2:*`
- `realai:v2:*`
- `scorekeeping:v2:*`

## Explicitly Out of Scope (Do Not Implement as Done)
Escrow, streaming, push, PostGIS, S3 multi-node photos, premium/B2B, full RealAI vision, full double-elim grand-finals reset.
