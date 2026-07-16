# RackUp Backend TODO (legacy bootstrap list)

**Superseded by** [`PROJECT_TODO.md`](./PROJECT_TODO.md) and root [`CURRENT_STATUS.md`](../CURRENT_STATUS.md).

Bootstrap items below are **done** (structure, modules, auth, websocket, package/tsconfig exist).

- [x] Create source files under `src/`
- [x] Bootstrap `main.ts` + `app.module.ts`
- [x] TypeORM PostgreSQL config
- [x] Redis config
- [x] RBAC decorator + guard
- [x] Auth module
- [x] Users module
- [x] WebSocket chat gateway
- [x] `tsconfig.json` / `package.json` / deps installed
- [ ] Start postgres + redis (local/runtime — still operator step)
- [ ] Run backend against live DB
- [ ] Critical-path testing (auth, RBAC, websocket, DB)

For product backlog (SOTD, RealAI, e2e, escrow, etc.) use **PROJECT_TODO.md**.
