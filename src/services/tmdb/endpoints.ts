/**
 * TMDB endpoint catalogue.
 *
 * One descriptor per request the app can make. Components and hooks reference
 * these descriptors by name rather than building URLs, which keeps query
 * parameters (and the media type each endpoint implies) in one place.
 */

import type { MediaType } from '@/types/media';

/** A single TMDB request descriptor. */
export interface EndpointDescriptor {
  /** Stable key, also used as the SWR cache key. */
  key: string;
  /** API path. */
  path: string;
  /** Query parameters (language is added by the client). */
  params: Readonly<Record<string, string | number>>;
  /**
   * Media type to assume for results. Endpoints like `/movie/top_rated` omit
   * `media_type` from their payloads, so the parser needs a default.
   */
  mediaType: MediaType;
  /** Human-readable row heading. */
  label: string;
  /** Short sentence describing the row, used as the section's description. */
  description: string;
}

/** Every list endpoint the app renders. */
export const ENDPOINTS = {
  /** Mixed movies + TV, refreshed daily — powers the hero carousel. */
  trending: {
    key: 'trending/all/day',
    path: '/trending/all/day',
    params: {},
    mediaType: 'movie',
    label: 'Trending today',
    description: 'The titles everyone is watching right now.',
  },
  nowPlayingMovies: {
    key: 'movie/now_playing',
    path: '/movie/now_playing',
    params: {},
    mediaType: 'movie',
    label: 'Now playing',
    description: 'Fresh releases, in theatres and streaming.',
  },
  popularMovies: {
    key: 'movie/popular',
    path: '/movie/popular',
    params: {},
    mediaType: 'movie',
    label: 'Popular movies',
    description: 'The most-watched films of the week.',
  },
  topRatedMovies: {
    key: 'movie/top_rated',
    path: '/movie/top_rated',
    params: {},
    mediaType: 'movie',
    label: 'Top rated movies',
    description: 'Critically acclaimed, audience approved.',
  },
  onTheAirTv: {
    key: 'tv/on_the_air',
    path: '/tv/on_the_air',
    params: {},
    mediaType: 'tv',
    label: 'On the air',
    description: 'New episodes landing this week.',
  },
  popularTv: {
    key: 'tv/popular',
    path: '/tv/popular',
    params: {},
    mediaType: 'tv',
    label: 'Popular shows',
    description: 'Series dominating the conversation.',
  },
  topRatedTv: {
    key: 'tv/top_rated',
    path: '/tv/top_rated',
    params: {},
    mediaType: 'tv',
    label: 'Top rated shows',
    description: 'The best-reviewed series of all time.',
  },
} as const satisfies Record<string, EndpointDescriptor>;

/** Union of the static endpoint keys. */
export type EndpointKey = keyof typeof ENDPOINTS;

/** Endpoints shown when the "What's popular" toggle is set to Streaming. */
export const MOVIE_ROWS: readonly EndpointKey[] = [
  'nowPlayingMovies',
  'popularMovies',
  'topRatedMovies',
];

/** Endpoints shown when the "What's popular" toggle is set to On TV. */
export const TV_ROWS: readonly EndpointKey[] = ['onTheAirTv', 'popularTv', 'topRatedTv'];

/**
 * Builds the SWR cache key for an endpoint.
 *
 * The key doubles as the cache identity, so it must be stable and unique per
 * distinct request. `search` includes the query and page for that reason.
 *
 * @param descriptor - The endpoint descriptor.
 * @returns A stable cache key string.
 */
export function endpointKey(descriptor: EndpointDescriptor): string {
  return `tmdb:${descriptor.key}`;
}

/**
 * Builds the descriptor for a search request.
 *
 * Search is parameterised, so it cannot live in {@link ENDPOINTS}; this is the
 * one place that constructs a dynamic descriptor.
 *
 * @param query - Raw user input.
 * @param page - 1-based result page.
 * @returns A descriptor for the multi-search endpoint.
 */
export function searchEndpoint(query: string, page = 1): EndpointDescriptor {
  return {
    key: `search/multi:${query.trim().toLowerCase()}:${page}`,
    path: '/search/multi',
    params: {
      query: query.trim(),
      page,
      include_adult: 'false',
    },
    mediaType: 'movie',
    label: 'Search results',
    description: `Matches for “${query.trim()}”.`,
  };
}
