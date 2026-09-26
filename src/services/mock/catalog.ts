/**
 * Offline mock catalogue.
 *
 * The app renders real TMDB data whenever a credential is configured. Without
 * one — a fresh clone, CI, or a sandbox with no network — every list resolves
 * to the deterministic fixtures below instead of failing. This keeps the UI
 * exercisable end to end with no secrets, and gives the test suite stable
 * inputs.
 *
 * Artwork is intentionally omitted (`posterPath: null`) so the offline path
 * exercises the same generated-placeholder code real missing artwork would.
 */

import type { MediaItem, MediaPage, MediaType } from '@/types/media';

/** Minimal fixture shape before deterministic fields are filled in. */
interface Fixture {
  title: string;
  year: number;
  genres: readonly number[];
  overview: string;
}

/** Curated movie fixtures. Titles are invented; nothing here is TMDB data. */
const MOVIE_FIXTURES: readonly Fixture[] = [
  {
    title: 'Neon Meridian',
    year: 2025,
    genres: [878, 28],
    overview:
      'A courier smuggles a memory across a city that has forgotten how to dream.',
  },
  {
    title: 'The Quiet Orchard',
    year: 2024,
    genres: [18, 10749],
    overview: 'Two siblings return home to settle an inheritance neither of them wants.',
  },
  {
    title: 'Saltwater Kings',
    year: 2025,
    genres: [12, 18],
    overview: 'A fishing dynasty fractures when the youngest daughter takes the helm.',
  },
  {
    title: 'Paper Lanterns',
    year: 2023,
    genres: [16, 10751],
    overview:
      'A lantern maker discovers her creations remember the wishes made upon them.',
  },
  {
    title: 'Midnight Cartography',
    year: 2025,
    genres: [9648, 53],
    overview: 'A mapmaker keeps drawing streets that appear the following morning.',
  },
  {
    title: 'Iron Harvest',
    year: 2024,
    genres: [28, 53],
    overview: 'An ex-soldier takes one last contract to buy back her village.',
  },
  {
    title: 'The Understudy',
    year: 2025,
    genres: [35, 18],
    overview:
      'A struggling actor finally gets the part, and the previous lead disagrees.',
  },
  {
    title: 'Glasshouse Protocol',
    year: 2026,
    genres: [878, 9648],
    overview: 'An orbital station wakes its crew a decade early, minus one of them.',
  },
  {
    title: 'Copper Canyon',
    year: 2023,
    genres: [37, 18],
    overview: 'A retired marshal is dragged back by a debt he swore was settled.',
  },
  {
    title: 'Small Hours',
    year: 2025,
    genres: [10749, 18],
    overview: 'Two strangers share one long night and one unlikely promise.',
  },
  {
    title: 'The Lighthouse Ledger',
    year: 2024,
    genres: [27, 9648],
    overview: 'Every keeper has gone missing, and the logbook keeps writing itself.',
  },
  {
    title: 'Velocity Season',
    year: 2026,
    genres: [28, 12],
    overview: 'A rookie driver joins a team that has never once finished a race.',
  },
  {
    title: 'Ash and Amber',
    year: 2024,
    genres: [14, 18],
    overview:
      'An alchemist trades her memories for the one formula that could save her city.',
  },
  {
    title: 'Nightshift Radio',
    year: 2025,
    genres: [10402, 35],
    overview: 'A dying radio station gets one last impossible caller.',
  },
  {
    title: 'The Cartwright Sisters',
    year: 2023,
    genres: [18, 36],
    overview: 'Three sisters, one factory, and a century of unsaid things.',
  },
  {
    title: 'Zero Kelvin',
    year: 2026,
    genres: [878, 53],
    overview: 'A research team under the ice finds a structure that predates the ice.',
  },
  {
    title: 'Bloom & Ruin',
    year: 2025,
    genres: [14, 12],
    overview: 'A gardener can resurrect anything, and the price keeps climbing.',
  },
  {
    title: 'The Longest Weekend',
    year: 2024,
    genres: [35, 10749],
    overview: 'Four friends, one road trip, and a secret that will not stay buried.',
  },
  {
    title: 'Hollow Signal',
    year: 2025,
    genres: [27, 878],
    overview: 'A broadcast that only exists between 3 and 4 a.m.',
  },
  {
    title: 'Saffron Skies',
    year: 2026,
    genres: [18, 36],
    overview: 'A spice merchant charts a route that three empires want for themselves.',
  },
];

