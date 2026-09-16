export const DEFAULT_PUBLIC_ORIGIN = 'https://www.rackofchampions.com';

export const PUBLIC_ORIGIN = (
  import.meta.env.VITE_PUBLIC_ORIGIN || DEFAULT_PUBLIC_ORIGIN
).replace(/\/$/, '');

export const HOME_TITLE =
  'RackUp | Rack of Champions — Pool Matchmaking, Halls & Money Sets';

export const HOME_DESCRIPTION =
  'Find pool players near you, check into halls, book money sets, run tournaments, and train with Coach AI. RackUp is the Rack of Champions player network.';

export const BRAND = {
  name: 'RackUp',
  siteName: 'Rack of Champions',
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  shareText: 'Find action. Check halls. Protect the money.',
} as const;
