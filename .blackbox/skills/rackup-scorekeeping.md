---
name: rackup-scorekeeping
description: Standardized scorekeeping for leagues and tournaments with standings integration.
---

# Rackup Scorekeeping

## Instructions
- **Data:** Track frame-by-frame results, racks, fouls, and potential shot-of-the-day candidates.
- **Integration:** Feed score data into:
  - tournament standings
  - league standings
  - RealAI match-summary
- **Format:** Use structured JSON for match timelines (events array with timestamps and actions).
- **Do not touch:** v1 match entity; add V2-specific scorekeeping where needed.

## Examples
- Implement a `report-match` payload that includes per-rack scores and fouls.
- Use scorekeeping data to update `TournamentMatchV2` and `LeagueStanding`.
- Pass match timeline to `POST /api/v1/realai/v2/match-summary` for AI analysis.