/** Curated TV fixtures. */
const TV_FIXTURES: readonly Fixture[] = [
  {
    title: 'Harbour Lights',
    year: 2025,
    genres: [18, 80],
    overview: 'A coastal town detective reopens the case that ended her career.',
  },
  {
    title: 'The Cartographers',
    year: 2024,
    genres: [10765, 12],
    overview: 'A guild maps worlds that were never meant to be found.',
  },
  {
    title: 'Static',
    year: 2025,
    genres: [9648, 18],
    overview: 'A podcast team unravels a disappearance while broadcasting it.',
  },
  {
    title: 'Folded City',
    year: 2026,
    genres: [10765, 18],
    overview: 'Two versions of one metropolis occupy the same address.',
  },
  {
    title: 'The Sous Chef',
    year: 2024,
    genres: [35, 18],
    overview: 'A chaotic kitchen, a rigid owner, and one very stubborn apprentice.',
  },
  {
    title: 'Wintermark',
    year: 2025,
    genres: [14, 18],
    overview: 'A frozen kingdom wakes after a hundred years of sleep.',
  },
  {
    title: 'Deep Field',
    year: 2026,
    genres: [99, 878],
    overview: 'Astronomers chase a signal that keeps answering back.',
  },
  {
    title: 'Precinct Nine',
    year: 2023,
    genres: [80, 18],
    overview: 'The worst-assigned unit in the city solves the cases nobody wants.',
  },
  {
    title: 'The Glass Atelier',
    year: 2025,
    genres: [18, 10751],
    overview: 'Three generations of glassblowers, one family secret.',
  },
  {
    title: 'Orbit & Ash',
    year: 2026,
    genres: [10765, 53],
    overview: 'A colony ship arrives early, and the manifest is wrong.',
  },
  {
    title: 'Tuesday Diner',
    year: 2024,
    genres: [35, 18],
    overview: "One diner, one night a week, everybody else's problems.",
  },
  {
    title: 'The Undergrowth',
    year: 2025,
    genres: [27, 9648],
    overview: 'A national park ranger tracks something the park does not admit exists.',
  },
  {
    title: 'Signal Fire',
    year: 2023,
    genres: [18, 36],
    overview: 'A resistance broadcaster keeps a country awake under occupation.',
  },
  {
    title: 'Lantern District',
    year: 2026,
    genres: [80, 18],
    overview: 'A neon-drenched quarter where every favour has a ledger.',
  },
  {
    title: 'The Last Archivist',
    year: 2025,
    genres: [99, 18],
    overview: 'One woman is responsible for everything a civilisation chose to forget.',
  },
  {
    title: 'Copperline',
    year: 2024,
    genres: [37, 18],
    overview: 'A railroad town learns what progress actually costs.',
  },
  {
    title: 'Blue Hour Bureau',
    year: 2026,
    genres: [10765, 9648],
    overview: 'An agency investigates the hour that does not officially exist.',
  },
  {
    title: 'Saffron Route',
    year: 2025,
    genres: [12, 36],
    overview: 'A caravan, a war, and the most valuable spice in the known world.',
  },
  {
    title: 'Paper Crown',
    year: 2023,
    genres: [18, 10759],
    overview: 'A minor royal inherits a throne that everyone agrees is symbolic.',
  },
  {
    title: 'Nightmarket',
    year: 2026,
    genres: [35, 80],
    overview: 'Two rival stall owners accidentally take down a syndicate.',
  },
];

