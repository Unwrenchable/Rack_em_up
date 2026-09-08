---
name: rackup-tools
description: Tool skills for SuperGrok and Blackbox agents working on the live RackUp codebase. Covers the real NestJS + React surface including Auth V2, Matchmaking V2 Redis queue, Tournaments V2 double-elim, Halls V2, Money Matches, Leagues V2, ChatGateway, Scorekeeping, RealAI client, Elo, and full V1+V2 modules. Trigger on rackup tools, pool tools, matchmaking v2, tournament tools, or /tool commands in the RackUp project.
---

# RackUp Tools (Live Codebase)

Status 2026-09-08. Same construction as `Skills/rackup-tools/`.

- RealAI is external HTTP only: `POST {REALAI_BASE_URL}/v1/plugins/rackup-coach`
- App gate: `POST /api/v1/realai/v2/coach-plugin`
- Express 4.22.2. Keep `globalThis.fetch`.
- Do not run cavity / phase / monorepo scanners in this repo.
