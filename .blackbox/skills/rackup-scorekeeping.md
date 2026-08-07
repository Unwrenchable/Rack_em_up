---
name: rackup-scorekeeping
description: Standardized scorekeeping for leagues and tournaments with standings integration.
---

# Rackup Scorekeeping

**STATUS: implemented (Phase 3C)** — deep timelines live under `scorekeeping/v2`.

## Live surface
- Entity: `MatchTimelineEntity` (`match_timelines`)
- Service: `MatchTimelineService` + `ScorekeepingServiceV2.processReport` finalizes timelines
- API:
  - `POST /api/v1/scorekeeping/v2/timeline/start`
  - `POST /api/v1/scorekeeping/v2/timeline/event`
  - `GET /api/v1/scorekeeping/v2/timeline/:matchId`
  - `GET /api/v1/scorekeeping/v2/sotd-candidates`
- Redis: `scorekeeping:v2:timeline:{matchId}`, `scorekeeping:v2:sotd_candidates:{day}`
- Events: break, rack_won, foul, shot, ball_pocketed, sotd_candidate, score_tick, match_end, …
- RealAI: processReport attaches timeline summary + keyShots to summary jobs
- Hall feed: match complete / rack events pushed to `halls:v2:{id}:feed`

## Instructions (agents)
- Prefer timeline events during live play; never scatter Elo outside processReport.
- Mark hard/bank/jump/combo shots via `data` for SOTD candidate detection.
- Do not modify v1 match entity.

## Examples
- Append foul: `POST …/timeline/event` `{ matchId, type: "foul", playerId, rack: 2 }`
- Complete match → processReport auto-finalizes timeline with `match_end`.
