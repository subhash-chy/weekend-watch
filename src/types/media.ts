/**
 * Domain types for the media catalogue.
 *
 * These are the *normalised* shapes the UI consumes. They are deliberately
 * decoupled from TMDB's wire format (which is snake_case and full of optional
 * fields): `services/tmdb/schema.ts` owns the translation, so a TMDB schema
 * change can never silently corrupt a component's props.
 */

/** TMDB distinguishes movies, TV shows and people in every list endpoint. */
export type MediaType = 'movie' | 'tv' | 'person';

/**
 * A single catalogue entry. `title` is always populated for UI use; for TV
 * shows it is sourced from TMDB's `name` field during normalisation.
 */
export interface MediaItem {
  /** Stable TMDB identifier — safe to use as a React key. */
  id: number;
  mediaType: MediaType;
  /** Human-readable title. Never empty: falls back to the original title. */
  title: string;
  /** Title in the original language, when TMDB provides one. */
  originalTitle: string | null;
  /** Synopsis. May be empty for sparse catalogue entries. */
  overview: string;
  /** TMDB poster path (no host/size prefix) or `null` when none exists. */
  posterPath: string | null;
  /** TMDB backdrop path or `null`. */
  backdropPath: string | null;
  /** ISO-8601 date, or `null` when unreleased/unknown. */
  releaseDate: string | null;
  /** 0–10 as reported by TMDB. */
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: readonly number[];
  originalLanguage: string;
  adult: boolean;
}

/** A paginated TMDB result set. */
export interface MediaPage {
  page: number;
  results: readonly MediaItem[];
  totalPages: number;
  totalResults: number;
}

/** What the "What's popular" toggle switches between. */
export type CatalogueKind = 'streaming' | 'tv';

/** Severity levels understood by the toast system. */
export type ToastTone = 'info' | 'success' | 'warning' | 'error';

/** A toast queued by any part of the app. */
export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string | undefined;
}

/**
 * Narrowed error surface for the data layer. Components check `kind` rather
 * than sniffing `Error` subclasses, which keeps error UI declarative.
 */
export type ServiceError =
  | { kind: 'missing-key'; message: string }
  | { kind: 'network'; message: string; status?: number | undefined }
  | { kind: 'http'; message: string; status: number }
  | { kind: 'abort'; message: string }
  | { kind: 'schema'; message: string };
