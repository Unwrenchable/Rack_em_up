import { BRAND, HOME_DESCRIPTION, HOME_TITLE, PUBLIC_ORIGIN } from './brand';

export type SeoRobots = 'index,follow' | 'noindex,nofollow';

export type SeoPage = {
  title: string;
  description: string;
  /** Pathname beginning with / (no origin, no trailing slash except home). */
  path: string;
  robots: SeoRobots;
  crumbs: Array<{ name: string; path: string }>;
  /** Home gets Organization + WebSite + SoftwareApplication. */
  homeGraph?: boolean;
};

export const SITEMAP_PATHS = [
  '/',
  '/find',
  '/coach',
  '/shots',
  '/halls',
  '/play',
  '/social',
  '/tournaments',
] as const;

const HOME_CRUMB = { name: 'Home', path: '/' };

export const PAGE_SEO: Record<string, SeoPage> = {
  '/': {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: '/',
    robots: 'index,follow',
    homeGraph: true,
    crumbs: [HOME_CRUMB],
  },
  '/find': {
    title: 'Find Pool Players Near You | RackUp Matchmaking',
    description:
      'Search live pool players near you, go looking, and match by game, stakes, and hall. RackUp matchmaking for the Rack of Champions network.',
    path: '/find',
    robots: 'index,follow',
    crumbs: [HOME_CRUMB, { name: 'Find', path: '/find' }],
  },
  '/coach': {
    title: 'Pool Coach & Shot of the Day | RackUp Training',
    description:
      'Daily pool drills, Shot of the Day, and Coach AI analysis. Train stroke, position, and decision-making on RackUp.',
    path: '/coach',
    robots: 'index,follow',
    crumbs: [HOME_CRUMB, { name: 'Coach', path: '/coach' }],
  },
  '/shots': {
    title: 'Pool Shot Catalogue & Drills | RackUp',
    description:
      'Browse the RackUp shot catalogue — banks, kicks, combos, jumps, and massé drills with diagrams for every level.',
    path: '/shots',
    robots: 'index,follow',
    crumbs: [HOME_CRUMB, { name: 'Shots', path: '/shots' }],
  },
  '/halls': {
    title: 'Pool Halls Near You — Check In & Play | RackUp',
    description:
      'Find pool halls near you, see who is there, and check in. Live hall pulse on the Rack of Champions player network.',
    path: '/halls',
    robots: 'index,follow',
    crumbs: [HOME_CRUMB, { name: 'Halls', path: '/halls' }],
  },
  '/play': {
    title: 'Money Sets, Tournaments & Leagues | RackUp Play',
    description:
      'Book money sets, join tournaments, and follow ROC leagues. Dual-confirm results and live brackets on RackUp.',
    path: '/play',
    robots: 'index,follow',
    crumbs: [HOME_CRUMB, { name: 'Play', path: '/play' }],
  },
  '/social': {
    title: 'Friends, Chat & Challenges | RackUp Social',
    description:
      'Add friends, chat, post on the action board, and send challenges. RackUp is the social layer for pool players.',
    path: '/social',
    robots: 'index,follow',
    crumbs: [HOME_CRUMB, { name: 'Social', path: '/social' }],
  },
  '/tournaments': {
    title: 'Pool Tournaments | RackUp Play',
    description:
      'Find and join pool tournaments on RackUp — single elimination, double elimination, Swiss, and chip races.',
    path: '/tournaments',
    robots: 'index,follow',
    crumbs: [HOME_CRUMB, { name: 'Play', path: '/play' }, { name: 'Tournaments', path: '/tournaments' }],
  },
  '/profile': {
    title: 'Your Pool Player Profile | RackUp',
    description:
      'Your RackUp player card, rating, and badges on the Rack of Champions network. Sign in to view and share your profile.',
    path: '/profile',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Profile', path: '/profile' }],
  },
  '/auth': {
    title: 'Join RackUp | Sign In — Rack of Champions',
    description:
      'Create a RackUp account or sign in to find pool players, check into halls, book money sets, and train with Coach AI.',
    path: '/auth',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Join', path: '/auth' }],
  },
  '/money': {
    title: 'Money Sets | RackUp Play',
    description: 'Book and confirm money sets on RackUp. Dual-confirm results so the stake stays honest.',
    path: '/money',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Play', path: '/play' }, { name: 'Money sets', path: '/money' }],
  },
  '/chat': {
    title: 'Chat | RackUp Social',
    description: 'Direct messages and table chat for RackUp players.',
    path: '/chat',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Social', path: '/social' }, { name: 'Chat', path: '/chat' }],
  },
  '/memories': {
    title: 'Match Memories | RackUp',
    description: 'Saved racks, clips, and match memories on RackUp.',
    path: '/memories',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Memories', path: '/memories' }],
  },
  '/notifications': {
    title: 'Notifications | RackUp',
    description: 'Challenges, check-ins, and tournament alerts on RackUp.',
    path: '/notifications',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Notifications', path: '/notifications' }],
  },
  '/settings': {
    title: 'Settings | RackUp',
    description: 'Account, safety, and install settings for RackUp.',
    path: '/settings',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Settings', path: '/settings' }],
  },
  '/wallet': {
    title: 'Wallet | RackUp',
    description: 'Player wallet and ledger on the Rack of Champions network.',
    path: '/wallet',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Wallet', path: '/wallet' }],
  },
  '/scorekeeping': {
    title: 'Scorekeeping | RackUp',
    description: 'Live scorekeeping for RackUp matches and tournaments.',
    path: '/scorekeeping',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Scorekeeping', path: '/scorekeeping' }],
  },
  '/pyramid': {
    title: 'RackUp Pyramid | RackUp Play',
    description: 'Play RackUp Pyramid — the house ladder game on the Rack of Champions network.',
    path: '/pyramid',
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB, { name: 'Play', path: '/play' }, { name: 'Pyramid', path: '/pyramid' }],
  },
};

