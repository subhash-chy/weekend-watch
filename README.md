# Weekend Watch

A streaming-discovery front end. Browse trending films and series, filter by
catalogue, and search — built to be a reference for accessible, high-performance
React rather than a feature showcase.

It runs with **no API key and no network**: an offline demo catalogue is built
in, so the whole UI is exercisable out of the box. Give it a TMDB credential and
real data takes over automatically.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

That's it — no `.env` needed. To use live TMDB data:

```bash
cp .env.example .env.local
# set VITE_TMDB_READ_ACCESS_TOKEN, then:
npm run dev
```

## Commands

| Command                     | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `npm run dev`               | Dev server with HMR                                 |
| `npm run build`             | Type-check, then produce `dist/`                    |
| `npm run preview`           | Serve `dist/` with production security headers      |
| `npm run verify`            | **The gate.** Format, lint, type-check, test, build |
| `npm run test`              | 83 tests (Vitest + happy-dom)                       |
| `npm run coverage`          | Test coverage report                                |
| `npm run lighthouse`        | Audit three routes against a 95-score threshold     |
| `node scripts/contrast.mjs` | Verify every text/background pair meets WCAG AA     |

`npm run verify` is what CI should run. `lighthouse` is separate because it needs
a Chrome binary.

## What it does

- **Discovery** — a hero carousel of trending titles plus scroll-snapped rails
  for now-playing, popular and top-rated content, with a Streaming / On TV
  filter.
- **Playback** — a custom in-app player at `/watch/:mediaType/:id`: play/pause,
  scrubbing, ±10 s skips, volume, speed, captions, picture-in-picture and
  fullscreen, all driven by a plain `<video>` element. No embed, no iframe, no
  player SDK.
- **Search** — debounced, URL-driven (`/search?query=…`), so results are
  shareable and Back works.
- **Details** — a modal with a focus trap, focus restore and scroll lock.
- **Feedback everywhere** — skeletons while loading, empty states for no
  results, toasts for errors, and a route-level error boundary.

## Playback

The player is built directly on `<video>`. There is no third-party player, no
YouTube embed and no iframe — which is also why the transport can look like the
rest of the app.

**What actually plays.** TMDB is a metadata service: it publishes posters,
synopses and ratings, and never video files. There is no legal source of
commercial movie streams to point a player at, so the demo catalogue resolves to
openly licensed films — the Blender Foundation's CC-BY open movies and Google's
public test clips — and the player is genuinely exercised end to end.

Resolution is isolated in `services/playback/`, so pointing it at real licensed
media touches one file and no UI:

```bash
# every title then resolves to ${base}/${mediaType}/${id}.mp4
VITE_PLAYBACK_BASE_URL=https://media.example.com
```

Two requirements for your own media: files must be MP4/WebM the browser can
decode, and the server must honour HTTP range requests or seeking will not work.
The origin must also be added to `media-src` in the Content-Security-Policy.

A title with no resolvable source renders an explanation instead of a Play
button. Set `VITE_PLAYBACK_DISABLED=1` to exercise that state.

The player chunk is **4.8 KB gzipped** and loads only when someone actually
plays something.

### Keyboard

| Keys          | Action                    |
| ------------- | ------------------------- |
| `Space` / `K` | Play / pause              |
| `←` / `→`     | Skip 10 seconds           |
| `↑` / `↓`     | Volume                    |
| `M`           | Mute                      |
| `F`           | Full screen               |
| `C`           | Captions (when available) |
| `Home`/`End`  | Jump to start / end       |

The seek bar and volume slider are real `<input type="range">` elements that are
visually replaced, so native keyboard operation, `role="slider"` semantics and
screen-reader value announcements come for free.

## Architecture

```
src/
├── app/          Composition root: entry, providers, router, shell
├── components/   Reusable UI (layout/, ui/)
├── features/     Domain modules: discovery, search, notifications, error
├── hooks/        Reusable hooks
├── services/     All data access: tmdb/ client + schema, mock/ fixtures
├── styles/       Design tokens, globals, fonts, animations
├── types/        Domain types and the environment contract
└── utils/        Pure helpers
```

Dependencies point one way: `app → features → components/hooks → services/utils`.

**Server cache is not UI state.** Fetched lists live in SWR keyed by endpoint;
the URL holds `?query=` and `?catalogue=`; local UI state stays in the page that
owns it. There is no global store. (An earlier version kept fetched lists in a
React context, which re-rendered every consumer whenever any list arrived.)

See [`docs/architecture.md`](docs/architecture.md).

## Design system

Liquid Glass: panels compose an ambient wash, a translucent fill, a refractive
edge and a diagonal sheen. Blur is always paired with `saturate(180%)`, because
blur alone desaturates what sits behind it.

