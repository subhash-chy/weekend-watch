/**
 * Application-wide constants.
 *
 * Anything that more than one module needs to agree on lives here so there is
 * exactly one source of truth — no route string or genre label is ever
 * hard-coded twice.
 */

import type { CatalogueKind } from '@/types/media';

/**
 * TMDB genre id → label, limited to the ids this app can actually receive from
 * its endpoints. Unknown ids are dropped by {@link genreLabels}.
 */
export const GENRES: Readonly<Record<number, string>> = {
  12: 'Adventure',
  14: 'Fantasy',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  28: 'Action',
  35: 'Comedy',
  36: 'History',
  37: 'Western',
  53: 'Thriller',
  80: 'Crime',
  99: 'Documentary',
  878: 'Science Fiction',
  9648: 'Mystery',
  10402: 'Music',
  10749: 'Romance',
  10751: 'Family',
  10752: 'War',
  10759: 'Action & Adventure',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10768: 'War & Politics',
  10770: 'TV Movie',
};

/**
 * Application routes.
 *
 * Centralised so links, redirects and SEO canonicals can never drift apart.
 * The app has two real routes; the catalogue sections are the home route with a
 * `catalogue` query parameter, which keeps a single source of truth for the
 * toggle state and makes those nav entries genuinely functional.
 */
export const ROUTES = {
  home: '/',
  search: '/search',
} as const;

/** Query parameter that preselects the discovery catalogue toggle. */
export const CATALOGUE_PARAM = 'catalogue';

/**
 * Header navigation.
 *
 * Every entry resolves to something real: `Home` is the default catalogue,
 * `Films` and `Series` deep-link the toggle, and `Search` is its own route.
 * There are no placeholder destinations.
 */
export const NAV_LINKS: readonly { to: string; label: string }[] = [
  { to: ROUTES.home, label: 'Home' },
  { to: `${ROUTES.home}?${CATALOGUE_PARAM}=streaming`, label: 'Films' },
  { to: `${ROUTES.home}?${CATALOGUE_PARAM}=tv`, label: 'Series' },
  { to: ROUTES.search, label: 'Search' },
];

/** Options for the "What's popular" segmented control. */
export const CATALOGUE_OPTIONS: readonly {
  value: CatalogueKind;
  label: string;
}[] = [
  { value: 'streaming', label: 'Streaming' },
  { value: 'tv', label: 'On TV' },
];

/**
 * TMDB image size presets. Fixed pixel sizes are required so every `<img>` can
 * carry explicit `width`/`height` attributes and keep CLS at 0.
 */
export const POSTER_SIZE = {
  width: 342,
  height: 513,
} as const;

export const BACKDROP_SIZE = {
  width: 1280,
  height: 720,
} as const;

/** How many hero slides the carousel renders at most. */
export const HERO_SLIDE_COUNT = 5;

/** Milliseconds a toast stays on screen before auto-dismissing. */
export const TOAST_DURATION_MS = 4500;

/** Debounce applied to the header's instant search-as-you-type. */
export const SEARCH_DEBOUNCE_MS = 250;
