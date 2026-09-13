/** Env-driven JWT lifetimes (defaults favor longer sessions). */
export function jwtAccessExpires(): string {
  return (
    process.env.JWT_ACCESS_EXPIRES ??
    process.env.JWT_EXPIRES_IN ??
    '2h'
  ).trim() || '2h';
}

export function jwtRefreshExpires(): string {
  return (
    process.env.JWT_REFRESH_EXPIRES ??
    process.env.JWT_REFRESH_EXPIRES_IN ??
    '30d'
  ).trim() || '30d';
}