- 8 px spacing grid
- Fluid type scale, clamped from 320 px to 4K
- Motion between 150 ms and 250 ms, on the compositor (`translate3d`)
- Light and dark themes via a `data-theme` attribute — components only ever
  reference tokens
- `prefers-reduced-motion` honoured in CSS _and_ at runtime, where it changes
  behaviour rather than just styling

See [`docs/design-system.md`](docs/design-system.md).

## Accessibility

Targeting WCAG 2.1 AA, AAA where it is free.

- Single `<header>` / `<nav>` / `<main>` / `<footer>`, skip link first in tab
  order — all asserted by test
- Custom focus rings that are **replaced, never removed**; `#8FD3FF` clears 3:1
  on every surface it touches
- Full keyboard support: roving-tabindex radio groups, arrow-key carousels,
  `Escape` to close dialogs with focus restored to the invoking element
- Toasts announce themselves — `role="status"` for notices, `role="alert"` for
  errors
- **Contrast is enforced by a test.** `scripts/contrast.mjs` composites each
  translucent fill over its worst-case background and fails the build if any
  pair drops below 4.5:1. The faintest body ink currently ships at 4.62:1.

The rule that follows: never put body text directly on a transparent background.

See [`docs/accessibility.md`](docs/accessibility.md).

## Performance

- **112 KB** of JavaScript gzipped in total (114,758 B measured with `gzip -9`);
  **101 KB** on first load, the rest arriving lazily per route
- ~79 KB of that is the cached `react` chunk (81,017 B), which app-only changes
  do not invalidate
- The player is its own chunk (4,795 B) and the search page another (1,536 B);
  neither is downloaded until its route is visited
- Route-level code splitting for `/search` and the 404 page
- Self-hosted variable WOFF2 fonts with `font-display: swap`; no font CDN
- Posters ship `srcset`, explicit `width`/`height` (342×513) to prevent layout
  shift, `loading="lazy"` offscreen and `fetchpriority="high"` above the fold
- `manualChunks` isolates the React runtime so app-only changes don't invalidate
  it

`npm run lighthouse` audits `/`, `/search?query=neon` and `/does-not-exist`.
**It needs a Chrome binary**; the target is 100/100/100/100 but the scores have
to be measured on a machine that has one.

## Configuration

Every variable is prefixed `VITE_`, which means it is **inlined into the client
bundle** — treat all of them as public. See `.env.example`.

| Variable                      | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `VITE_TMDB_READ_ACCESS_TOKEN` | v4 token, sent as a Bearer header (preferred) |
| `VITE_PUBLIC_TMDB_API_KEY`    | v3 key, sent as a query parameter             |
| `VITE_USE_MOCK_CATALOGUE`     | Force the offline catalogue even with a key   |

The token is sent as an `Authorization` header rather than a query parameter so
it never reaches browser history, referrer headers or server logs.

## Security

- Strict CSP in production: no `unsafe-inline` for scripts, no third-party
  origins except TMDB
- Every API response is validated and normalised before it reaches a component;
  unusable entries are dropped, and a broken envelope becomes a recoverable
  error state rather than a crash
- Errors are typed with a `kind` discriminant and a display-safe message — no
  stack traces are ever rendered
- `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, HSTS, and a
  restrictive `Permissions-Policy`

Static hosts ignore `vite.config.ts` headers, so mirror them — snippets for
Netlify, Vercel and Cloudflare Pages are in
[`docs/deployment.md`](docs/deployment.md).

## Stack

React 19 · TypeScript 6 (strict, zero `any`) · Vite 8 · react-router 7 · SWR 2 ·
ESLint 10 with `strictTypeChecked` · Prettier · Vitest

TypeScript is pinned to **6.0.3 rather than 7**: `typescript-eslint@8` hard-throws
at module load on TS 7, and losing `no-floating-promises` and `no-unsafe-*` would
have cost more than the version number. The reasoning and the failed workarounds
are in [`docs/toolchain.md`](docs/toolchain.md).

## Known limitations

- **Lighthouse scores are not measured in CI** — the sandbox has no browser
  binary. The script is provided; run it locally.
- **The TMDB token ships in the client bundle.** It is read-only by design, but a
  production deployment should proxy TMDB through an edge function. Out of scope
  for a static site.
- **Contrast is verified against synthetic worst-case backgrounds**, not real
  poster artwork. The media scrim (`rgba(3,6,12,.90)`) is what makes text over
  imagery safe.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — layering, state ownership, the data path
- [`docs/design-system.md`](docs/design-system.md) — the glass stack, motion, theming
- [`docs/accessibility.md`](docs/accessibility.md) — contrast methodology, keyboard model
- [`docs/toolchain.md`](docs/toolchain.md) — versions, the TS 7 decision, testing traps
- [`docs/deployment.md`](docs/deployment.md) — hosting, headers, caching