/** Deterministic pseudo-random generator (mulberry32). */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Expands a fixture into a fully-populated {@link MediaItem}.
 *
 * All numeric fields are derived from the fixture's index so repeated calls
 * are stable — the mock catalogue never changes between renders or reloads.
 *
 * @param fixture - Source fixture.
 * @param index - Position in the source list; seeds the generator.
 * @param mediaType - Whether this is a movie or a TV show.
 * @returns A complete media item.
 */
function buildItem(fixture: Fixture, index: number, mediaType: MediaType): MediaItem {
  const random = createRandom(index * 7919 + 13);
  const voteAverage = Math.round((5.4 + random() * 4.2) * 10) / 10;
  const voteCount = Math.floor(120 + random() * 4800);
  const month = 1 + Math.floor(random() * 12);
  const day = 1 + Math.floor(random() * 27);

  return {
    id: (mediaType === 'movie' ? 10_000 : 20_000) + index,
    mediaType,
    title: fixture.title,
    originalTitle: fixture.title,
    overview: fixture.overview,
    posterPath: null,
    backdropPath: null,
    releaseDate: `${fixture.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    voteAverage,
    voteCount,
    popularity: Math.round(random() * 900 * 100) / 100,
    genreIds: fixture.genres,
    originalLanguage: 'en',
    adult: false,
  };
}

/** Expanded movie catalogue. */
export const MOCK_MOVIES: readonly MediaItem[] = MOVIE_FIXTURES.map((fixture, index) =>
  buildItem(fixture, index, 'movie'),
);

/** Expanded TV catalogue. */
export const MOCK_TV: readonly MediaItem[] = TV_FIXTURES.map((fixture, index) =>
  buildItem(fixture, index, 'tv'),
);

/**
 * Mixed trending list. Interleaves the two catalogues so the hero carousel and
 * the "What's popular" filter both have something to work with.
 */
export const MOCK_TRENDING: readonly MediaItem[] = (() => {
  const merged: MediaItem[] = [];
  const length = Math.max(MOCK_MOVIES.length, MOCK_TV.length);
  for (let i = 0; i < length; i += 1) {
    const movie = MOCK_MOVIES[i];
    const show = MOCK_TV[i];
    if (movie !== undefined) merged.push(movie);
    if (show !== undefined) merged.push(show);
  }
  return merged;
})();

/**
 * Wraps a slice of items in a {@link MediaPage} envelope.
 *
 * @param results - Items for this page.
 * @param page - 1-based page number.
 * @returns A page-shaped result.
 */
function toPage(results: readonly MediaItem[], page = 1): MediaPage {
  return {
    page,
    results,
    totalPages: 1,
    totalResults: results.length,
  };
}

/**
 * Resolves the mock page for a given endpoint key.
 *
 * Unknown keys fall back to the trending list so a new endpoint added to
 * `endpoints.ts` degrades gracefully offline instead of rendering empty.
 *
 * @param key - Endpoint key, e.g. `tmdb:movie/popular`.
 * @returns A mock {@link MediaPage}.
 */
export function getMockPage(key: string): MediaPage {
  if (key.endsWith('trending/all/day') || key.startsWith('tmdb:search/')) {
    return toPage(MOCK_TRENDING);
  }
  if (key.includes('/tv/')) return toPage(MOCK_TV);
  if (key.includes('/movie/')) return toPage(MOCK_MOVIES);
  return toPage(MOCK_TRENDING);
}

/**
 * Filters the mock catalogue the way TMDB's multi-search would.
 *
 * Matches on title and overview, case-insensitively, and preserves the
 * `media_type` mix so search results exercise the movie/TV branching.
 *
 * @param query - Raw search input.
 * @returns A mock {@link MediaPage} of matches.
 */
export function searchMockCatalogue(query: string): MediaPage {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return toPage([]);

  const matches = MOCK_TRENDING.filter(
    (item) =>
      item.title.toLowerCase().includes(needle) ||
      item.overview.toLowerCase().includes(needle),
  );
  return toPage(matches);
}
