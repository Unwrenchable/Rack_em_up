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

### 10. Training / RealAI / Shot of the Day (Done)
- Canonical intelligence: `POST {REALAI_BASE_URL}/v1/plugins/rackup-coach`
- App gate: `POST /api/v1/realai/v2/coach-plugin` (JWT)
- Convenience: `/realai/v2/coach`, `/match-summary`, `/player-insights`, `/shot-of-the-day`, `/moderate`
- `/v1/chat/completions` is fallback only (training copy)
- Offline SOTD maps: `GET /api/v1/realai/v2/sotd/maps` (52 structured maps)
- Ratings: RealAI owns `rating_update` on `roc_glicko2` / `glicko2_v1`. Local Elo only if `REALAI_FALLBACK_LOCAL_ELO=1`
- Keep `globalThis.fetch`. Do not import cavity scanners, overseer weights, or phase4/phase5 tools.

## Safety Rules (Enforced by Live Code)

- Money match results require confirmation from **both** players before Elo / memories fire.
- Ratings are written only on completed standard / tournament / money matches, via RealAI `rating_update` when reachable.
- RealAI calls fall back to offline catalog when the external service is unreachable.
- Never copy RealAI monorepo code (`cavity_scan`, `llama-vulkan`, `phase5_merge`) into this repo.
- Never force-push or hard-reset without explicit confirmation.

## Validation Checklist

- [ ] Tool maps to an actual completed module or endpoint
- [ ] Dry-run / sandbox mode for any write path
- [ ] Respects dual-confirmation on money matches
- [ ] Uses correct Redis namespaces where applicable
- [ ] Handles RealAI offline fallback
- [ ] Documented against the 2026-09-08 status (Express 4.22.2 + rackup-coach plugin)
