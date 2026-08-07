# RackUp Live Domain Reference (2026-08-05)

## Repo Layout
- `rackup-backend/` — NestJS + TypeORM + Redis
- `rackup-web/` — Vite + React
- RealAI — external OpenAI-compatible provider only

## Completed Tracks
- P0 / P1 / P2 — Done
- Phase 2 Integration Hooks — Done

## Scorekeeping V2 (single entry)
- `ScorekeepingServiceV2.processReport(MatchReportPayload)`
- Domains: `standard` | `money` | `tournament_v2` | `league_v2`
- Side effects: Elo, memories (std/money), Redis `scorekeeping:v2:*`, RealAI summary job, socket `score_update`, money audit

## Money dual-confirm
1. Stake confirms → ACTIVE
2. First score propose → pendingResult
3. Second same scores → COMPLETED + processReport
4. Audit Redis `audit:v2:money:*`

## ID bridge
- Entity `id_bridges` + `IdBridgeService`
- `GET /id-bridge/:kind/v1/:id` · `POST /id-bridge/link`
- Used by league standings / tournament bracket resolve

## Redis Canonical Namespaces
- `halls:v2:*` · `tournaments:v2:*` · `leagues:v2:*`
- `matchmaking:v2:*` · `realai:v2:*` · `scorekeeping:v2:*`
- `audit:v2:money:*` · `idbridge:v2:*`

## Out of Scope
Escrow, streaming, push, PostGIS, S3 multi-node photos, premium, full DE grand-finals reset, vision AI.
