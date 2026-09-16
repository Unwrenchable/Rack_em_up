import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND } from '../lib/brand';
import {
  breadcrumbJsonLd,
  canonicalFor,
  faqPageJsonLd,
  seoForPath,
  siteJsonLd,
} from '../lib/seo';

const SITE_LD_ID = 'jsonld-site';
const PAGE_LD_ID = 'jsonld-page';
const FAQ_LD_ID = 'jsonld-faq';

function attrSelector(attr: 'name' | 'property', key: string): string {
  return `meta[${attr}="${key}"]`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = attrSelector(attr, key);
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: unknown | null) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Per-route title, description, canonical, OG/Twitter, robots, JSON-LD. */
export function SeoHead() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const page = seoForPath(pathname);
    const url = canonicalFor(page.path);

    document.title = page.title;
    upsertMeta('name', 'description', page.description);
    upsertMeta('name', 'robots', page.robots);
    upsertMeta('property', 'og:title', page.title);
    upsertMeta('property', 'og:description', page.description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:site_name', BRAND.siteName);
    upsertMeta('name', 'twitter:title', page.title);
    upsertMeta('name', 'twitter:description', page.description);
    upsertLink('canonical', url);

    upsertJsonLd(SITE_LD_ID, siteJsonLd(!!page.homeGraph));
    upsertJsonLd(PAGE_LD_ID, breadcrumbJsonLd(page));
    upsertJsonLd(FAQ_LD_ID, page.path === '/faq' ? faqPageJsonLd() : null);
  }, [pathname]);

  return null;
}
