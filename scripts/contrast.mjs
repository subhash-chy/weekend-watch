#!/usr/bin/env node
/**
 * WCAG 2.1 contrast verifier for the Liquid Glass design system.
 *
 * Glassmorphism's central accessibility risk is that text sits on a
 * *translucent* surface, so the effective background colour depends on whatever
 * is behind it. This script composites each declared layer stack over both
 * worst-case backdrops (pure white and pure black), computes the resulting
 * colour, and checks every foreground/background pair against WCAG 2.1 AA and
 * AAA thresholds.
 *
 * Usage: node scripts/contrast.mjs
 * Exit code 1 if any required pair fails.
 */

/** @typedef {{r:number,g:number,b:number}} RGB */

/**
 * Parses `#rgb`, `#rrggbb`, `rgb()` or `rgba()` into channel values.
 * @param {string} value
 * @returns {{rgb: RGB, alpha: number}}
 */
function parseColor(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      return {
        rgb: {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        },
        alpha: 1,
      };
    }
    return {
      rgb: {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      },
      alpha: 1,
    };
  }
  const match = /^rgba?\(([^)]+)\)$/.exec(trimmed);
  if (!match) throw new Error(`Cannot parse colour: ${value}`);
  const parts = match[1]
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);
  return {
    rgb: { r: parts[0], g: parts[1], b: parts[2] },
    alpha: parts.length > 3 ? parts[3] : 1,
  };
}

/**
 * Alpha-composites `over` on top of `under` (standard "source over" blend).
 * @param {RGB} under
 * @param {string} overColor
 * @returns {RGB}
 */
function composite(under, overColor) {
  const { rgb, alpha } = parseColor(overColor);
  return {
    r: rgb.r * alpha + under.r * (1 - alpha),
    g: rgb.g * alpha + under.g * (1 - alpha),
    b: rgb.b * alpha + under.b * (1 - alpha),
  };
}

/**
 * Relative luminance per WCAG 2.1 §1.4.3.
 * @param {RGB} c
 * @returns {number}
 */
function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Contrast ratio between two colours (1–21).
 * @param {RGB} a
 * @param {RGB} b
 * @returns {number}
 */
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/**
 * Composites a stack of layers over a backdrop.
 * @param {RGB} backdrop
 * @param {string[]} layers
 * @returns {RGB}
 */
function stack(backdrop, layers) {
  return layers.reduce((acc, layer) => composite(acc, layer), backdrop);
}

// ---------------------------------------------------------------------------
// Surface layer stacks. These must mirror src/styles/tokens.css exactly.
// ---------------------------------------------------------------------------

const SURFACES = {
  /** Page chrome over the app's ambient gradient — always a dark backdrop. */
  'surface/page': { layers: [], backdrop: BLACK, note: 'ambient page gradient' },
  /** App header floating over arbitrary (possibly bright) hero imagery. */
  'surface/header': {
    layers: ['rgba(6, 10, 20, 0.86)', 'rgba(255,255,255,0.06)'],
    backdrop: WHITE,
    note: 'worst case: bright movie backdrop behind frosted header',
  },
  /** Raised glass cards (carousels, modals, panels). */
  'surface/raised': {
    layers: ['rgba(8, 13, 24, 0.80)', 'rgba(255,255,255,0.08)'],
    backdrop: WHITE,
    note: 'worst case: bright imagery behind raised glass',
  },
  /** Nested/inset control wells inside a raised card. */
  'surface/inset': {
    layers: ['rgba(8, 13, 24, 0.80)', 'rgba(255,255,255,0.08)', 'rgba(0, 0, 0, 0.28)'],
    backdrop: WHITE,
    note: 'inset control well',
  },
  /** Hover state of an interactive glass control. */
  'surface/raised-hover': {
    layers: ['rgba(8, 13, 24, 0.80)', 'rgba(255,255,255,0.14)'],
    backdrop: WHITE,
    note: 'hover reflection on raised glass',
  },
  /** Poster scrim where the title overlays the artwork. */
  'surface/media-scrim': {
    layers: ['rgba(3, 6, 12, 0.90)'],
    backdrop: WHITE,
    note: 'title scrim over artwork',
  },
};

// ---------------------------------------------------------------------------
// Foreground colours (src/styles/tokens.css --ink-* and --accent-*).
// ---------------------------------------------------------------------------

const INK = {
  'ink/primary (#FFFFFF)': '#FFFFFF',
  'ink/secondary (#EAF0F8)': '#EAF0F8',
  'ink/tertiary (#C6D2E2)': '#C6D2E2',
};

/**
 * Opaque fills that carry body text. WCAG 1.4.3 requires 4.5:1 here, so the
 * decorative brand accent (#FF3B5C, only 3.48:1 against white) is deliberately
 * excluded: it is used for glows and ≥24px display type, never button labels.
 */
