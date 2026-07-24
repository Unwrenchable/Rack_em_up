# Fix: Remove fake demo behavior in live mode

## Steps

### Step 1: Fix `rackup-web/src/lib/api.ts`
- [x] Fix `fetchLookingPlayers` — use real query params (`radius=20000`), return real data or `[]`
- [x] Fix `fetchFriends` — return real API data or `[]`
- [x] Fix all `catch` blocks: return `[]` instead of `DEMO_*` for live mode
- [x] Keep `isDemoMode()` guards for all functions (demo path unchanged)

### Step 2: Fix `rackup-web/src/pages/FindPage.tsx`
- [x] Replace `push('Open chat thread (demo)', 'info')` → `push('Chat coming soon', 'info')`

### Step 3: Fix `rackup-web/src/pages/SocialPage.tsx`
- [x] Replace `push('Reply sent (demo)', 'ok')` → `push('Reply sent', 'ok')`

### Step 4: Fix `rackup-web/src/pages/PlayPage.tsx`
- [x] Wire tournament Register button to `POST /tournaments/:id/register`
- [x] Replace `push('League join waitlist (demo)', 'info')` → `push('Standings coming soon', 'info')`

### Step 5: Verify
- [x] TypeScript compiles without errors (Vite build success: 135 modules, no errors)
- [x] Check all changed files

