---
name: rackup-rating-normalization
description: Normalize APA/Fargo/local ratings into a unified Rack ’em Up rating.
---

# Rackup Rating Normalization

## Instructions
- **Inputs:** Accept multiple rating systems (APA, FargoRate, local league ratings).
- **Storage:** Use `ExternalRatingSource` and `PlayerExternalRating` entities.
- **Normalization:** Implement a deterministic function that maps all sources to a single numeric “Rack ’em Up Rating”.
- **Usage:** Use normalized rating in:
  - matchmaking V2
  - league standings
  - tournament seeding
  - hall leaderboards
- **Documentation:** Keep the formula documented in code comments.

## Examples
- Given APA=5, Fargo=550, local=7 → compute a single rating (e.g., 612) and store it.
- Use normalized rating to seed players in TournamentV2 brackets.
- Use normalized rating to sort LeagueSeason standings.
