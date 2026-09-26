# Accessibility

Target: **WCAG 2.1 AA**, with AAA where it costs nothing extra.

## Contrast

`scripts/contrast.mjs` computes the WCAG relative-luminance contrast ratio for
every text/background pair the design system defines, and **exits 1** if any
pair fails. It is run by `tests/a11y/contrast.test.ts`, so a token change that
breaks contrast fails CI rather than shipping.

Because panels are translucent, the script composites each `rgba` fill over its
worst-case background before measuring — measuring a semi-transparent colour
directly would be meaningless.

Worst case in the current palette (raised-hover surface `#555960`, faintest body
ink `#C6D2E2`) is **4.62:1**, above the 4.5:1 AA threshold. Accent fills are
opaque, not translucent, precisely so this number is stable.

Rejected tokens that looked fine but failed: `#A9B8CC` (3.49), `#BCC9DA` (4.19),
`#B3C1D4` (3.85), `#B9C6D8` (4.07).

The rule that follows from this: **never put body text directly on a
transparent background.** Text always sits on a composited surface.

## Structure

- Exactly one `<header>`, `<nav>`, `<main>`, `<footer>` — verified by test.
- A skip link is the first focusable element and targets `#main`.
- Heading levels never skip; each rail is a `<section>` with a level-2 heading.
- Cards are `<article>` inside `<ul>/<li>`, so list semantics are available to
  screen readers.

## Keyboard

| Context        | Keys                                                             |
| -------------- | ---------------------------------------------------------------- |
| Global         | `Tab` / `Shift+Tab`, `Escape` from any dialog                    |
| Search form    | `Enter` submits; the field is a labelled `<input type="search">` |
| Catalogue tabs | Arrow keys move between options (roving tabindex = one Tab stop) |
| Carousel       | Arrow keys / `Enter` / `Space` on the control buttons            |
| Modal          | Focus trap + focus restore to the invoking element               |

Focus rings are custom (`--focus-ring`) but never removed: the default outline is
replaced, not deleted. The ring colour `#8FD3FF` clears 3:1 against every
surface it appears on.

## Dynamic content

- Toasts live in a `role="region" aria-label="Notifications"` container. Each
  item announces itself: `role="status"` + `aria-live="polite"` for ordinary
  notices, `role="alert"` + `aria-live="assertive"` for errors, so a failure is
  not queued behind whatever else is being read.
- The carousel's live region switches to `aria-live="off"` while auto-advancing,
  so a screen-reader user is not interrupted every few seconds; it becomes
  `polite` again the moment they take manual control.
- Non-current carousel slides are `inert`, which removes them from both the tab
  order and the accessibility tree instead of relying on `aria-hidden` alone.
- `Rating` is deliberately **not** interactive: it is a single `role="img"` with
  one descriptive label. Making a display-only star row focusable would add
  eleven tab stops per row for no benefit. The interactive radio behaviour lives
  in `SegmentedControl` (`role="radiogroup"` / `role="radio"` with a roving
  tabindex).
- Dialogs use `role="dialog"`, `aria-modal`, a labelled title, and `inert` on
  the background content.
- Loading states are `aria-busy`; skeleton cards are `aria-hidden` because the
  status text already announces the state.

## The player

The transport is the highest-risk surface in the app for accessibility, because
custom media players are where `div`-based sliders and unlabelled icon buttons
usually appear. The choices:

- **The seek bar and volume slider are native `<input type="range">`**, styled
  but not replaced. That keeps `role="slider"`, arrow-key operation and
  screen-reader value announcements for free; `aria-valuetext` renders them as
  `1:23 of 9:56` and `80 percent` rather than raw numbers.
- Every icon-only control carries an `aria-label`, and the icons are
  `aria-hidden`.
- Controls fade out on pointer idle, but stay in the tab order — hiding them
  with `visibility` or `display` would strand a keyboard user who tabbed in
  while the pointer was still. `:focus-within` also forces them back on.
- State changes a sighted user sees instantly (muted, speed, captions) go to a
  polite live region.
- Transport errors are a `role="alert"` with a retry action, so a codec or
  network failure is announced rather than silently frozen.

One rule is deliberately disabled: `jsx-a11y/no-noninteractive-element-interactions`
on the player container. The container is `role="group"` — correct, because it is
a labelled set of controls rather than a widget — and the shortcuts are attached
there so they work whichever control has focus. The region is reached through its
focusable children, never directly.

## Known gap

Contrast is verified against a **synthetic worst-case** background, not against
real poster artwork. A poster that is itself very light could reduce the
effective contrast behind translucent text. The mitigation is the media scrim
(`rgba(3,6,12,.90)`), which composites to `#1c1f24` — 16.53:1 against white.
