/**
 * SWR bindings for the catalogue service.
 *
 * These hooks are the only place in the app that talks to the data layer, and
 * the only place that holds *server* cache state. Nothing here is mirrored into
 * React context — that was the root cause of the original app re-rendering
 * every consumer whenever any list arrived.
 */

import useSWR from 'swr';
import type { SWRConfiguration } from 'swr';
import type { MediaItem, MediaPage } from '@/types/media';
import {
  fetchCatalogue,
  fetchMediaDetails,
  searchCatalogue,
  isAbortError,
} from '@/services/catalog';
import { endpointKey } from '@/services/tmdb/endpoints';
import type { EndpointDescriptor } from '@/services/tmdb/endpoints';

/** Shared SWR behaviour for every list request. */
const LIST_CONFIG: SWRConfiguration = {
  // Refetching a trending list on every tab focus is wasted quota and causes
  // visible content churn under the user's cursor.
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Keeps the previous list on screen while a new one loads, so switching
  // Movies ⇄ TV never flashes an empty rail.
  keepPreviousData: true,
  dedupingInterval: 30_000,
};

/** Shape returned by {@link useCatalogue} and {@link useSearch}. */
export interface CatalogueQuery {
  /** Normalised page, or `undefined` until the first response lands. */
  data: MediaPage | undefined;
  /** Convenience accessor for `data?.results ?? []`. */
  items: readonly MediaPage['results'][number][];
  /** True on the very first load, before any data exists. */
  isLoading: boolean;
  /** True whenever a request is in flight, including revalidation. */
  isValidating: boolean;
  /** The caught error, or `undefined`. Never set for cancellations. */
  error: unknown;
  /** Imperatively re-run the request (used by the "Try again" buttons). */
  retry: () => void;
}

/**
 * Subscribes to a single TMDB list endpoint.
 *
 * @param descriptor - A stable endpoint descriptor from `endpoints.ts`.
 * @returns The query state for that endpoint.
 */
export function useCatalogue(descriptor: EndpointDescriptor): CatalogueQuery {
  const key = endpointKey(descriptor);

  const { data, error, isLoading, isValidating, mutate } = useSWR<MediaPage, Error>(
    key,
    // SWR 2 calls the fetcher with the key as its only argument; it does not
    // hand over an AbortSignal (see the `Fetcher` type in swr's .d.ts).
    // Cancellation is therefore SWR's job: it discards a response whose key no
    // longer matches, so a stale request can never overwrite fresher data.
    () => fetchCatalogue(descriptor),
    LIST_CONFIG,
  );

  return {
    data,
    items: data?.results ?? [],
    isLoading,
    isValidating,
    // Abort errors are navigation artefacts, not failures.
    error: isAbortError(error) ? undefined : error,
    retry: () => {
      void mutate();
    },
  };
}

/**
 * Builds the SWR cache key for a search, or `null` to disable the request.
 *
 * Returning `null` makes SWR skip the fetch entirely, which is how an empty or
 * whitespace-only query avoids a pointless network round trip.
 *
 * @param query - Raw user input.
 * @param page - 1-based page.
 * @returns A cache key, or `null` when there is nothing to search for.
 */
export function searchKey(query: string, page = 1): string | null {
  const trimmed = query.trim();
  if (trimmed.length === 0) return null;
  return `tmdb:search/${trimmed.toLowerCase()}:${page}`;
}

/**
 * Searches the catalogue as the query changes.
 *
 * @param query - Raw user input.
 * @param page - 1-based result page.
 * @returns The query state for the current search.
 */
export function useSearch(query: string, page = 1): CatalogueQuery {
  const key = searchKey(query, page);

  const { data, error, isLoading, isValidating, mutate } = useSWR<MediaPage, Error>(
    key,
    // See the note in useCatalogue: no signal is available here, and SWR keys
    // the cache by query, so an in-flight search for an older term is dropped
    // rather than rendered.
    () => searchCatalogue(query, page),
    { ...LIST_CONFIG, keepPreviousData: false },
  );

  return {
    data,
    items: data?.results ?? [],
    // With a null key SWR reports `isLoading: false`; normalise so callers can
    // rely on a single boolean.
    isLoading: key === null ? false : isLoading,
    isValidating,
    error: isAbortError(error) ? undefined : error,
    retry: () => {
      void mutate();
    },
  };
}

/** Shape returned by {@link useMediaDetails}. */
export interface MediaDetailsQuery {
  /** The entry, or `undefined` until the response lands. */
  data: MediaItem | undefined;
  /** True on the very first load. */
  isLoading: boolean;
  /** The caught error, or `undefined`. Never set for cancellations. */
  error: unknown;
  /** Imperatively re-run the request. */
  retry: () => void;
}

/**
 * Fetches one catalogue entry by id.
 *
 * Backs the watch route, which must resolve from a URL alone. The key is
 * disabled (`null`) when the route params are invalid, so a malformed link
 * renders the not-found state instead of firing a request that cannot succeed.
 *
 * @param mediaType - `movie` or `tv`, or `undefined` when the param is invalid.
 * @param id - Catalogue id, or `undefined` when the param is not numeric.
 * @returns The query state for that entry.
 */
export function useMediaDetails(
  mediaType: 'movie' | 'tv' | undefined,
  id: number | undefined,
): MediaDetailsQuery {
  const key =
    mediaType !== undefined && id !== undefined ? `tmdb:${mediaType}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR<MediaItem, Error>(
    key,
    () => {
      // Both are guaranteed by the key being non-null; the assertion is local
      // and cannot drift from the check above.
      if (mediaType === undefined || id === undefined) {
        throw new Error('mediaType and id are required to fetch details.');
      }
      return fetchMediaDetails(mediaType, id);
    },
    { ...LIST_CONFIG, keepPreviousData: false, dedupingInterval: 5 * 60_000 },
  );

  return {
    data,
    isLoading: key === null ? false : isLoading,
    error: isAbortError(error) ? undefined : error,
    retry: () => {
      void mutate();
    },
  };
}
