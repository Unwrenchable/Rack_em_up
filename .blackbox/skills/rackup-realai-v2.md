---
name: rackup-realai-v2
description: RealAI coach, match insights, and shot-of-the-day diagram data.
---

# Rackup RealAI V2

## Instructions
- **Module:** Create `src/realai/v2` module, controller, and service.
- **Endpoints:**
  - `POST /coach`
  - `POST /match-summary`
  - `POST /player-insights`
  - `POST /shot-of-the-day`
- **Shot-of-the-day:**
  - Input: table layout, ball positions, cue ball position, intended path.
  - Output:
    - human-readable description
    - structured diagram JSON:
      - ball coordinates
      - cue ball path segments
      - object ball final positions
- **Integration:**
  - Use `REALAI_BASE_URL` and `REALAI_MODEL` env vars.
  - Allow leagues, tournaments, and halls to call these endpoints for summaries and shots.
- **Do not touch:** existing RealAI v1 integration, match/tournament modules, gateways.

## Examples
- Implement `POST /api/v1/realai/v2/shot-of-the-day` returning both text and diagram JSON.
- Implement `POST /api/v1/realai/v2/match-summary` that takes match timeline and returns AI analysis.
- Implement `POST /api/v1/realai/v2/coach` that suggests drills based on player stats.
