---
name: rackup-tournaments-v2
description: Full tournament engine with brackets and standings.
---

# Rackup Tournaments V2

## Instructions
- **Module:** Create `src/tournaments/v2` module, controller, service, and `bracket-generation.service.ts`.
- **Entities:** `TournamentV2`, `TournamentMatchV2`, `BracketNode`, `BracketRound`.
- **Endpoints:**
  - `POST /create`, `/register`, `/start`, `/report-match`
  - `GET /bracket/:tournamentId`
  - `GET /rounds/:tournamentId`
  - `GET /standings/:tournamentId`
- **Logic:**
  - Generate single/double elimination and round robin brackets.
  - Progress winners through `BracketNode` graph.
  - Update standings and scoreboard on match report.
- **Do not touch:** v1 Tournament entity, v1 tournament endpoints, match entity, gateways.

## Examples
- Implement `POST /api/v1/tournaments/v2/create` that creates `TournamentV2` and initial bracket.
- Implement `GET /api/v1/tournaments/v2/bracket/:tournamentId` returning bracket tree.
- Implement `GET /api/v1/tournaments/v2/standings/:tournamentId` returning ordered player standings.