export function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function seoForPath(pathname: string): SeoPage {
  const path = normalizePath(pathname);
  if (PAGE_SEO[path]) return PAGE_SEO[path];
  if (path.startsWith('/tournaments/') && path.endsWith('/tv')) {
    return {
      title: `TV board · ${BRAND.name}`,
      description: 'Live tournament TV board for hall displays on RackUp.',
      path,
      robots: 'index,follow',
      crumbs: [HOME_CRUMB, { name: 'Tournaments', path: '/tournaments' }, { name: 'TV', path }],
    };
  }
  if (path.startsWith('/tournaments/')) {
    return {
      title: `Tournament · ${BRAND.name}`,
      description: 'Tournament bracket, matches, and live scoring on RackUp.',
      path,
      robots: 'noindex,nofollow',
      crumbs: [HOME_CRUMB, { name: 'Tournaments', path: '/tournaments' }, { name: 'Event', path }],
    };
  }
  return {
    title: BRAND.title,
    description: BRAND.description,
    path,
    robots: 'noindex,nofollow',
    crumbs: [HOME_CRUMB],
  };
}

export function canonicalFor(path: string): string {
  const normalized = normalizePath(path);
  return normalized === '/' ? `${PUBLIC_ORIGIN}/` : `${PUBLIC_ORIGIN}${normalized}`;
}

export function titleForPath(pathname: string): string {
  return seoForPath(pathname).title;
}

type JsonLd = Record<string, unknown>;

export function siteJsonLd(includeApp = true): JsonLd {
  const origin = PUBLIC_ORIGIN;
  const orgId = `${origin}/#organization`;
  const siteId = `${origin}/#website`;
  const appId = `${origin}/#app`;
  const graph: JsonLd[] = [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: BRAND.siteName,
      alternateName: BRAND.name,
      url: `${origin}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/icon-512.png`,
      },
    },
    {
      '@type': 'WebSite',
      '@id': siteId,
      name: BRAND.name,
      alternateName: BRAND.siteName,
      url: `${origin}/`,
      description: HOME_DESCRIPTION,
      inLanguage: 'en-US',
      publisher: { '@id': orgId },
    },
  ];
  if (includeApp) {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': appId,
      name: BRAND.name,
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Web',
      url: `${origin}/`,
      description: HOME_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      publisher: { '@id': orgId },
    });
  }
  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function breadcrumbJsonLd(page: SeoPage): JsonLd | null {
  if (page.crumbs.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: page.crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: canonicalFor(crumb.path),
    })),
  };
}

