/**
 * Express/Nest path token for v1 tournament ids.
 *
 * Unconstrained `:id` also matches the static segment `v2`, so
 * `GET /tournaments/v2` and `POST /tournaments/v2/register` were captured
 * by v1 `GET /tournaments/:id` / `POST /tournaments/:id/register`.
 * ParseUUIDPipe then 400s and Nest never falls through to V2.
 *
 * Hex+hyphen only (no `{n}` quantifiers — Nest's path-to-regexp treats
 * `{}` as optional groups). `v2` cannot match; real UUIDs still do.
 * ParseUUIDPipe remains the strict UUID check.
 */
export const TOURNAMENT_V1_UUID_PARAM = ':id([0-9a-fA-F-]+)';
