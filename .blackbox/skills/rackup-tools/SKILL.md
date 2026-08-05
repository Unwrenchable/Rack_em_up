---
name: rackup-tools
description: Create manage and extend tool skills for Blackbox AI agents working on the RackUp pool-players app. Covers matchmaking tournaments leagues big-money matches chat friends stats hall check-ins reputation and full product tooling. Trigger on rackup tools, pool tools, blackbox rackup, match tools, tournament tools, or /tool commands inside the RackUp project.
---

# RackUp Tools

## Overview

This skill gives Blackbox agents a complete, structured toolkit for building and operating the RackUp app — a modern social-competitive platform for pool players. It standardizes how tools are defined so agents can safely create, modify, test, and orchestrate every part of the product (matchmaking, tournaments, leagues, money matches, chat, stats, halls, etc.).

## Core Principles

- Tools are first-class capabilities living under `.blackbox/skills/` or `agents/tools/`.
- Every tool declares name, description, parameters, and side-effect level.
- Prefer progressive disclosure and dry-run modes for any write operation.
- Keep tools focused and composable — one tool does one job well.
- Always respect player privacy, location data, and money-match verification rules.

## Tool Skill Structure

```
.blackbox/skills/<tool-name>/
├── SKILL.md
├── scripts/          # Python / Node / shell implementations
├── references/       # Schemas, edge cases, examples
└── assets/           # Templates, fixtures, seed data
```

Frontmatter must stay clean (no colon-space, no angle brackets).

## Standard Tool Categories for RackUp

### 1. Player & Profile Tools
- `create_player` / `update_profile`
- `get_player_stats` (wins, losses, clutch, hill-hill, money record)
- `update_fargo_or_rating`
- `player_reputation` (show-up rate, sportsmanship, verified results)
- `heatmap` (where a player has competed)

### 2. Matchmaking & Matches
- `find_nearby_players` (geo + skill + game type filters)
- `instant_match` (ping nearby players)
- `create_match` / `report_result` (with dual verification)
- `match_history` / `match_memories`
- `side_bet_credits` (non-monetary bragging rights)

### 3. Tournament Tools
- `create_tournament` (single/double elim, round-robin)
- `generate_bracket`
- `update_score` / `advance_winner`
- `live_bracket` view
- `notify_next_up`
- `tournament_standings`

### 4. League Play Tools
- `create_league` / `add_team` / `manage_roster`
- `schedule_weekly_matches`
- `update_standings` + handicap adjustments
- `season_history`
- `substitute_player`

### 5. Big Money Match Tools
- `create_money_match` (stakes, race length, visibility)
- `verify_result` (both players must confirm)
- `money_match_leaderboard`
- `attach_livestream`
- `money_match_history`

### 6. Social & Chat Tools
- `add_friend` / `create_group`
- `send_message` / `thread_messages`
- `post_highlight` / `shot_replay`
- `hall_chat_room`
- `match_memories` auto-recap

### 7. Hall & Location Tools
- `hall_checkin` (make player visible to nearby)
- `list_nearby_halls`
- `table_availability`
- `hall_partnership` (events, discounts, official tournaments)
- `post_hall_event`

### 8. Stats, Ratings & Analytics
- `recalculate_stats`
- `clutch_performance`
- `game_type_breakdown` (8-ball, 9-ball, 10-ball, one-pocket)
- `leaderboard` (city / skill / money)

### 9. Safety, Moderation & Ops
- `report_player` / `moderation_queue`
- `dry_run` wrapper for any mutating tool
- `audit_log`
- `sandbox_test_match` (fake data for testing)

### 10. Monetization & Admin (careful)
- `premium_status`
- `tournament_hosting_fee`
- `shop_item` (cues, chalk, gloves — non-real-money in tools)
- Admin-only tools must require elevated confirmation

## Creating a New Tool Skill

1. `/skill create <tool-name>`
2. Fill clear trigger phrases and parameter schema in SKILL.md
3. Put deterministic logic in `scripts/`
4. Document edge cases in `references/`
5. Register so `tool_registry` can discover it
6. Always include dry-run support for write tools
7. Validate before promoting

## Invocation Guidelines for Agents

- Prefer named tools over raw shell or SQL.
- Always dry-run money-match, rating, or result-report tools first.
- After any write that affects standings or ratings, re-run the relevant recalculate tool.
- Location and money-match tools must respect privacy flags.
- For multi-step flows (create tournament → generate bracket → notify players) use `compose_workflow` or spawn a specialist agent.

## Recommended First Tools to Build

1. **find_nearby_players** — geo + skill + game-type filter
2. **create_and_report_match** — dual verification + auto stats update
3. **generate_bracket** — single/double elim with live updates
4. **hall_checkin** — visibility + nearby discovery
5. **player_stats_snapshot** — full profile + heatmap + reputation
6. **money_match_verify** — both players confirm + leaderboard update

## Safety Rules Specific to RackUp

- Never auto-confirm a money match result — both players must verify.
- Location data is sensitive; tools must check player privacy settings.
- Reputation and rating changes should be auditable.
- Side-bet credits are non-monetary only.
- Any tool that touches real money or payments requires explicit human confirmation.

## Validation Checklist

- [ ] Frontmatter is clean
- [ ] Dry-run mode exists for write paths
- [ ] Errors are structured and agent-readable
- [ ] Works with realistic pool data (game types, race lengths, stakes)
- [ ] Documented in tool_registry
- [ ] Tested against at least one full user flow (find match → play → report → stats update)

## Next Actions

When the user asks for a specific tool:
1. Confirm exact capability and safety level.
2. Scaffold the skill.
3. Implement core script + references.
4. Validate and demonstrate with sample data.
