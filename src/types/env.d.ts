/// <reference types="vite/client" />

/**
 * Environment contract.
 *
 * Only `VITE_`-prefixed variables are inlined into the client bundle, so
 * anything declared here is public by definition. Never put a secret here:
 * TMDB read-access tokens used from a browser are, unavoidably, public —
 * restrict them by referrer in the TMDB dashboard.
 */
interface ImportMetaEnv {
  /** TMDB v4 read access token. Sent as a bearer header. Preferred. */
  readonly VITE_TMDB_READ_ACCESS_TOKEN?: string;
  /** TMDB v3 API key. Sent as a query parameter. Legacy fallback. */
  readonly VITE_PUBLIC_TMDB_API_KEY?: string;
  /** Base API origin. Only ever overridden in tests. */
  readonly VITE_TMDB_BASE_URL?: string;
  /** Set to `"1"` to force the offline mock catalogue even with a key present. */
  readonly VITE_USE_MOCK_CATALOGUE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
