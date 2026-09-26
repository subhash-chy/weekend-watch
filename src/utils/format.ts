/**
 * Pure formatting helpers.
 *
 * Every function here is deterministic, side-effect free and safe to call
 * during render. None of them allocate a `Intl` formatter per call — the
 * formatters are module-level singletons, which matters because these run once
 * per card in long carousels.
 */

import { GENRES } from '@/utils/constants';

/** Cached formatters — `Intl` construction is comparatively expensive. */
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const YEAR_FORMAT = new Intl.DateTimeFormat('en-US', { year: 'numeric' });

/** Fallback shown when TMDB has no release date for an entry. */
export const UNKNOWN_DATE_LABEL = 'Release date TBA';

/**
 * Formats an ISO-8601 date as `12 Mar 2024`.
 *
 * Falls back gracefully rather than throwing: an empty string, an invalid date
 * string, or `null` all yield {@link UNKNOWN_DATE_LABEL}. TMDB frequently
 * returns `""` for unreleased titles, and `new Date("")` is an `Invalid Date`
 * that would otherwise render as "NaN".
 *
 * @param iso - ISO-8601 date string, empty string, or `null`.
 * @returns Formatted date, or the TBA label.
 *
 * @example
 * formatReleaseDate('2024-03-12'); // 'Mar 12, 2024'
 * formatReleaseDate('');           // 'Release date TBA'
 * formatReleaseDate(null);         // 'Release date TBA'
 */
export function formatReleaseDate(iso: string | null | undefined): string {
  if (!iso) return UNKNOWN_DATE_LABEL;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNKNOWN_DATE_LABEL;
  return DATE_FORMAT.format(date);
}

/**
 * Extracts just the four-digit year from an ISO date.
 *
 * @param iso - ISO-8601 date string or `null`.
 * @returns The year as a string, or an empty string when unavailable.
 */
export function formatYear(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return YEAR_FORMAT.format(date);
}

/**
 * Maps TMDB genre ids to human labels, dropping unknown ids.
 *
 * @param ids - Genre ids from a media item.
 * @returns Labels in the order TMDB supplied them, capped at `limit`.
 */
export function genreLabels(ids: readonly number[], limit = 3): readonly string[] {
  const labels: string[] = [];
  for (const id of ids) {
    const label = GENRES[id];
    if (label !== undefined) labels.push(label);
    if (labels.length >= limit) break;
  }
  return labels;
}

/**
 * Converts TMDB's 0–10 vote average into a 0–5 star value.
 *
 * @param voteAverage - TMDB vote average (0–10).
 * @returns Stars out of 5, clamped and rounded to the nearest half.
 *
 * @example
 * toStars(8.3); // 4
 * toStars(11);  // 5
 */
export function toStars(voteAverage: number): number {
  if (!Number.isFinite(voteAverage)) return 0;
  const clamped = Math.min(Math.max(voteAverage, 0), 10);
  return Math.round(clamped) / 2;
}

/**
 * Clamps a number into an inclusive range.
 *
 * @param value - Input value.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns `value` constrained to `[min, max]`.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Builds a percentage string from a 0–1 fraction, for `aria-valuenow`-style
 * attributes and rating bars.
 *
 * @param fraction - Value between 0 and 1.
 * @returns Percentage rounded to the nearest whole number.
 */
export function toPercent(fraction: number): string {
  return `${Math.round(clamp(fraction, 0, 1) * 100)}%`;
}

/**
 * Truncates a string on a word boundary and appends an ellipsis.
 *
 * @param input - Source string.
 * @param maxLength - Maximum length before truncation.
 * @returns The original string when it fits, otherwise a trimmed excerpt.
 */
export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  const cut = input.slice(0, Math.max(0, maxLength));
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Formats a large count compactly, e.g. `12.4K`.
 *
 * @param count - Raw count.
 * @returns Compact representation.
 */
export function formatCompactCount(count: number): string {
  if (!Number.isFinite(count)) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count);
}
