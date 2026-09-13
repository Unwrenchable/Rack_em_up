export const DEFAULT_PUBLIC_ORIGIN = 'https://www.rackofchampions.com';

export const PUBLIC_ORIGIN = (
  import.meta.env.VITE_PUBLIC_ORIGIN || DEFAULT_PUBLIC_ORIGIN
).replace(/\/$/, '');

export const BRAND = {
  name: 'RackUp',
  siteName: 'Rack of Champions',
  title: 'RackUp — Rack of Champions',
  description: 'Find action, halls, and money sets near you.',
  shareText: 'Find action. Check halls. Protect the money.',
} as const;

/** SPA document titles. OG/Twitter tags stay static in index.html. */
export function titleForPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  const exact: Record<string, string> = {
    '/': 'Home',
    '/auth': 'Sign in',
    '/find': 'Find action',
    '/play': 'Play',
    '/money': 'Money sets',
    '/social': 'Social',
    '/chat': 'Chat',
    '/halls': 'Halls',
    '/coach': 'Coach',
    '/shots': 'Shot catalog',
    '/memories': 'Memories',
    '/notifications': 'Notifications',
    '/settings': 'Settings',
    '/profile': 'Profile',
    '/wallet': 'Wallet',
    '/tournaments': 'Tournaments',
    '/scorekeeping': 'Scorekeeping',
    '/pyramid': 'Pyramid',
  };
  if (exact[path]) return `${exact[path]} · ${BRAND.name}`;
  if (path.startsWith('/tournaments/') && path.endsWith('/tv')) return `TV board · ${BRAND.name}`;
  if (path.startsWith('/tournaments/')) return `Tournament · ${BRAND.name}`;
  return BRAND.title;
}
