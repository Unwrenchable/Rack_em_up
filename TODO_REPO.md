# RackUp — Unified Repo-Wide TODO (Production Readiness)

**Last updated:** 2026-08-05  
**PR readiness:** P0–P2 + Phase 2 hooks + Phase 3A product-loop UI cutover; P3/blackbox ops remain.

---

## Completed — P0 / P1 / P2

### P0 (prior pass)
- [x] Scorekeeping V2 + report wiring  
- [x] Redis V2 keys  
- [x] Health `"Database connected"`  
- [x] Tournament bracket advance  
- [x] RealAI summary jobs  
- [x] Unified rating  
- [x] Smoke tests / throttler / logging / migrations  
- [x] Frontend money complete + standings  
- [x] SOTD streak + catalog + 52 maps  

### P1
- [x] Public profiles + friends/looking hydration  
- [x] Matchmaking radius + queue expiry  
- [x] Chat socket JWT  
- [x] Live e2e + CI  
- [x] Auth V2 web cutover  

### P2
- [x] Losers bracket  
- [x] Seed script  
- [x] Hall photo storage  

---

## Completed — Phase 2 Integration Hooks (expanded)

- [x] **ScorekeepingServiceV2** — single `processReport` entry point  
- [x] Wire standard / money / tournament V2 / league V2 reports  
- [x] RealAI summary job after every successful report  
- [x] Unified Redis V2 key helpers (+ `redis-keys.v2.ts` re-export)  
- [x] Legacy Redis key migrate-if-present utility  
- [x] Money dual result confirmation + Redis audit log  
- [x] Socket `score_update` emit on report  
- [x] ID bridge V1↔V2 for leagues & tournaments  
- [x] `GET /health/scorekeeping`  
- [x] Frontend `api.ts` V2 stubs (MM, halls, tournament, health, id-bridge)  
- [x] Smoke tests extended for new keys + routes  

---

## Completed — Phase 3A product loop (partial UI cutover)

- [x] Find page → Matchmaking V2 enqueue + status/confirm UI  
- [x] Halls page → Halls V2 check-in/out + feed  
- [x] Tournaments detail → V2 bracket + report + `score_update` listener  
- [x] Money dual-result-confirm UX (Money + Play)  
- [x] Play page `score_update` live toast  
- [x] `seed:demo` V2 season/tournament + id-bridge rows  

## Completed — Phase 3B tournament ops

- [x] TV mode `GET /tournaments/v2/tv/:id` + `/tv` socket namespace  
- [x] Admin update-score / swap-players / reseed  
- [x] Auto-seeding manual | random | elo  
- [x] Swiss mode V2 + advance Swiss round  
- [x] Tournaments list create/start + public TV page  

## Completed — Phase 3C deep scorekeeping

- [x] Match timeline entity + Redis live mirror  
- [x] API: start / append event / get timeline / sotd-candidates  
- [x] processReport finalizes timeline + enriches RealAI keyShots/context  
- [x] Hall feed hints on rack/score/complete  
- [x] Frontend api stubs for timeline  

## Completed — Phase 3D money trust

- [x] Escrow service (mock default; Stripe PI stub when key set)  
- [x] Hold on dual stake confirm; release on complete / arbiter win  
- [x] Dispute arbiter resolve (ADMIN / HALL_OWNER / ORGANIZER)  
- [x] Durable `money_match_audits` table + export  
- [x] Frontend escrow display + resolve/audit API stubs  

## Completed — P3 platform slice

- [x] Object storage (local + S3 SigV4) for hall photos  
- [x] Push devices + FCM/queue + in-app  
- [x] Double-elim GRAND_FINAL + optional reset series  
- [x] Premium tier fields + `/users/me/premium`  

## 🟩 Remaining P3 / future

- [ ] RealAI multimodal vision shot analysis  
- [ ] RealAI multi-agent `/v1/tasks`  
- [ ] Live streaming / spectator tips beyond TV  
- [ ] PostGIS hall heat maps  
- [ ] Full Stripe Connect / premium billing  
- [ ] Do **not** vendor RealAI monorepo  

---

## Known limitations (acceptable for PR)

| Item | Note |
|------|------|
| League standings | Use id-bridge or pass V2 season id |
| E2E in CI | Opt-in via `E2E_BASE_URL` |
| Local photos | Not multi-instance durable |
| Find page | Adopt `mmV2Search` when ready |

---

## Run for demo / PR

```bash
docker compose -f rackup-backend/docker-compose.yml up -d
cd rackup-backend && npm i && TYPEORM_SYNC=true npm run start:dev
# optional: npm run seed:demo
cd rackup-web && npm i && npm run dev

# checks
cd rackup-backend && npx tsc --noEmit && npm run test:smoke
cd rackup-web && npx tsc -b
```
