---
name: rackup-core-architecture
description: Global architectural rules for Rack ’em Up V2 modules.
---

# Rackup Core Architecture

## Instructions
- **Preserve v1:** Never modify existing v1 modules, entities, gateways, or endpoints.
- **Parallel V2:** All new work must live in `*/v2` folders (e.g., `src/halls/v2`, `src/leagues/v2`).
- **Routing:** V2 HTTP routes must be prefixed with `/api/v1/<module>/v2/...`.
- **Entities:** Every new entity must be registered in `src/config/ormconfig.ts`.
- **Modules:** Every new V2 module must be imported in `src/app.module.ts`.
- **DTOs:** Use class-validator and class-transformer for all DTOs.
- **Redis:** Use clear, namespaced keys like `mm:v2:*`, `halls:v2:*`, `leagues:v2:*`.

## Examples
- Add `AuthV2Module` without touching `AuthModule`.
- Create `TournamentV2` entity and add it to `ormconfig.ts` while leaving `Tournament` untouched.
- Add `/api/v1/halls/v2/checkin` without changing `/api/v1/halls/*` v1 routes.
