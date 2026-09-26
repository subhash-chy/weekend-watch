# Deployment

## Static hosting

`npm run build` emits a fully static `dist/`. There is no server component.

| Host              | Build command   | Output | SPA fallback                |
| ----------------- | --------------- | ------ | --------------------------- |
| Vercel            | `npm run build` | `dist` | Framework preset: Vite      |
| Netlify           | `npm run build` | `dist` | `netlify.toml` redirect     |
| Cloudflare Pages  | `npm run build` | `dist` | Automatic for SPAs          |
| Any static server | `npm run build` | `dist` | Serve `index.html` for `/*` |

The SPA fallback matters: `/search?query=neon` is a client route, so the host
must serve `index.html` for unknown paths rather than 404ing.

## Security headers

`vite.config.ts` applies these to the dev and preview servers. **A static host
ignores them** — mirror them in the host's own config.

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Content-Security-Policy

Production:

```
default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self';
style-src 'self' 'unsafe-inline'; img-src 'self' data: https://image.tmdb.org;
font-src 'self' data:; media-src 'self' blob: https://storage.googleapis.com;
connect-src 'self' https://api.themoviedb.org; frame-ancestors 'none';
form-action 'self'; upgrade-insecure-requests
```

Three deliberate choices:

- **No `unsafe-inline` for scripts.** This is why fonts and images are
  self-hosted rather than pulled from a CDN.
- **`style-src 'unsafe-inline'` is retained.** Vite injects critical CSS and
  CSS Modules emit `<style>` tags; removing it would require nonce plumbing that
  a static host cannot supply. Styles are never built from user input.
- **`media-src` names the playback origins.** The in-app player fetches streams
  directly, so any origin serving media must be listed here or the browser
  blocks the request before the player ever sees an error. `blob:` is included
  because MediaSource-based playback hands the element an object URL. Add your
  own CDN here when you set `VITE_PLAYBACK_BASE_URL`.
- **`frame-ancestors 'none'`** plus `X-Frame-Options: DENY` blocks
  clickjacking.

The dev policy additionally allows `ws:`/`wss:` in `connect-src` and
`'unsafe-inline'` in `script-src`, because Vite's HMR client is an inline script
that opens a websocket.

#### Netlify example

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Resource-Policy = "same-origin"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    Content-Security-Policy = "default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://image.tmdb.org; font-src 'self' data:; media-src 'self' blob: https://storage.googleapis.com; connect-src 'self' https://api.themoviedb.org; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests"

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

## Caching

Every emitted asset is content-hashed (`index-abc123.js`), so they can be
cached forever. Only `index.html` must not be:

```
/*            Cache-Control: public, max-age=31536000, immutable
/index.html   Cache-Control: no-cache
```

## Secrets

There are no secrets. Every `VITE_*` variable is **inlined into the client
bundle** — treat it as public. TMDB's v4 read token is a _read-only_ credential
by design, but a production deployment should still proxy TMDB through a server
edge function so the token is not embedded in shipped JavaScript. That is out of
scope for a static deployment and is flagged as a known limitation.

## Verifying a deploy

```bash
npm run verify      # prettier + eslint + tsc + tests + build
npm run lighthouse  # needs a local Chrome; see docs/toolchain.md
```
