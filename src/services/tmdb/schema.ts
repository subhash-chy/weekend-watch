/**
 * Runtime validation and normalisation for TMDB payloads.
 *
 * TypeScript's types disappear at runtime, so a malformed API response would
 * otherwise flow straight into the component tree and blow up deep inside a
 * render. Everything crossing the network boundary is parsed here: invalid
 * entries are dropped, missing fields get safe defaults, and a structurally
 * broken envelope raises a `schema` {@link ServiceError} that the UI renders
 * as a recoverable error state.
 *
 * The validator is hand-rolled rather than a schema library: it is ~100 lines,
 * ships no dependency, and adds nothing to the bundle.
 */

import type { MediaItem, MediaPage, MediaType } from '@/types/media';

/**
 * Type guard for plain objects. Arrays and `null` are explicitly rejected.
 *
 * @param value - Unknown input.
 * @returns `true` when `value` is a non-null, non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads a finite number, coercing numeric strings and rejecting NaN/Infinity.
 *
 * @param record - Source object.
 * @param key - Property name.
 * @param fallback - Value returned when absent or not numeric.
 * @returns The parsed number or `fallback`.
 */
function readNumber(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = record[key];
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Reads a non-empty string, trimming whitespace.
 *
 * @param record - Source object.
 * @param key - Property name.
 * @returns The trimmed string, or `null` when absent/blank.
 */
function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Reads a boolean, defaulting to `false`.
 *
 * @param record - Source object.
 * @param key - Property name.
 * @returns The parsed boolean.
 */
function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

/**
 * Reads an array of numeric genre ids, ignoring anything non-numeric.
 *
 * @param record - Source object.
 * @param key - Property name.
 * @returns A frozen array of genre ids.
 */
function readGenreIds(record: Record<string, unknown>, key: string): readonly number[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is number => typeof id === 'number' && Number.isFinite(id),
  );
}

/** Media types TMDB can report. Anything else is rejected. */
const VALID_MEDIA_TYPES: ReadonlySet<string> = new Set(['movie', 'tv', 'person']);

/**
 * Normalises one raw TMDB entry into a {@link MediaItem}.
 *
 * TMDB's field names differ between endpoints — movies use `title` and
 * `release_date`, TV shows use `name` and `first_air_date` — so both are read
 * and reconciled. Entries without a usable id or title are rejected.
 *
 * @param raw - A single element of a TMDB `results` array.
 * @param fallbackType - Media type to assume when `media_type` is absent, as
 *   it is on endpoints like `/movie/top_rated`.
 * @returns The normalised item, or `null` when the entry is unusable.
 */
export function parseMediaItem(raw: unknown, fallbackType: MediaType): MediaItem | null {
  if (!isRecord(raw)) return null;

  const id = readNumber(raw, 'id', Number.NaN);
  if (!Number.isFinite(id)) return null;

  // People have no title/name in the media shape; they are filtered out here
  // because this app renders media cards, not person cards.
  const reportedType = readString(raw, 'media_type');
  const mediaType: MediaType =
    reportedType !== null && VALID_MEDIA_TYPES.has(reportedType)
      ? (reportedType as MediaType)
      : fallbackType;
  if (mediaType === 'person') return null;

  const title =
    readString(raw, 'title') ??
    readString(raw, 'name') ??
    readString(raw, 'original_title') ??
    readString(raw, 'original_name');
  if (title === null) return null;

  return {
    id,
    mediaType,
    title,
    originalTitle: readString(raw, 'original_title') ?? readString(raw, 'original_name'),
    overview: readString(raw, 'overview') ?? '',
    posterPath: readString(raw, 'poster_path'),
    backdropPath: readString(raw, 'backdrop_path'),
    releaseDate: readString(raw, 'release_date') ?? readString(raw, 'first_air_date'),
    voteAverage: readNumber(raw, 'vote_average', 0),
    voteCount: readNumber(raw, 'vote_count', 0),
    popularity: readNumber(raw, 'popularity', 0),
    genreIds: readGenreIds(raw, 'genre_ids'),
    originalLanguage: readString(raw, 'original_language') ?? 'en',
    adult: readBoolean(raw, 'adult'),
  };
}

/** Error thrown when a TMDB envelope is structurally invalid. */
export class SchemaError extends Error {
  /** Discriminant used by the service layer to build a {@link ServiceError}. */
  readonly kind = 'schema' as const;

  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

/**
 * Parses a full TMDB paginated response.
 *
 * @param raw - Decoded JSON from the network.
 * @param fallbackType - Media type for entries lacking `media_type`.
 * @returns A normalised {@link MediaPage}.
 * @throws {SchemaError} When the envelope is not an object, or `results` is
 *   missing or not an array.
 */
export function parseMediaPage(raw: unknown, fallbackType: MediaType): MediaPage {
  if (!isRecord(raw)) {
    throw new SchemaError('Expected a JSON object from TMDB.');
  }
  const results = raw['results'];
  if (!Array.isArray(results)) {
    throw new SchemaError('TMDB response is missing a "results" array.');
  }

  const items = results
    .map((entry) => parseMediaItem(entry, fallbackType))
    .filter((item): item is MediaItem => item !== null);

  return {
    page: readNumber(raw, 'page', 1),
    results: items,
    totalPages: readNumber(raw, 'total_pages', 1),
    totalResults: readNumber(raw, 'total_results', items.length),
  };
}
