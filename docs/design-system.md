# Design system: Liquid Glass

## The four-layer glass stack

Every panel composes four layers. They are always ordered the same way, so a
panel reads consistently at any size.

| Layer      | Property                                                     | Purpose                                                     |
| ---------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| 1. Ambient | `background: radial-gradient(...)`                           | A soft, low-opacity wash that fakes depth                   |
| 2. Fill    | `background-color: rgba(…)`                                  | The glass body; opacity 0.04–0.08 so the blur shows through |
| 3. Edge    | `border: 1px solid rgba(255,255,255,0.12)` + `border-radius` | The refractive rim                                          |
| 4. Sheen   | `::before` with a diagonal `linear-gradient`                 | The highlight that sells the glass                          |

The blur is always paired with saturation, because blur alone desaturates what
sits behind it and the panel looks dead:

```css
backdrop-filter: blur(28px) saturate(180%);
-webkit-backdrop-filter: blur(28px) saturate(180%);
```

`--glass-blur-lg` (28px) is for large panels, `--glass-blur-md` (18px) for
cards, `--glass-blur-sm` (12px) for the header.

## Interaction: refraction, not movement

Hover and focus raise the panel by **translating it and intensifying the edge**,
never by changing layout:

```css
transform: translate3d(0, -4px, 0); /* GPU layer */
border-color: rgba(255, 255, 255, 0.24); /* brighter rim */
box-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.6); /* deeper ambient */
transition-duration: 200ms; /* inside the 150–250ms band */
```

`translate3d` (not `translateY`) keeps the element on its own compositor layer,
so the transition does not repaint the panel behind it.

All motion durations come from `tokens.css` and sit between 150 ms and 250 ms.
Anything longer reads as sluggish on a hover; anything shorter reads as a glitch.

## Spacing and type

An 8 px grid, with the half-step available for optical alignment:
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.

Type scale is fluid, clamped so it never collapses on a 320 px phone nor
explodes on a 4K monitor:

```css
font-size: clamp(2.25rem, 1.4rem + 4.2vw, 4.5rem);
```

`--font-display` (Space Grotesk) for headings, `--font-body` (Inter) for text.
Both are self-hosted variable WOFF2 subsets with `font-display: swap`.

## Theme switching

Theme is a `data-theme` attribute on `<html>`, not a class. `tokens.css`
redefines the custom properties under `[data-theme='light']`, so a component
never needs to know which theme is active — it only ever references tokens.

## Motion preferences

`prefers-reduced-motion` is honoured globally by collapsing all transitions and
animations, and is additionally read at runtime via `useReducedMotion()` where
behaviour (not just styling) must change — for example, the hero carousel stops
auto-advancing rather than merely animating more slowly.
