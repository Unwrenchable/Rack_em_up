---
name: rackup-matchmaking-v2
description: Implement parallel matchmaking using Redis queues, ELO, and hall proximity.
---

# Rackup Matchmaking V2

## Instructions
- **Scope:** Implement matchmaking under `src/matchmaking/v2` only.
- **Redis Queues:** Use `mm:v2:queue`, `mm:v2:pending`, `mm:v2:active`.
- **Inputs:** Read player ELO from UsersService and hall lat/lon from Hall entity.
- **Flow:**
  - `/search`: enqueue player into Redis queue.
  - Pair candidates based on ELO + hall proximity.
  - Create `MatchmakingSessionV2` in PENDING state.
  - `/confirm`: confirm session; `/cancel`: cancel search.
  - `/status/:sessionId`: return current session state.
- **TTL:** Expire stale requests/sessions via Redis TTL or server-side checks.
- **Do not touch:** v1 matchmaking gateway, v1 match entity, v1 endpoints.

## Examples
- Add `matchmaking-v2.service.ts` that uses `RedisClient` from `redis.config.ts`.
- Implement `POST /api/v1/matchmaking/v2/search` that writes to `mm:v2:queue`.
- Implement `GET /api/v1/matchmaking/v2/status/:sessionId` returning session JSON.
