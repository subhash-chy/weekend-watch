import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Security headers applied to both the dev server and the production preview
 * server. Static hosts (Netlify/Vercel/Cloudflare Pages) should mirror these
 * values in their own config — see `docs/deployment.md`.
 *
 * The Content-Security-Policy is intentionally split: the preview server ships
 * the strict production policy, while dev relaxes `script-src`/`connect-src`
 * because Vite's HMR client is an inline script that talks to a websocket.
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
} as const;

/**
 * Strict production policy. Nothing is loaded from a third-party origin except
 * TMDB (images + API), and there is no `unsafe-inline` for scripts.
 */
const STRICT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://image.tmdb.org",
  "font-src 'self' data:",
  "connect-src 'self' https://api.themoviedb.org",
  "frame-ancestors 'none'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * Dev policy. Adds the websocket origin Vite's HMR client connects to and
 * allows the inline React-refresh preamble script.
 */
const DEV_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://image.tmdb.org",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https://api.themoviedb.org",
  "form-action 'self'",
].join('; ');

/**
 * Hostnames the dev and preview servers will accept.
 *
 * Vite rejects any request whose `Host` header is not on this list, which is a
 * sensible default for a local machine but breaks development behind a tunnel,
 * a reverse proxy or a cloud sandbox. Rather than hard-coding hostnames here,
 * set `ALLOWED_HOSTS` to a comma-separated list — a leading dot matches all
 * subdomains, e.g. `ALLOWED_HOSTS=.example.com`.
 *
 * Left unset, the default is `true` (accept any host). That is acceptable here
 * because both servers bind to `0.0.0.0` purely so a sandboxed preview can reach
 * them, and neither serves anything beyond the local bundle. Set it explicitly
 * for any deployment that is reachable from an untrusted network.
 */
const ALLOWED_HOSTS: string[] | true =
  process.env.ALLOWED_HOSTS !== undefined
    ? process.env.ALLOWED_HOSTS.split(',')
        .map((host) => host.trim())
        .filter((host) => host.length > 0)
    : true;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Bind to all interfaces so a sandboxed or proxied preview can reach us.
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ALLOWED_HOSTS,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Security-Policy': DEV_CSP,
    },
  },
  preview: {
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ALLOWED_HOSTS,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Security-Policy': STRICT_CSP,
    },
  },
  build: {
    target: 'es2022',
    cssTarget: 'chrome110',
    modulePreload: { polyfill: false },
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        /**
         * Split the framework runtime out of the application bundle so a repeat
         * visit reuses the cached vendor chunk whenever only app code changed.
         *
         * Vite 8 builds on Rolldown, where `manualChunks` must be a function
         * rather than the record form earlier Vite versions accepted.
         *
         * @param moduleId - Absolute id of the module being placed.
         * @returns A chunk name, or `undefined` for default chunking.
         */
        manualChunks: (moduleId: string): string | undefined => {
          if (!moduleId.includes('node_modules')) return undefined;
          if (
            /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(
              moduleId,
            )
          ) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
