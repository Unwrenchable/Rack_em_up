---
name: realai-tools
description: RealAI provider and monorepo tools for RackUp and the RealAI tree. Covers rackup-coach plugin, Glicko-2 rating_update, organs, SOTD, moderation, and RealAI-repo scanners. Trigger on realai tools, rackup-coach, cavity scan, organ trace, REALAI_BASE_URL, or /tool commands aimed at RealAI not Blackbox.
---

# RealAI Tools

These skills belong to **RealAI**, not Blackbox.

Two rooms, one provider:

1. **RackUp client** (`Unwrenchable/Rack_em_up`) — RealAI is HTTP only.
   `POST {REALAI_BASE_URL}/v1/plugins/rackup-coach`
2. **RealAI monorepo** — organs, scanners, models, phase tools live here.
   Do not copy that tree into RackUp.

## RackUp-side tools (safe in this repo)

| Tool | Ability / path |
|---|---|
| `coach_invoke` | `POST /v1/plugins/rackup-coach` |
| `rating_update` | ability `rating_update` ladder `roc_glicko2` |
| `rating_convert` | Fargo / APA / BCA / TAP / VNEA seed |
| `sotd` | ability `shot_of_the_day` + catalog fallback |
| `moderate` | ability `moderation` |
| `matchmaking_rank` | ability `matchmaking` on pre-filtered candidates |
| `league_validate` | ability `league_validate` |
| `pyramid_rules` | ability `pyramid_rules` |
| `video_analysis` | ability `video_analysis` (vision not fully live) |

Envelope is in rackup-grok-bot `references/abilities.md`.

Headers: `Authorization: Bearer $REALAI_API_KEY`, `X-Request-Id`, `X-Provider: realai`, optional `X-RackUp-Tenant`.

Keep `globalThis.fetch` on the Nest side. Timeout default 20s.

## RealAI-monorepo tools (not RackUp)

Only when the open root is the RealAI repo:

- `cavity_scan` / alt / tri
- `model_manifest` (realai-1.0, overseer, vision, embed)
- `provider_list` / `provider_switch`
- `memory_store` / `knowledge_query`
- `phase_tools` (phase4 / phase5)

Paths — `references/realai-tool-map.md`.

## Agent rules

- On RackUp, never vendor scanners, llama weights, or RealAI monorepo folders.
- HTTP 200 + `ok: false` is a logical miss, not a crash.
- Offline SOTD maps stay on RackUp (`GET /api/v1/realai/v2/sotd/maps`).
- Local Elo only if `REALAI_FALLBACK_LOCAL_ELO=1`.
