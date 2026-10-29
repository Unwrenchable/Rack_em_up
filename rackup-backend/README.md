# RackUp backend

NestJS API for RackUp. Copy `.env.example` to `.env` for local development. `.env` is gitignored; do not commit real values.

## Required signing secrets

Production (`NODE_ENV=production`) refuses to start if either variable is missing or blank:

- `JWT_SECRET` — access tokens and the websocket gateway
- `JWT_REFRESH_SECRET` — refresh tokens

Generate a value locally (do not commit it):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

In development and test, an unset secret is replaced with a random value created once when the process starts. That value is not stable across restarts. Set both variables in `.env` when you need tokens to survive a restart.

If a deployed environment ever started with the old hard-coded defaults, rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` before trusting existing tokens.

## Run

```bash
npm install
npm run start:dev
```

The server listens on `0.0.0.0:$PORT` (default port 3000).
