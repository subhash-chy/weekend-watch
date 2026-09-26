/**
 * Verifies the WCAG contrast guarantees of the Liquid Glass token set.
 *
 * This runs the real `scripts/contrast.mjs` as a subprocess and asserts on its
 * exit code, so the test cannot drift from the script it claims to cover: if a
 * token in the script changes and drops below 4.5:1, this test fails.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** Repo root, resolved from this file's location. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'contrast.mjs');
const TOKENS = join(ROOT, 'src', 'styles', 'tokens.css');

/**
 * Runs the contrast verifier.
 *
 * @returns The exit code and combined output.
 */
function runContrastCheck(): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [SCRIPT], {
      encoding: 'utf8',
    });
    return { code: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: failure.status ?? 1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    };
  }
}

describe('WCAG contrast verification', () => {
  it('passes every foreground/background pair at WCAG 2.1 AA', () => {
    const { code, output } = runContrastCheck();
    // The output is included in the assertion message so a failure names the
    // exact pair that regressed.
    expect(code, output).toBe(0);
    expect(output).toContain('meet WCAG 2.1 AA');
  });

  it('reports no failing pairs', () => {
    const { output } = runContrastCheck();
    expect(output).not.toContain('FAIL');
    expect(output).not.toContain('LARGE ONLY');
  });

  it('covers both text and non-text thresholds', () => {
    const { output } = runContrastCheck();
    expect(output).toContain('WCAG 1.4.3'); // text contrast
    expect(output).toContain('WCAG 1.4.11'); // non-text contrast
  });
});

describe('design tokens stay in sync with the verifier', () => {
  const css = readFileSync(TOKENS, 'utf8');

  /**
   * The contrast script composites hard-coded rgba layers. If tokens.css drifts,
   * the script's verdict stops describing the shipped CSS — so the values that
   * matter are asserted to match here.
   */
  it.each([
    ['header scrim', 'rgba(6, 10, 20, 0.86)'],
    ['header tint', 'rgba(255, 255, 255, 0.06)'],
    ['raised scrim', 'rgba(8, 13, 24, 0.8)'],
    ['raised tint', 'rgba(255, 255, 255, 0.08)'],
    ['inset shade', 'rgba(0, 0, 0, 0.28)'],
    ['media scrim', 'rgba(3, 6, 12, 0.9)'],
  ])('declares the verified %s value', (_label, value) => {
    expect(css).toContain(value);
  });

  it.each([
    ['ink primary', '--ink-primary: #ffffff'],
    ['ink secondary', '--ink-secondary: #eaf0f8'],
    ['ink tertiary', '--ink-tertiary: #c6d2e2'],
    ['accent fill', '--accent-fill: #d81b3c'],
    ['focus ring', '--focus-ring: #8fd3ff'],
  ])('declares the verified %s value', (_label, declaration) => {
    expect(css).toContain(declaration);
  });
});
