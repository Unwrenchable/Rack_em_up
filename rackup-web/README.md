# RackUp Web

Mobile-first pool players app — dark felt + gold UI.

## Run

```bash
cd rackup-web
npm install
npm run dev
```

http://localhost:5173 → **Open demo**

Backend optional: `cd ../rackup-backend && npm run start:dev`

## Features

| Area | Routes |
|------|--------|
| Hall Pulse home | `/` |
| Matchmaking + Go live | `/find` |
| Money / tours / leagues | `/play` |
| Friends, action board, chat entry | `/social` |
| Live Socket.IO chat | `/chat` |
| Halls + check-in | `/halls` |
| Daily coach drills | `/coach` |
| Match memories | `/memories` |
| Notifications | `/notifications` |
| Profile + badges | `/profile` |
| Settings / safety | `/settings` |

Demo mode fills data when the API is offline. Vite proxies `/api` → `:3000`.
