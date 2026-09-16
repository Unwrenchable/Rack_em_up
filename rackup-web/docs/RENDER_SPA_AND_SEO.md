# Render SPA rewrites + Phase 1 SEO (Travis)

Live host: `https://www.rackofchampions.com/`

Express stays **4.22.2**. Do not clear `globalThis.fetch`.

## SPA deep links still 404 until the live CDN rewrite is on

Verified **2026-09-16**: `GET /play`, `/coach`, `/shots`, `/find`, … still **HTTP 404**
with the same SPA HTML as `/` (`rndr-id` present). That is Render serving
`dist/404.html` as a 404. Client-side `App.tsx` routes already exist.

The Blueprint in repo-root `render.yaml` already has the PR **#37** rule:

```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

YAML does **not** change production until Render applies it to the service
that owns `www.rackofchampions.com`.

### Preferred — Blueprint Sync (if that service is in this Blueprint)

1. Render Dashboard → **Blueprints** → the Rack_em_up blueprint that syncs **`render.yaml`**.
2. **Manual Sync** (or wait for auto-sync on the merge commit).
3. Confirm it **updates the existing `rackup-web` service** and shows rewrite `/*` → `/index.html`.
4. If Sync would **create a second Static Site**, cancel and use the fallback.

### Fallback — dashboard-created Static Site (most likely)

On the **existing** `rackup-web` service for `www.rackofchampions.com` (do not create a new service):

1. Service → **Redirects/Rewrites**.
2. Add:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** **Rewrite** (not Redirect)
3. Save. CDN config can take effect **without a rebuild**.
4. Optional: point that service’s Blueprint at repo-root `render.yaml` so later syncs keep the rule.

Do **not** rely on `public/_redirects` (Netlify-only) or `dist/404.html` for status codes.

Existing files in `dist/` (`/robots.txt`, `/sitemap.xml`, `/manifest.json`, hashed `/assets/*`)
are served as files. The catch-all rewrite is only for missing SPA paths.

## robots.txt + sitemap.xml

Real static files in `rackup-web/public/` (Vite copies them to `dist/`):

- `/robots.txt` — `Allow: /` + `Sitemap: https://www.rackofchampions.com/sitemap.xml`
- `/sitemap.xml` — `/`, `/find`, `/coach`, `/shots`, `/halls`, `/play`, `/social`, `/tournaments`

Auth-only surfaces (`/auth`, `/profile`, `/wallet`, `/settings`, `/chat`, …) are **not** in the sitemap.
They get `noindex` via the in-app head manager after hydration.

After deploy, `curl -sI https://www.rackofchampions.com/robots.txt` must be **200**
`text/plain` (not the SPA HTML 404).

## Manifest MIME

Live `GET /manifest.webmanifest` was **200** `binary/octet-stream` with
`x-content-type-options: nosniff` (browsers will not treat it as a web app
manifest). The HTML now points at `/manifest.json` (Render already maps `.json`),
and the Blueprint sets `Content-Type: application/manifest+json` on both paths.

If the live service is **not** on this Blueprint, add the same Headers on that
service, or rely on `/manifest.json` after this deploy.

## Per-route head tags

`src/components/SeoHead.tsx` updates title, description, canonical, OG/Twitter,
robots, and JSON-LD from `src/lib/seo.ts` after hydration. Crawlers that do not
run JS still get the stronger defaults in `index.html` (title, description,
Organization + WebSite + SoftwareApplication JSON-LD, in-root crawl copy).
