/**
 * TMDB endpoint configuration.
 *
 * Centralises every decision about *how* the app authenticates and where it
 * points, so the client never reads `import.meta.env` directly and tests can
 * swap the whole surface by mocking this module.
 */

/** TMDB's v3 REST origin. */
export const DEFAULT_TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/** TMDB's image CDN origin. */
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Resolved credentials and base URL for the current build.
 *
 * `accessToken` takes precedence over `apiKey` because a bearer header keeps
 * the credential out of URLs — which matters because URLs end up in browser
 * history, referrer headers and server logs.
 */
export interface TmdbConfig {
  baseUrl: string;
  accessToken: string | null;
  apiKey: string | null;
  /** True when at least one credential is present. */
  isConfigured: boolean;
}

/**
 * Reads credentials from the build-time environment.
 *
 * Values are trimmed and empty strings are normalised to `null` so a
 * `.env` containing `VITE_PUBLIC_TMDB_API_KEY=` does not masquerade as a key.
 *
 * @returns The resolved {@link TmdbConfig}.
 */
export function getTmdbConfig(): TmdbConfig {
  const env = import.meta.env;
  const rawToken = env.VITE_TMDB_READ_ACCESS_TOKEN?.trim();
  const rawKey = env.VITE_PUBLIC_TMDB_API_KEY?.trim();
  const accessToken = rawToken && rawToken.length > 0 ? rawToken : null;
  const apiKey = rawKey && rawKey.length > 0 ? rawKey : null;

  return {
    baseUrl: env.VITE_TMDB_BASE_URL?.trim() || DEFAULT_TMDB_BASE_URL,
    accessToken,
    apiKey,
    isConfigured: accessToken !== null || apiKey !== null,
  };
}

/**
 * Whether the offline mock catalogue should be used.
 *
 * True when no credential is configured, or when the app is explicitly asked
 * to run offline via `VITE_USE_MOCK_CATALOGUE=1`.
 *
 * @returns `true` to serve mock data instead of calling TMDB.
 */
export function shouldUseMockCatalogue(): boolean {
  if (import.meta.env.VITE_USE_MOCK_CATALOGUE?.trim() === '1') return true;
  return !getTmdbConfig().isConfigured;
}
