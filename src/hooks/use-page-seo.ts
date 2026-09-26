/**
 * Client-side document metadata.
 *
 * `index.html` ships a complete, crawlable default set of tags so the first
 * paint is always SEO-valid even before JavaScript runs. This hook only
 * *overrides* the per-page parts: title, description, canonical URL and the
 * Open Graph/Twitter mirrors of those.
 *
 * Tags are created once and reused rather than re-created on every update,
 * which avoids DOM churn and duplicate `<meta>` nodes.
 */

import { useEffect } from 'react';

/** Absolute origin, resolved once. Falls back to a safe literal in tests. */
const ORIGIN =
  typeof window === 'undefined'
    ? 'https://weekend-watch.example'
    : window.location.origin;

/** Per-page metadata accepted by {@link usePageSeo}. */
export interface PageSeo {
  /** Page title. The site suffix is appended automatically. */
  title: string;
  /** Meta description, ideally 120–160 characters. */
  description: string;
  /** Canonical path, e.g. `/search?query=dune`. */
  path: string;
  /** Optional JSON-LD payload rendered into a `<script type="application/ld+json">`. */
  jsonLd?: Record<string, unknown> | undefined;
}

/** Appended to every page title for consistent branding. */
export const SITE_SUFFIX = 'Weekend Watch';

/**
 * Returns or creates a `<meta>` element by its identifying attribute.
 *
 * @param attr - Either `name` or `property`.
 * @param key - The attribute's value, e.g. `description` or `og:title`.
 * @returns The meta element, already in `<head>`.
 */
function metaTag(attr: 'name' | 'property', key: string): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (element === null) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  return element;
}

/**
 * Returns the document's canonical `<link>`, creating it when absent.
 *
 * @returns The canonical link element.
 */
function canonicalLink(): HTMLLinkElement {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (element === null) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  return element;
}

/** Identifier used to find and replace the JSON-LD script block. */
const JSON_LD_ID = 'ww-page-jsonld';

/**
 * Applies per-page SEO metadata to the document head.
 *
 * @param seo - The metadata for the current page.
 */
export function usePageSeo({ title, description, path, jsonLd }: PageSeo): void {
  useEffect(() => {
    const fullTitle = `${title} | ${SITE_SUFFIX}`;
    const canonical = `${ORIGIN}${path}`;

    document.title = fullTitle;
    metaTag('name', 'description').content = description;
    canonicalLink().href = canonical;

    metaTag('property', 'og:title').content = fullTitle;
    metaTag('property', 'og:description').content = description;
    metaTag('property', 'og:url').content = canonical;
    metaTag('name', 'twitter:title').content = fullTitle;
    metaTag('name', 'twitter:description').content = description;
  }, [title, description, path]);

  useEffect(() => {
    const existing = document.getElementById(JSON_LD_ID);
    if (jsonLd === undefined) {
      existing?.remove();
      return;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSON_LD_ID;
    // `JSON.stringify` on a plain object cannot emit `</script>`, so this is
    // safe to inline. Values are not user-controlled HTML.
    script.textContent = JSON.stringify(jsonLd);

    if (existing !== null) existing.replaceWith(script);
    else document.head.appendChild(script);
  }, [jsonLd]);
}
