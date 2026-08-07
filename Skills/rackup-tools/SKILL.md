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
- **Single report entry point:** `ScorekeepingServiceV2.processReport(MatchReportPayload)` after domain COMPLETED persist.
- Money matches require stake dual-confirm then result dual-confirm before side effects.
- Redis keys only via `src/common/redis-keys.ts` / `redis-keys.v2.ts`.

## Scorekeeping V2

Domain persist COMPLETED → `ScorekeepingServiceV2.processReport` → Elo, memories, Redis, RealAI job, socket `score_update`, money audit.

Health: `GET /health/scorekeeping`.

## Boundary

Escrow, streaming, push, PostGIS, S3, premium, full DE grand-final reset, vision AI — not implemented.
