---
name: rackup-leagues-v2
description: League seasons, APA/Fargo rating integration, and standalone league ecosystem.
---

# Rackup Leagues V2

## Instructions
- **Module:** Create `src/leagues/v2` module, controller, and service.
- **Entities:** `LeagueSeason`, `LeagueStanding`, `LeagueScheduledMatch`, `ExternalRatingSource`, `PlayerExternalRating`.
- **Endpoints:**
  - `POST /season/create`, `/season/start`
  - `GET /season/:seasonId/standings`
  - `POST /season/:seasonId/schedule-match`
  - `POST /season/:seasonId/report-match`
  - `POST /ratings/import`
  - `GET /ratings/player/:playerId`
- **Rating Integration:**
  - Store APA/Fargo/etc. ratings per player.
  - Implement a normalization function to compute unified “Rack ’em Up Rating”.
- **Ecosystem:**
  - Allow leagues to be “claimed” by organizers (region ownership).
  - Leave hooks for monetization (fees, qualifiers, national/world events).
- **Do not touch:** v1 League entity, v1 league endpoints, tournament modules.

## Examples
- Implement `POST /api/v1/leagues/v2/ratings/import` that ingests APA/Fargo CSV/JSON.
- Implement `GET /api/v1/leagues/v2/ratings/player/:playerId` returning all sources + normalized rating.
- Implement `GET /api/v1/leagues/v2/season/:seasonId/standings` sorted by normalized rating + results.
