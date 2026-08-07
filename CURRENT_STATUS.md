# RackUp — Current Status (living doc)

**Last updated:** 2026-08-05  
**Authoritative truth:** [`TRUE_STATUS.md`](./TRUE_STATUS.md) (corrects outdated merge/audit claims)  
**TODOs:** [`TODO_REPO.md`](./TODO_REPO.md) · mega: [`MEGA_STATUS_REPORT.md`](./MEGA_STATUS_REPORT.md)  
**Legacy:** `rackup-backend/PROJECT_TODO.md` is stale — prefer TODO_REPO / TRUE_STATUS.

## Tracks

| Track | Status |
|-------|--------|
| P0–P2 | Done |
| Phase 2 Integration Hooks | Done (`ScorekeepingServiceV2.processReport`) |
| Phase 3A product loop UI | Done |
| Phase 3B TV/admin/seeding | Done |
| Phase 3C deep scorekeeping | Done |
| Phase 3D escrow / money trust | Done |
| P3 platform slice | Done (storage, push, grand final, premium) |
| Remaining P3 | Vision AI, PostGIS, full billing |

## Run

```bash
docker compose -f rackup-backend/docker-compose.yml up -d
cd rackup-backend && TYPEORM_SYNC=true npm run start:dev
npm run seed:demo
cd rackup-web && npm run dev
```

## Phase 3A notes

- Find: Matchmaking V2 enqueue; looking board still V1-hydrated  
- Halls: V2 check-in/out + feed  
- Tournaments `/:id`: V2 bracket/report + live `score_update`  
- Money: dual result confirm UX  
- Seed: Demo Vegas Season + Demo RackUp Open + id bridges  
