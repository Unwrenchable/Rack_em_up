# Rack ability map

RackUp owns persistence and UI. RealAI owns skill math, moderation, coaching, SOTD, pyramid rules.

Canonical provider: `POST {REALAI_BASE_URL}/v1/plugins/rackup-coach`
App gate: `POST /api/v1/realai/v2/coach-plugin` (JWT)

## Envelope

```json
{
  "ability": "coach",
  "goal": "optional human goal",
  "organs_enabled": true,
  "player": {
    "player_id": "uuid",
    "display_name": "AtomicFizz",
    "rating": 500,
    "rd": 175,
    "volatility": 0.06,
    "discipline": "nine_ball",
    "hall_id": "optional"
  },
  "payload": {}
}
```

HTTP 200 + `ok: false` is a logical miss, not a transport error.

## Abilities

| Ability | Use | Payload notes |
|---|---|---|
| `coach` | Advice, drill, pattern | `question`, `game`, `miss`, `table_size` |
| `shot_of_the_day` / `sotd` | Daily shot | Optional `difficulty`, `category` |
| `sotd_contribute` | Player submits a shot | Map + notes |
| `video_analysis` | Clip notes | Vision pipeline not fully live |
| `matchmaking` / `matchmaking_support` | Rank candidates | RackUp pre-filters geo; send `candidates`, `window` |
| `rating_update` / `post_match_rating` / `skill_update` | Glicko-2 | `won`, opponent rating/rd/vol, scores, `match_id` |
| `rating_convert` / `convert_rating` / `league_convert` | Fargo/APA/BCA/TAP/VNEA to seed | `from_system`, `from_value` |
| `league_validate` / `league_score` / `score_validate` | ROC / league sheet | Standings payload |
| `moderation` / `moderate` / `chat_moderation` | Chat text | `text`, `context.channel` |
| `pyramid` / `pyramid_rules` | Challenge ladder | Skill + scores |
| `tournament` | Bracket commentary | No silent re-seed |
| `hall_context` | Who is on the felt | Honor privacy |
| `rating_intel` | Trend / clutch read | Read-only |
| `ledger_audit` / `payout_sanity` / `money_anomaly` | Flag weird money | Never auto-payout |

## Offline

- SOTD structured maps: `GET /api/v1/realai/v2/sotd/maps`
- Coach catalog fallback inside RealaiV2Service
- Moderation down → allow + `moderation_offline_allow` tag (delayed queue)

## Never from the bot

- Write Elo without a completed, dual-confirmed result
- Clear `globalThis.fetch`
- Move cash / invent escrow
