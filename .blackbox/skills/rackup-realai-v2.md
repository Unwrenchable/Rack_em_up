---
name: rackup-realai-v2
description: Live RealAI V2 coach surface for RackUp. External HTTP provider only. Use coach-plugin, not the RealAI monorepo.
---

# RackUp RealAI V2 (live)

Module already exists at `rackup-backend/src/realai/v2` plus `src/ai/realai-coach.client.ts`.

## Canonical paths

- Provider: `POST {REALAI_BASE_URL}/v1/plugins/rackup-coach`
- App gate: `POST /api/v1/realai/v2/coach-plugin` (JWT)
- Convenience: `/coach`, `/match-summary`, `/player-insights`, `/shot-of-the-day`, `/moderate`, `/league-validate`, `/matchmaking`, `/pyramid-rules`, `/video-analysis`
- Offline maps: `GET /api/v1/realai/v2/sotd/maps`
- Fallback only: `POST /v1/chat/completions`

## Rules

- Do not vendor `C:\\realai`, cavity scanners, overseer weights, or phase4/phase5.
- Keep `globalThis.fetch`.
- Ratings use `ability: rating_update` on `roc_glicko2`. Local Elo only if `REALAI_FALLBACK_LOCAL_ELO=1`.
- Vision pipeline is not fully live. Say so.
