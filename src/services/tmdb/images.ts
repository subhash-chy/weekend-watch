/**
 * Image URL construction for TMDB's CDN, plus offline placeholders.
 *
 * Every `<img>` in the app routes through here. That matters for two reasons:
 * the URLs carry explicit size presets so width/height attributes are always
 * correct (CLS 0), and `srcSet` is generated consistently for responsive
 * downloads instead of always pulling the largest rendition.
 */

import type { MediaItem } from '@/types/media';
import { TMDB_IMAGE_BASE_URL } from '@/services/tmdb/config';

/** Poster renditions TMDB exposes, in ascending width. */
const POSTER_WIDTHS = [185, 342, 500] as const;

/** Backdrop renditions TMDB exposes, in ascending width. */
const BACKDROP_WIDTHS = [300, 780, 1280] as const;

/** Poster aspect ratio TMDB serves (2:3). */
export const POSTER_ASPECT = { width: 2, height: 3 } as const;

/** Backdrop aspect ratio TMDB serves (16:9). */
export const BACKDROP_ASPECT = { width: 16, height: 9 } as const;

/**
 * Builds a TMDB poster URL.
 *
 * @param path - Poster path from a {@link MediaItem}, e.g. `/abc.jpg`.
 * @param width - One of TMDB's poster widths; defaults to 342.
 * @returns The absolute URL, or `null` when `path` is null/blank.
 */
export function posterUrl(path: string | null, width = 342): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/w${width}${path}`;
}

/**
 * Builds a TMDB backdrop URL.
 *
 * @param path - Backdrop path from a {@link MediaItem}.
 * @param width - One of TMDB's backdrop widths; defaults to 1280.
 * @returns The absolute URL, or `null` when `path` is null/blank.
 */
export function backdropUrl(path: string | null, width = 1280): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/w${width}${path}`;
}

/**
 * Builds a `srcSet` for a poster so the browser picks the smallest rendition
 * that satisfies the device pixel ratio.
 *
 * @param path - Poster path from a {@link MediaItem}.
 * @returns A `srcSet` string, or `undefined` when there is no poster.
 */
export function posterSrcSet(path: string | null): string | undefined {
  if (!path) return undefined;
  // `path` is non-null here, so each URL is too — building them inline keeps
  // that guarantee visible to the type checker instead of behind a `| null`.
  return POSTER_WIDTHS.map((w) => `${TMDB_IMAGE_BASE_URL}/w${w}${path} ${w}w`).join(', ');
}

/**
 * Builds a `srcSet` for a backdrop.
 *
 * @param path - Backdrop path from a {@link MediaItem}.
 * @returns A `srcSet` string, or `undefined` when there is no backdrop.
 */
export function backdropSrcSet(path: string | null): string | undefined {
  if (!path) return undefined;
  return BACKDROP_WIDTHS.map((w) => `${TMDB_IMAGE_BASE_URL}/w${w}${path} ${w}w`).join(
    ', ',
  );
}

/**
 * Stable 32-bit string hash (FNV-1a), used to derive a deterministic palette
 * for placeholder artwork so the same title always gets the same colours.
 *
 * @param input - Arbitrary string.
 * @returns A non-negative integer.
 */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Palettes used by placeholder artwork; chosen by title hash. */
const PLACEHOLDER_PALETTES: readonly (readonly [string, string])[] = [
  ['#1b2a4a', '#3d5a99'],
  ['#2a1436', '#7a3b6e'],
  ['#0f2f33', '#2c7a7b'],
  ['#3a1f22', '#a34a4a'],
  ['#1d2b3a', '#4a6fa5'],
  ['#2e2418', '#a37b3d'],
  ['#152b2b', '#3f8f7a'],
  ['#301c3f', '#6b4b9e'],
];

/** Fallback used if the palette lookup ever comes up empty. */
const DEFAULT_PALETTE: readonly [string, string] = ['#1b2a4a', '#3d5a99'];

/**
 * Generates an inline SVG data URI used when no artwork is available.
 *
 * Keeping this as a data URI means zero network requests, zero broken-image
 * icons, and — because the SVG has an intrinsic 2:3 viewBox — no layout shift.
 *
 * @param seed - String used to pick a palette deterministically.
 * @returns A `data:image/svg+xml` URL.
 */
export function placeholderPoster(seed: string): string {
  const palette = PLACEHOLDER_PALETTES[hashString(seed) % PLACEHOLDER_PALETTES.length];
  const [from, to] = palette ?? DEFAULT_PALETTE;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 342 513" ` +
    `width="342" height="513" role="img">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="342" height="513" fill="url(#g)"/>` +
    `<g fill="rgba(255,255,255,0.09)">` +
    `<circle cx="252" cy="118" r="96"/><circle cx="76" cy="410" r="128"/></g>` +
    `<g fill="rgba(255,255,255,0.16)">` +
    `<rect x="46" y="392" width="150" height="10" rx="5"/>` +
    `<rect x="46" y="416" width="104" height="10" rx="5"/></g></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Resolves the best available poster `src` for a media item, falling back to
 * generated artwork when TMDB has none (or when running on the mock catalogue).
 *
 * @param item - The media item to render.
 * @returns A URL safe to place in `<img src>`.
 */
export function resolvePosterSrc(item: MediaItem): string {
  return posterUrl(item.posterPath, 342) ?? placeholderPoster(item.title);
}

/**
 * Resolves a `srcSet` for a media item's poster.
 *
 * @param item - The media item to render.
 * @returns A `srcSet` string, or `undefined` when using generated artwork
 *   (which needs no alternative renditions).
 */
export function resolvePosterSrcSet(item: MediaItem): string | undefined {
  return posterSrcSet(item.posterPath);
}

/**
 * Resolves a backdrop `src` for hero artwork, falling back to the poster and
 * then to generated artwork.
 *
 * @param item - The media item to render.
 * @returns A URL safe to place in `<img src>`.
 */
export function resolveBackdropSrc(item: MediaItem): string {
  return (
    backdropUrl(item.backdropPath, 1280) ??
    posterUrl(item.posterPath, 500) ??
    placeholderPoster(item.title)
  );
}
