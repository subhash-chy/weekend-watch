# Toolchain

## Versions

| Package           | Version | Note                                              |
| ----------------- | ------- | ------------------------------------------------- |
| Node              | 22      | Required (uses `node:` protocol imports)          |
| Vite              | 8       | Rolldown-based; `manualChunks` is function-only   |
| TypeScript        | 6.0.3   | **Deliberately not 7** — see below                |
| React             | 19      | No global `JSX` namespace; `FormEvent` deprecated |
| react-router-dom  | 7       | `navigate()` now returns a `Promise`              |
| SWR               | 2       | Fetcher receives one argument, no `AbortSignal`   |
| ESLint            | 10.11.0 | Flat config                                       |
| typescript-eslint | 8       | `strictTypeChecked` + type-aware rules            |

## Why TypeScript 6 and not 7

TypeScript 7.0.2 is the published `latest`. `typescript-eslint@8` **hard-throws
at module load** with `does not support TS 7.0` — not a warning, an abort that
takes down the whole lint run.

Every workaround was tried:

- **Nesting two copies of `typescript`** (6 for the linter, 7 for `tsc`):
  impossible. `typescript` is a _peer_ dependency everywhere, and npm's
  `overrides` on peer ranges does not create a nested copy — it dedupes to one
  root install.
- **`legacy-peer-deps`**: makes the peer override meaningless, so the same
  dedupe happens.
- **Non-type-checked rules only** (`tseslint.strict` without
  `strictTypeChecked`): the throw happens regardless of configuration.

Choosing TS 7 would have cost all type-aware linting — `no-floating-promises`,
`no-unsafe-*`, `no-misused-promises`. Those rules caught real bugs here (every
`onClick={() => navigate(x)}` in the codebase both returned and floated a
Promise). Full type-aware linting was worth more than a major-version number.

Two consequences of the TS 7 attempt are still visible in the config:

- **`paths` without `baseUrl`.** TS 7 removed `baseUrl` (TS5102); `paths` works
  fine without it, and the config stays forward-compatible.
- **`erasableSyntaxOnly`** is enabled, matching TS 7's direction.

## Scripts

| Script                    | What it does                                        |
| ------------------------- | --------------------------------------------------- |
| `dev`                     | Vite dev server on `0.0.0.0`, relaxed CSP for HMR   |
| `build`                   | `tsc -b` then `vite build`                          |
| `preview`                 | Serves `dist/` with the **strict** production CSP   |
| `typecheck`               | `tsc -b --force`                                    |
| `lint` / `lint:fix`       | ESLint over the whole repo                          |
| `format` / `format:check` | Prettier write / verify                             |
| `test`                    | Vitest, single run                                  |
| `coverage`                | Vitest with v8 coverage                             |
| `lighthouse`              | Builds, serves, audits three routes, fails below 95 |
| `verify`                  | All of the above except Lighthouse                  |

Run `npm run verify` before pushing. It is the single gate.

## ESLint layering

Type-aware rules **must not** be applied to files outside a tsconfig program —
doing so aborts the entire run at rule-load time, not at lint time. The config is
therefore layered:

1. `js.recommended` everywhere
2. `tseslint.strict` + `stylistic` (non-type-aware) over all TS/TSX
3. `strictTypeChecked` over exactly the tsconfig members: `src/**`,
   `tests/**`, `vite.config.ts`, `vitest.config.ts`
4. Relaxed `no-unsafe-*` for `tests/**` (test doubles are intentionally loose)
5. A plain, untyped block for `**/*.mjs` and `eslint.config.js`

Note that `restrict-template-expressions` **and**
`no-confusing-void-expression` are both type-aware — the second is not obvious,
and putting either in the untyped block breaks the run.

The only `overrides` entry in `package.json` is
`{ "eslint-plugin-jsx-a11y": { "eslint": "$eslint" } }`. That plugin declares
`peerDependencies.eslint: "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9"` and has not
yet widened it for ESLint 10, so without the override `npm install` refuses to
resolve.

## Testing

`vitest` with `happy-dom`, 83 tests across 5 files.

| File                      | Tests | Covers                                           |
| ------------------------- | ----- | ------------------------------------------------ |
| `services/schema.test.ts` | 16    | TMDB payload normalisation and rejection         |
| `utils/format.test.ts`    | 21    | Dates, numbers, slugs, truncation                |
| `components/ui.test.tsx`  | 21    | Buttons, rating, segmented control, skeletons    |
| `a11y/contrast.test.ts`   | 14    | Runs the **real** `scripts/contrast.mjs`         |
| `app.test.tsx`            | 11    | Full-app integration: routing, landmarks, search |

`a11y/contrast.test.ts` invokes `scripts/contrast.mjs` as a subprocess rather
than re-implementing the maths, and separately asserts that `tokens.css` still
declares the values the script was written against. A re-implementation would
test the copy, not the shipped code.

`app.test.tsx` renders the real `App` with `VITE_USE_MOCK_CATALOGUE=1`. It has
already caught two production bugs that unit tests missed:

- SWR 2 not passing an `AbortSignal` to the fetcher, which failed **every**
  request with `Cannot read properties of undefined (reading 'signal')`.
- Two writers to the `?query=` parameter racing, which wiped the query
  immediately after submit.

### Two traps worth knowing

- `userEvent.keyboard('{ArrowRight}')` targets `document.body`, so a handler
  delegated on a container never fires. `await user.tab()` first.
- `import type { SubmitEvent } from 'react'` **silently resolves to the global
  DOM `SubmitEvent`** (non-generic) and fails with `TS2315`. Alias it:
  `import type { SubmitEvent as ReactSubmitEvent } from 'react'`.

## Lighthouse

`scripts/lighthouse.mjs` builds, starts `vite preview`, and audits `/`,
`/search?query=neon` and `/does-not-exist` on a 412×823 mobile profile across
performance, accessibility, best-practices and SEO. Default threshold 95
(`LH_THRESHOLD`), exit 1 below it.

**It requires a Chrome or Chromium binary** (`CHROME_PATH` or on `PATH`).
This sandbox has none and cannot download one, so the real scores in this repo
are **targeted, not measured**. Run it locally before claiming a number.

## Contrast

```bash
node scripts/contrast.mjs   # exits 1 if any pair fails WCAG AA
```

Composites each translucent `rgba` fill over its worst-case background before
measuring, because the raw ratio of a semi-transparent colour is meaningless.
