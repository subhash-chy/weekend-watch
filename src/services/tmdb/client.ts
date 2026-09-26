/**
 * HTTP client for TMDB.
 *
 * Responsibilities:
 *  - attaches credentials (bearer header preferred over a query parameter),
 *  - aborts in-flight requests when the caller's `AbortSignal` fires, so
 *    navigating away can never resolve into an unmounted component,
 *  - converts every failure into a typed {@link ServiceError} instead of
 *    leaking a raw `TypeError` to React.
 */

import type { ServiceError } from '@/types/media';
import { getTmdbConfig } from '@/services/tmdb/config';
import { SchemaError } from '@/services/tmdb/schema';

/** Upper bound on a single request before it is treated as a network failure. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Builds the fully-qualified URL for a TMDB path.
 *
 * When only a v3 API key is available it is appended as a query parameter,
 * because v3 keys cannot be used as bearer tokens.
 *
 * @param path - API path beginning with `/`, e.g. `/trending/all/day`.
 * @param params - Extra query parameters.
 * @returns The absolute request URL.
 */
export function buildUrl(
  path: string,
  params: Readonly<Record<string, string | number>> = {},
): string {
  const { baseUrl, accessToken, apiKey } = getTmdbConfig();
  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set('language', 'en-US');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  if (accessToken === null && apiKey !== null) {
    url.searchParams.set('api_key', apiKey);
  }
  return url.toString();
}

/**
 * Builds request headers, including the bearer token when configured.
 *
 * @returns Headers for a TMDB request.
 */
function buildHeaders(): HeadersInit {
  const { accessToken } = getTmdbConfig();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (accessToken !== null) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

/** Options accepted by {@link tmdbFetch}. */
export interface TmdbFetchOptions {
  /** Propagated to the underlying fetch; also drives the timeout. */
  signal?: AbortSignal | undefined;
}

/**
 * Performs a GET against TMDB and decodes the JSON body.
 *
 * @param path - API path beginning with `/`.
 * @param params - Query parameters.
 * @param options - Optional abort signal.
 * @returns The decoded JSON body.
 * @throws {Error} A `ServiceError`-shaped error. Callers in the SWR fetcher
 *   catch this and rethrow a normal `Error` carrying the user-facing message.
 */
export async function tmdbFetch(
  path: string,
  params: Readonly<Record<string, string | number>> = {},
  options: TmdbFetchOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('TMDB request timed out.')),
    REQUEST_TIMEOUT_MS,
  );

  // Forward an externally-provided abort to our controller so a single signal
  // can cancel both the caller's intent and our timeout.
  const onOuterAbort = (): void => controller.abort();
  options.signal?.addEventListener('abort', onOuterAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await fetch(buildUrl(path, params), {
        method: 'GET',
        headers: buildHeaders(),
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted || options.signal?.aborted) {
        throw toError({ kind: 'abort', message: 'Request cancelled.' });
      }
      throw toError({
        kind: 'network',
        message: 'Cannot reach The Movie Database. Check your connection.',
        status: undefined,
      });
    }

    if (!response.ok) {
      throw toError({
        kind: 'http',
        message: describeStatus(response.status),
        status: response.status,
      });
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onOuterAbort);
  }
}

/**
 * Maps a TMDB failure onto a user-facing message.
 *
 * @param status - HTTP status code.
 * @returns A short sentence suitable for display.
 */
function describeStatus(status: number): string {
  switch (status) {
    case 401:
      return 'The TMDB credentials were rejected. Check your API key.';
    case 404:
      return 'That resource no longer exists on The Movie Database.';
    case 429:
      return 'The Movie Database is rate limiting us. Try again shortly.';
    default:
      return status >= 500
        ? 'The Movie Database is having trouble. Try again shortly.'
        : `Request failed (HTTP ${status}).`;
  }
}

/**
 * Converts a {@link ServiceError} into a throwable `Error` whose `message` is
 * already safe to show a user, while preserving the discriminant for callers
 * that need to branch on it.
 *
 * @param error - The typed error descriptor.
 * @returns An `Error` carrying `message` and a `kind` property.
 */
export function toError(error: ServiceError): Error {
  const err = new Error(error.message) as Error & { kind: ServiceError['kind'] };
  err.kind = error.kind;
  return err;
}

/**
 * Narrows an unknown thrown value into a `ServiceError['kind']`.
 *
 * @param cause - Whatever was thrown.
 * @returns The discriminant, defaulting to `network`.
 */
export function errorKindOf(cause: unknown): ServiceError['kind'] {
  if (cause instanceof SchemaError) return 'schema';
  if (cause instanceof Error && 'kind' in cause) {
    const kind = (cause as { kind: unknown }).kind;
    if (
      kind === 'missing-key' ||
      kind === 'network' ||
      kind === 'http' ||
      kind === 'abort' ||
      kind === 'schema'
    ) {
      return kind;
    }
  }
  return 'network';
}