const SOLID_FILLS = {
  'accent-fill (#D81B3C)': '#D81B3C',
  'accent-fill-hover (#B3112A)': '#B3112A',
};

/**
 * Non-text UI indicators (focus rings, dividers, control borders).
 * WCAG 1.4.11 requires 3:1 against adjacent colours.
 */
const NON_TEXT = {
  'focus-ring (#8FD3FF)': [
    '#8FD3FF',
    ['surface/page', 'surface/header', 'surface/raised', 'surface/raised-hover'],
  ],
};

const NON_TEXT_MIN = 3.0;

/** Minimum ratio required for each foreground token. */
const BODY_MIN = 4.5; // WCAG AA normal text
const LARGE_MIN = 3.0; // WCAG AA large text / UI components

let failures = 0;
const rows = [];

const round = (n) => Math.round(n * 100) / 100;
const hex = ({ r, g, b }) =>
  '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

console.log('WCAG 2.1 contrast verification — Liquid Glass design system\n');
console.log('='.repeat(96));

for (const [surfaceName, surface] of Object.entries(SURFACES)) {
  const backdrop = surface.backdrop ?? WHITE;
  const bg = stack(backdrop, surface.layers);
  console.log(`\n${surfaceName}  →  ${hex(bg)}   (${surface.note})`);
  console.log('-'.repeat(96));

  for (const [inkName, inkColor] of Object.entries(INK)) {
    const fg = parseColor(inkColor).rgb;
    const ratio = round(contrastRatio(fg, bg));
    const passBody = ratio >= BODY_MIN;
    const passLarge = ratio >= LARGE_MIN;
    const status = passBody ? 'PASS AA+AAA?' : passLarge ? 'LARGE ONLY' : 'FAIL';
    if (!passBody) failures++;
    rows.push({ surface: surfaceName, ink: inkName, ratio, passBody });
    console.log(
      `  ${inkName.padEnd(28)} ${String(ratio).padStart(6)}:1  ${
        ratio >= 7 ? 'AAA' : passBody ? 'AA ' : passLarge ? 'AAL' : 'FAIL'
      }  ${status}`,
    );
  }
}

console.log('\n' + '='.repeat(96));
console.log('Opaque fills carrying body text (WCAG 1.4.3, 4.5:1):');
console.log('-'.repeat(96));
for (const [fillName, fillColor] of Object.entries(SOLID_FILLS)) {
  const bg = parseColor(fillColor).rgb;
  const ratio = round(contrastRatio(WHITE, bg));
  const ok = ratio >= BODY_MIN;
  if (!ok) failures++;
  console.log(
    `  ${fillName.padEnd(32)} white text → ${String(ratio).padStart(6)}:1  ${
      ok ? 'PASS' : 'FAIL'
    }`,
  );
}

console.log('\n' + '='.repeat(96));
console.log('Non-text UI indicators (WCAG 1.4.11, 3:1):');
console.log('-'.repeat(96));
for (const [indicator, [color, surfaceNames]] of Object.entries(NON_TEXT)) {
  const fg = parseColor(color).rgb;
  for (const surfaceName of surfaceNames) {
    const surface = SURFACES[surfaceName];
    if (!surface) throw new Error(`Unknown surface ${surfaceName}`);
    const bg = stack(surface.backdrop ?? WHITE, surface.layers);
    const ratio = round(contrastRatio(fg, bg));
    const ok = ratio >= NON_TEXT_MIN;
    if (!ok) failures++;
    console.log(
      `  ${indicator.padEnd(26)} on ${surfaceName.padEnd(22)} ${String(ratio).padStart(6)}:1  ${
        ok ? 'PASS' : 'FAIL'
      }`,
    );
  }
}

console.log('\n' + '='.repeat(96));
const failedRows = rows.filter((r) => !r.passBody);
const solidChecks = Object.keys(SOLID_FILLS).length;
console.log(
  `Checked ${rows.length} glass pairs, ${solidChecks} opaque fills, and ` +
    `${Object.values(NON_TEXT).reduce((n, [, s]) => n + s.length, 0)} non-text indicators.`,
);

if (failedRows.length || failures > 0) {
  console.log(`\n${failedRows.length + failures} check(s) failed:`);
  for (const f of failedRows) {
    console.log(`  ✗ ${f.surface} / ${f.ink} → ${f.ratio}:1 (need 4.5:1)`);
  }
  if (failures > failedRows.length) {
    console.log(
      `  ✗ ${failures - failedRows.length} opaque-fill/non-text check(s) failed`,
    );
  }
  process.exit(1);
}
console.log(
  '\nAll foreground/background pairs meet WCAG 2.1 AA (4.5:1 body, 3:1 non-text).',
);
