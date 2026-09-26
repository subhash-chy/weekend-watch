# Architecture

## Layering

```
src/
├── app/          Composition root: entry, providers, router, shell
├── assets/       Brand mark and the inline SVG icon set
├── components/   Reusable UI, split by concern
│   ├── layout/   AppHeader, AppFooter
│   └── ui/       GlassButton, Rating, Skeleton, SegmentedControl, ErrorState
├── features/     Domain modules; each owns its components and styles
│   ├── discovery/  HeroCarousel, CategoryRail, MediaCard, dialog, page
│   ├── search/     SearchForm, SearchPage
│   ├── notifications/ Toast provider and stack
│   └── error/      ErrorFallback, NotFoundPage
├── hooks/        Reusable hooks
├── services/     Everything that touches data
│   ├── tmdb/       client, config, endpoints, schema, images
│   └── mock/       offline catalogue
├── styles/       tokens, globals, fonts, animations
├── types/        Domain types and the environment contract
└── utils/        Pure helpers
```

Dependencies point one way: `app → features → components/hooks → services/utils`.
Nothing in `services` or `utils` imports from `features`.

## State: what lives where

This is the single biggest structural change from the original app.

**Before:** fetched lists were stored in a `MovieContext` reducer. Any component
that needed a list read the context, and `Category` dispatched into it on every
response. Because the provider's value object was recreated each render, every
consumer re-rendered whenever _any_ list arrived — including `Banner`, which
only cared about trending. Server cache was being modelled as global UI state.

**After:**

| Kind of state  | Owner                         | Example                       |
| -------------- | ----------------------------- | ----------------------------- |
| Server cache   | SWR, keyed by endpoint        | trending list, search results |
| URL state      | react-router                  | `?query=…`, `?catalogue=tv`   |
| Local UI state | `useState` in the owning page | open dialog, menu disclosure  |
| Ephemeral UI   | `ToastProvider`               | notifications                 |

There is no global store. SWR already deduplicates, caches and revalidates, so a
second reducer over the same data only adds invalidation bugs.

### Why the URL is the source of truth for search

`?query=` is read on mount, written by exactly one effect, and drives the
request. That makes results shareable, makes Back work, and removes the class of
bug where the input and the results disagree. Having two writers to the same
parameter produced a real race (submitting while the debounce still held the
previous value wiped the query) — now there is one.

## The data path

```
component
  └─ useCatalogue(endpointDescriptor)        hooks/use-catalogue.ts
       └─ fetchCatalogue(descriptor)          services/catalog.ts
            ├─ shouldUseMockCatalogue()?  →  services/mock/catalog.ts
            └─ tmdbFetch(path, params)    →  services/tmdb/client.ts
                 └─ parseMediaPage(raw)   →  services/tmdb/schema.ts
```

Three properties worth noting:

1. **Everything crossing the network is validated.** `schema.ts` normalises
   TMDB's snake-case, partly-optional payloads into a single `MediaItem` shape
   and _drops_ unusable entries rather than letting them reach a component. A
   structurally broken envelope throws `SchemaError`, which the UI renders as a
   recoverable error state.
2. **Errors are typed, not sniffed.** The service layer produces
   `ServiceError` with a `kind` discriminant and a message that is already safe
   to display. No component ever renders a stack trace.
3. **The live/offline decision is invisible to callers.** With no credential the
   app serves a deterministic fixture catalogue, so the UI is fully exercisable
   with no key and no network.

### On request cancellation

SWR 2 calls its fetcher with a single argument (the key) and does **not** pass an
`AbortSignal` — the `Fetcher` type in `swr`'s own `.d.ts` is `(arg) => response`.
Cancellation is SWR's job: a response whose key no longer matches is discarded,
so a stale request can never overwrite fresher data. `fetchCatalogue` still
accepts a `signal` for callers that can supply one (and for tests), but the SWR
path does not fabricate one.

## Code splitting

| Chunk          | Loaded when                     |
| -------------- | ------------------------------- |
| `react`        | Always (framework runtime)      |
| `index`        | Always (shell + discovery page) |
| `SearchPage`   | First navigation to `/search`   |
| `NotFoundPage` | First unknown path              |

Measured with `gzip -9` over `dist/assets/*.js`:

| Chunk                 | gzipped       |
| --------------------- | ------------- |
| `react`               | 81,004 B      |
| `index`               | 24,069 B      |
| `rolldown-runtime`    | 397 B         |
| `SearchPage` (lazy)   | 1,520 B       |
| `NotFoundPage` (lazy) | 722 B         |
| **Total**             | **107,712 B** |

First load pays 105,470 B (~103 KB); the lazy chunks arrive only when their
route is visited.

## Playback

The player is the one feature with a dependency that is not code.

TMDB supplies metadata only — no video files. So `services/playback/` sits
between the catalogue and the player and answers one question: _is there
anything to play for this title?_

```
WatchPage
  └─ resolvePlayback(item)            services/playback/resolver.ts
       ├─ VITE_PLAYBACK_BASE_URL?  →  ${base}/${mediaType}/${id}.mp4
       ├─ VITE_PLAYBACK_DISABLED?  →  { status: 'unavailable', reason }
       └─ otherwise                →  services/playback/sources.ts (CC-BY demo clips)
```

Two properties worth keeping:

1. **`unavailable` is a first-class result, not an error.** A title with no
   licence to stream renders an explanation. Rendering a Play button that leads
   to a failed request is worse than rendering nothing.
2. **The player never knows where media comes from.** `hooks/use-media-player.ts`
   takes a URL and drives a `<video>` element. Swapping the demo registry for a
   CDN, an authenticated edge function or a local library changes one file.

`WatchPage` keys the player by source URL, so switching title remounts it. That
is what keeps transport state fresh, and it is why the hook needs no
"reset on URL change" effect of its own.

## Why some dependencies were removed

| Removed                    | Replaced by                            | Reason                                                                                                                                 |
| -------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `swiper` 8                 | Native CSS scroll-snap + `scrollBy`    | ~40 KB and a **critical** prototype-pollution CVE (GHSA-hmx5-qpq5-p643)                                                                |
| `react-icons` 4            | Inline SVGs in `assets/icons/Icon.tsx` | Large module graph; unreliable tree-shaking                                                                                            |
| `react-simple-star-rating` | `components/ui/Rating.tsx`             | Unmaintained, and its v4 `allowHalfIcon` prop no longer existed in the published types — the exact error that broke the original build |

Removing Swiper also removed the only dependency on a global
`SwiperCore.use([...])` call, which mutated module state at import time.
