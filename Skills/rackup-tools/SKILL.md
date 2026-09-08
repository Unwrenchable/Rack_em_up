---
name: rackup-tools
description: Tool skills for SuperGrok and Blackbox agents working on the live RackUp codebase. Covers the real NestJS + React surface including Auth V2, Matchmaking V2 Redis queue, Tournaments V2 double-elim, Halls V2, Money Matches, Leagues V2, ChatGateway, Scorekeeping, RealAI client, Elo, and full V1+V2 modules. Trigger on rackup tools, pool tools, matchmaking v2, tournament tools, or /tool commands in the RackUp project.
---

# RackUp Tools (Live Codebase)

## Overview

This skill equips agents with accurate tooling for the **actual completed RackUp repo** (status current as of 2026-09-08).
Repo layout:

- `rackup-backend/` — NestJS 10 API of record (TypeORM + Redis + Express 4.22.2)
- `rackup-web/` — Vite + React frontend
- RealAI — external HTTP provider only (not vendored, not the RealAI monorepo tree)

P0 + P1 + P2 are complete. The skill maps tools directly to the live modules instead of the original concept.

## Core Principles

- Prefer tools that call or mirror the real NestJS controllers / services.
- Always respect the dual-verification rule on money matches and result reporting.
- Use dry-run or sandbox mode for any write that touches Elo, standings, or money-match state.
- Location / check-in tools must honor player privacy settings.
- Redis key namespaces are canonical: `halls:v2:*`, `tournaments:v2:*`, `leagues:v2:*`, `matchmaking:v2:*`, `realai:v2:*`, `scorekeeping:v2:*`.

## Live Tool Categories (Mapped to Completed Modules)

### 1. Auth & Sessions (Auth V2 — Done)
- `auth_signup` / `auth_login` / `auth_refresh`
- `auth_logout` / `auth_logout_all`
- `list_sessions` / `revoke_session`
- `email_verify` / `password_reset`
- Web prefers V2 with V1 fallback; refresh token is stored when returned.

### 2. Users & Profiles (Done)
- `get_me` / `get_public_profile` / `batch_profiles`
- `get_player_stats` / `leaderboard`

### 3. Matchmaking V2 (Redis queue + haversine — Done)
- `mm_search` / `mm_cancel` / `mm_confirm` / `mm_status`
- Canonical Redis keys under `matchmaking:v2:*`

### 4. Standard Matches + Scorekeeping (Done)
- `create_match` / `get_match` / `report_match`
- Scorekeeping hooks + rating update on completion

### 5. Money Matches (Done)
- `money_create` / `money_confirm` / `money_dispute` / `money_complete`
- Dual confirmation required. Never auto-complete without both players.

### 6. Tournaments V2 (Done)
- single-elim, double-elim (winners + losers R1 + drop), round-robin
- create / register / start / report / bracket / standings

### 7. Leagues V2 (Done)
- seasons, standings, schedule/report, APA/Fargo → skill bands

### 8. Halls V2 (Done)
- list, live pulse, check-in/out, feed, events, photo upload, Vegas seed

### 9. Chat & Social (Done)
- ChatGateway Socket.IO + JWT + Redis presence + sanitize

### 10. Training / RealAI / Shot of the Day (Done)
- Canonical intelligence: `POST {REALAI_BASE_URL}/v1/plugins/rackup-coach`
- App gate: `POST /api/v1/realai/v2/coach-plugin` (JWT)
- Convenience: `/realai/v2/coach`, `/match-summary`, `/player-insights`, `/shot-of-the-day`, `/moderate`
- `/v1/chat/completions` is fallback only
- Offline SOTD maps: `GET /api/v1/realai/v2/sotd/maps`
- Ratings: RealAI owns `rating_update` on `roc_glicko2` / `glicko2_v1`. Local Elo only if `REALAI_FALLBACK_LOCAL_ELO=1`
- Keep `globalThis.fetch`. Do not import cavity scanners, overseer weights, or phase4/phase5 tools.

### 11. Infrastructure & Ops (Done)
- Health: DB + Redis + RealAI
- Docker Compose: Postgres 15 + Redis 7
- Express locked to 4.22.2

## Safety Rules

- Money matches need both players before ratings / memories fire.
- Never copy RealAI monorepo code (`cavity_scan`, `llama-vulkan`, `phase5_merge`) into this repo.
- Documented against the 2026-09-08 construction.
