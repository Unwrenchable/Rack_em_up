---
name: rackup-v2-ecosystem
description: Full V2 ecosystem architecture for Rack ’em Up. Ensures parallel, non-breaking modules for Halls V2, Tournaments V2, Leagues V2, RealAI V2, and Matchmaking V2. Enforces V2 isolation, entity patterns, Redis usage, rating normalization, shot visualization, and seeding logic.
---

# Rack ’em Up V2 Ecosystem Skill

## Global Rules
- Never modify any v1 modules, entities, gateways, or endpoints.
- All V2 modules must be parallel, isolated, and non-breaking.
- All V2 routes must be under `/api/v1/<module>/v2/...`.
- All new entities must be added to `src/config/ormconfig.ts`.
- All new modules must be imported in `src/app.module.ts`.
- Use DTOs with class-validator + class-transformer.
- Redis keys must follow namespaced patterns:  
  - `mm:v2:*`  
  - `halls:v2:*`  
  - `leagues:v2:*`  
  - `realai:v2:*`
- Never modify WebSocket gateways unless explicitly instructed.

===========================================================
HALL ECOSYSTEM V2
===========================================================

## Instructions
Create new module under `src/halls/v2`:
- `halls-v2.module.ts`
- `halls-v2.controller.ts`
- `halls-v2.service.ts`

Add new entities:
- `HallCheckIn`
- `HallEvent`
- `HallPhoto`
- `HallAdmin`
- `HallLeaderboardEntry`

Integrate Las Vegas hall JSON:
- Add `src/halls/v2/seed/las-vegas-halls.json`
- Add `hall-seed.service.ts`
- Seed halls, tournaments, admins, events, leaderboard entries
- Add endpoint: `POST /api/v1/halls/v2/seed/vegas` (idempotent)

Add endpoints:
- `POST /checkin`
- `POST /checkout`
- `GET /feed/:hallId`
- `POST /events/create`
- `POST /events/update`
- `POST /photos/upload`
- `GET /leaderboard/:hallId`

Logic:
- Track check-ins/checkouts
- Aggregate hall feed (events, matches, photos, shot-of-the-day)
- Compute hall leaderboard (wins, ELO, activity)
- Manage hall admins

Do NOT modify v1 hall entity or endpoints.

===========================================================
TOURNAMENT ENGINE V2
===========================================================

## Instructions
Create new module under `src/tournaments/v2`:
- `tournaments-v2.module.ts`
- `tournaments-v2.controller.ts`
- `tournaments-v2.service.ts`
- `bracket-generation.service.ts`

Add new entities:
- `TournamentV2`
- `TournamentMatchV2`
- `BracketNode`
- `BracketRound`

Add endpoints:
- `POST /create`
- `POST /register`
- `POST /start`
- `POST /report-match`
- `GET /bracket/:tournamentId`
- `GET /rounds/:tournamentId`
- `GET /standings/:tournamentId`

Logic:
- Generate single/double elimination + round robin
- Auto-progress winners through bracket nodes
- Update standings + scoreboard

Do NOT modify v1 tournament entity or endpoints.

===========================================================
LEAGUE SYSTEM V2 (APA/Fargo Integration)
===========================================================

## Instructions
Create new module under `src/leagues/v2`:
- `leagues-v2.module.ts`
- `leagues-v2.controller.ts`
- `leagues-v2.service.ts`

Add new entities:
- `LeagueSeason`
- `LeagueStanding`
- `LeagueScheduledMatch`
- `ExternalRatingSource`
- `PlayerExternalRating`

Add endpoints:
- `POST /season/create`
- `POST /season/start`
- `GET /season/:seasonId/standings`
- `POST /season/:seasonId/schedule-match`
- `POST /season/:seasonId/report-match`
- `POST /ratings/import`
- `GET /ratings/player/:playerId`

Logic:
- Season creation + scheduling
- Weekly rotation
- Standings calculation (wins, losses, ELO delta, external ratings)
- Import APA/Fargo ratings
- Normalize ratings into unified “Rack ’em Up Rating”
- Region claiming for organizers
- Monetization hooks (fees, qualifiers, national/world events)

Do NOT modify v1 league entity or endpoints.

===========================================================
REALAI V2 (Coach, Insights, Shot-of-the-Day)
===========================================================

## Instructions
Create new module under `src/realai/v2`:
- `realai-v2.module.ts`
- `realai-v2.controller.ts`
- `realai-v2.service.ts`

Add endpoints:
- `POST /coach`
- `POST /match-summary`
- `POST /player-insights`
- `POST /shot-of-the-day`

Shot-of-the-day:
Input:
- table layout
- ball positions
- cue ball position
- intended path

Output:
- human-readable description
- structured diagram JSON:
  - ball coordinates
  - cue ball path segments
  - object ball final positions

Integration:
- halls feed
- league summaries
- tournament summaries

Use REALAI_BASE_URL + REALAI_MODEL.

Do NOT modify v1 RealAI integration.

===========================================================
MATCHMAKING V2 (Redis + ELO + Hall Proximity)
===========================================================

## Instructions
Use Redis queues:
- `mm:v2:queue`
- `mm:v2:pending`
- `mm:v2:active`

Entities:
- `MatchmakingRequestV2`
- `MatchmakingSessionV2`

Endpoints:
- `POST /search`
- `POST /cancel`
- `POST /confirm`
- `GET /status/:sessionId`

Logic:
- ELO-based pairing
- hall proximity matching
- pending confirmation flow
- TTL expiration

Do NOT modify v1 matchmaking gateway.

===========================================================
SHOT VISUALIZATION STANDARD
===========================================================

## Instructions
Use normalized table plane (0–100 x 0–50).
Balls:
- `{ id, x, y, radius }`
Cue path:
- array of `{ fromX, fromY, toX, toY }`
Final positions:
- array of ball objects

Output must be JSON-serializable for frontend rendering.

===========================================================
RATING NORMALIZATION
===========================================================

## Instructions
Normalize APA/Fargo/local ratings into unified “Rack ’em Up Rating”.
Store in `PlayerExternalRating`.
Use in:
- matchmaking
- leagues
- tournaments
- hall leaderboards

Formula must be deterministic and documented.

===========================================================
SEEDING
===========================================================

## Instructions
Seed Vegas halls via JSON.
Seed must be idempotent.
Expose `/seed/<region>` endpoints.

===========================================================
SCOREKEEPING
===========================================================

## Instructions
Track:
- racks
- fouls
- frame-by-frame events
- shot-of-the-day candidates

Integrate with:
- tournament standings
- league standings
- RealAI match-summary

Do NOT modify v1 match entity.

---
## Examples

### Example: Adding a V2 module
- Create `src/halls/v2/halls-v2.module.ts`
- Add entities to `ormconfig.ts`
- Add module to `app.module.ts`
- Add routes under `/api/v1/halls/v2/...`

### Example: Adding a V2 entity
- Create `HallCheckIn` with `userId`, `hallId`, `checkedInAt`, `checkedOutAt`
- Register in `ormconfig.ts`

### Example: Adding a V2 endpoint
- `POST /api/v1/tournaments/v2/create` → creates `TournamentV2` + bracket

