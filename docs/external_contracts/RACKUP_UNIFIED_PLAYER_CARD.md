# Unified Player Card — RackUp pin

**Live Nest (PR #47, main):** `GET /users/me/player-card`, `GET /users/:id/player-card`, `POST /ratings/fargo/search`, `POST /ratings/shadow/recompute`

**RealAI contract:** Unwrenchable/RealAI@`e063f11c` — [RACKUP_UNIFIED_PLAYER_CARD.md](https://github.com/Unwrenchable/RealAI/blob/e063f11c/docs/external_contracts/RACKUP_UNIFIED_PLAYER_CARD.md)

| Item | Value |
|------|--------|
| Nest wire shape | `player.rackup_stats` (ROC Glicko-2), `fargo_rating` / `fargo_robustness`, `rackup_shadow`, `apa_sl` / `bca_elo` / `tap_stats` |
| Fargo HTTP | Nest **GET** `indexsearch?q=` and `players/<readableId>` — read-only, no LMS submit |
| Identity | `player.unified_id` from `player_identities` resolver |
| Canonical competitive | ROC Glicko-2 on `users.rating` (500-band), mirrored as `rackup_stats` |
| Shadow | Fargo-like approximation from Glicko; stored on identity only — **never** written to `users.rating` |
| Leagues v2 | 0–3000 `unifyRackupRating()` is import-mapping only. `overwrites_roc: false` |

Profile / Find / matchmaking UI consumes the Nest endpoints above. Missing Fargo stays null — never invented from ROC or shadow.
