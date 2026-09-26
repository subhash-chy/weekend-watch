/**
 * Catalogue service — the single entry point every hook uses for media data.
 *
 * It hides the live/offline decision, the schema parsing and the error mapping
 * from callers, so a component only ever asks "give me this endpoint" and gets
 * back either a `MediaPage` or a typed failure.
 *
 * This is *server* state. It is deliberately not mirrored into React context:
 * SWR owns caching, deduplication and revalidation, and components subscribe to
 * it locally. See `docs/architecture.md`.
 */

import type { MediaPage } from '@/types/media';
import { shouldUseMockCatalogue } from '@/services/tmdb/config';
import { tmdbFetch, toError } from '@/services/tmdb/client';
import { parseMediaPage, SchemaError } from '@/services/tmdb/schema';
import { endpointKey, searchEndpoint } from '@/services/tmdb/endpoints';
import type { EndpointDescriptor } from '@/services/tmdb/endpoints';
import { getMockPage, searchMockCatalogue } from '@/services/mock/catalog';

/**
 * Artificial delay applied to mock responses.
 *
 * Without it the offline catalogue resolves in the same tick, so loading
 * skeletons and optimistic states would never be visible during development.
 * Set to 0 to disable.
 */
const MOCK_LATENCY_MS = 120;

/**
 * Resolves a `setTimeout` as a promise.
 *
 * @param ms - Milliseconds to wait.
 * @returns A promise that resolves after the delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fetches and normalises one endpoint.
 *
 * @param descriptor - Which endpoint to request.
 * @param signal - Optional `AbortSignal`; cancelling rejects with an error
 *   whose message is safe to ignore.
 * @returns A normalised {@link MediaPage}.
 * @throws {Error} Carries a user-facing `message` and a `kind` discriminant.
 */
export async function fetchCatalogue(
  descriptor: EndpointDescriptor,
  signal?: AbortSignal,
): Promise<MediaPage> {
  if (shouldUseMockCatalogue()) {
    await delay(MOCK_LATENCY_MS);
    return getMockPage(endpointKey(descriptor));
  }

  try {
    const raw = await tmdbFetch(
      descriptor.path,
      descriptor.params,
      signal === undefined ? {} : { signal },
    );
    return parseMediaPage(raw, descriptor.mediaType);
  } catch (cause) {
    throw normaliseError(cause);
  }
}

/**
 * Searches the catalogue.
 *
 * @param query - Raw user input; trimmed before use and ignored when blank.
 * @param page - 1-based result page.
 * @param signal - Optional `AbortSignal`.
 * @returns A normalised {@link MediaPage}.
 * @throws {Error} Carries a user-facing `message` and a `kind` discriminant.
 */
export async function searchCatalogue(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<MediaPage> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { page: 1, results: [], totalPages: 1, totalResults: 0 };
  }

  const descriptor = searchEndpoint(trimmed, page);

  if (shouldUseMockCatalogue()) {
    await delay(MOCK_LATENCY_MS);
    return searchMockCatalogue(trimmed);
  }

  try {
    const raw = await tmdbFetch(
      descriptor.path,
      descriptor.params,
      signal === undefined ? {} : { signal },
    );
    return parseMediaPage(raw, descriptor.mediaType);
  } catch (cause) {
    throw normaliseError(cause);
  }
}

/**
 * Converts anything thrown by the data layer into an `Error` that is safe to
 * render and carries a stable `kind` for branching.
 *
 * @param cause - The thrown value.
 * @returns A normalised error.
 */
function normaliseError(cause: unknown): Error {
  if (cause instanceof SchemaError) {
    return toError({
      kind: 'schema',
      message: 'The Movie Database returned data in an unexpected shape.',
    });
  }
  if (cause instanceof Error && 'kind' in cause) return cause;
  if (cause instanceof Error) {
    return toError({
      kind: 'network',
      message: cause.message || 'Something went wrong. Please try again.',
      status: undefined,
    });
  }
  return toError({
    kind: 'network',
    message: 'Something went wrong. Please try again.',
    status: undefined,
  });
}

/**
 * Derives a short, human-readable headline from a caught error.
 *
 * Used by error boundaries and inline error states so they never render a raw
 * stack trace to a user.
 *
 * @param cause - The thrown value.
 * @returns A single-sentence explanation.
 */
export function describeError(cause: unknown): string {
  if (cause instanceof Error && cause.message.length > 0) {
    return cause.message;
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Whether a caught error is a cancellation rather than a real failure.
 *
 * Abort errors are expected during navigation and rapid retyping; they should
 * never surface as a toast or an error boundary.
 *
 * @param cause - The thrown value.
 * @returns `true` when the request was cancelled.
 */
export function isAbortError(cause: unknown): boolean {
  if (cause instanceof DOMException && cause.name === 'AbortError') return true;
  return (
    cause instanceof Error &&
    'kind' in cause &&
    (cause as { kind: unknown }).kind === 'abort'
  );
}
