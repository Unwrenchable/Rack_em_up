# RackUp MEGA STATUS REPORT

**Authoritative as of:** 2026-08-05 (Phase 2 hooks + Phase 3A product-loop UI)  
**Companion:** [`TODO_REPO.md`](./TODO_REPO.md)

---

## 1. Executive summary

RackUp is **PR-ready for real-world demo** with a **single report entry point**: `ScorekeepingServiceV2.processReport`, and **Phase 3A** wires core UI to V2 APIs.

| Track | Status |
|-------|--------|
| P0 integration + hardening | **Done** |
| P1 (profiles, MM radius, chat JWT, e2e, CI, Auth V2) | **Done** |
| P2 (losers bracket, seed, hall photos) | **Done** |
| **Phase 2 — Integration Hooks (expanded)** | **Done** |
| **Phase 3A — Product loop UI** | **Done** |
| **Phase 3B — Tournament ops** | **Done** (TV mode, admin bracket, auto-seed, Swiss V2) |
| **Phase 3C — Deep scorekeeping** | **Done** |
| **Phase 3D — Money trust** | **Done** |
| **P3 platform slice** | **Done** (S3/local storage, push, DE grand final, premium flags) |
| Remaining P3 | Vision AI, multi-agent tasks, PostGIS, full billing, streaming tips |

---

## 2. Phase 2 Integration Hooks (this pass)

| Feature | Location |
|---------|----------|
| Canonical Redis V2 keys + re-export | `src/common/redis-keys.ts`, `redis-keys.v2.ts` |
| Legacy Redis key migration | `src/common/redis-migrate.util.ts` (runs on health boot) |
| **ScorekeepingServiceV2.processReport** | `src/scorekeeping/scorekeeping-v2.service.ts` |
| Wired report paths | standard matches, money complete, tournaments V2, leagues V2 |
| Money dual result confirm + audit | `money-matches.service.ts` + Redis `audit:v2:money:*` |
| RealAI summary job on every report | via `processReport` → `RealaiV2Service.submitSummaryJob` |
| Live socket `score_update` | `matches.gateway.ts` |
| V1↔V2 ID bridge | `id-bridge.entity/service/controller` |
| Health scorekeeping | `GET /health/scorekeeping` |
| Frontend V2 stubs | `rackup-web/src/lib/api.ts` (mm/halls/tournament V2 + health) |

### Report lifecycle (single entry)

```
Domain service validates + persists COMPLETED state
        ↓
ScorekeepingServiceV2.processReport(MatchReportPayload)
        ↓
Elo → memories (std/money) → Redis events → RealAI job → socket → money audit
```

### Money dual-confirm

1. Both stake confirms (`aConfirmed` && `bConfirmed`) → ACTIVE  
2. First player proposes scores → `pendingResult` (not COMPLETED)  
3. Second player confirms same scores → COMPLETED + `processReport`  
4. Every state change writes Redis audit trail  

---

## 3. Auth decision

**Web cutover to Auth V2** (`POST /auth/v2/login|signup`) with **V1 legacy fallback**. Refresh token stored when returned.

---

## 4. CI + tests

| Suite | Command | CI |
|-------|---------|-----|
| Smoke | `npm run test:smoke` | Yes |
| Typecheck/build BE+FE | `tsc` / `build` | Yes |
| Live e2e | `E2E_BASE_URL=... npm run test:e2e` | Opt-in |

---

## 5. Local demo

```bash
docker compose -f rackup-backend/docker-compose.yml up -d
cd rackup-backend && npm i && TYPEORM_SYNC=true npm run start:dev
npm run seed:demo   # optional
cd rackup-web && npm i && npm run dev
# GET /api/v1/health/scorekeeping after a report
```

Demo seed users: `ace@rackup.demo` / `demo1234` (and vee/bank).

---

## 6. Known limitations

- Multi-node photo storage needs S3 (local disk only).  
- Full double-elim grand finals reset not modeled.  
- Live e2e not forced in CI.  
- Find page may still use V1 matchmaking until pages adopt `mmV2Search`.  
- ID bridges must be created (`POST /id-bridge/link`) to map V1 league/tournament ids.  

---

## 7. P3 roadmap only

Escrow · vision AI · push · PostGIS · S3 · premium · full DE grand-final reset  

---

*Phase 2 integration hooks complete 2026-08-05.*
