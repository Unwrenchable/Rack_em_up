---
name: rackup-seed
description: Seed halls, tournaments, and league data (starting with Las Vegas).
---

# Rackup Seed

## Instructions
- **Vegas:** Use `las-vegas-halls.json` to seed halls, tournaments, admins, events, leaderboard entries.
- **Idempotent:** Seed operations must not duplicate data if run multiple times.
- **Endpoints:** Expose `/api/v1/halls/v2/seed/vegas` and similar for future regions.
- **Integration:** Seed data must be compatible with Hall Ecosystem V2, Tournament Engine V2, and League System V2.

## Examples
- Implement `hall-seed.service.ts` that checks for existing halls by name or externalId before inserting.
- Add future `POST /api/v1/halls/v2/seed/<city>` endpoints using the same pattern.
