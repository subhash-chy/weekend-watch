/**
 * Inline SVG icon set.
 *
 * Replaces `react-icons`, which ships an enormous module graph and cannot be
 * reliably tree-shaken across all bundlers. Every glyph used by the app is one
 * path in this file: a handful of kilobytes, no runtime dependency, and the
 * icons inherit `currentColor` so they always match the surrounding ink token.
 *
 * All icons are decorative by default (`aria-hidden`). When an icon is the
 * *only* content of a control, give that control an accessible name via
 * `aria-label` or `sr-only` text — never by un-hiding the SVG.
 */

import type { JSX, SVGProps } from 'react';

/** Every icon available to the app. */
export type IconName =
  | 'search'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'close'
  | 'check'
  | 'info'
  | 'warning'
  | 'error'
  | 'retry'
  | 'star'
  | 'star-half'
  | 'film'
  | 'tv'
  | 'users'
  | 'pin'
  | 'spinner';

/**
 * Path data per icon. Values are raw `<path>` `d` attributes on a 24×24 grid,
 * except `star`/`star-half`/`spinner`, which need multiple elements.
 */
const PATHS: Readonly<Record<IconName, string>> = {
  search:
    'M10.5 3.5a7 7 0 1 0 4.31 12.53l4.83 4.83a1 1 0 0 0 1.42-1.42l-4.83-4.83A7 7 0 0 0 10.5 3.5Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  'chevron-left':
    'M15.36 4.64a1 1 0 0 1 0 1.42L9.42 12l5.94 5.94a1 1 0 1 1-1.42 1.42l-6.65-6.65a1 1 0 0 1 0-1.42l6.65-6.65a1 1 0 0 1 1.42 0Z',
  'chevron-right':
    'M8.64 4.64a1 1 0 0 0 0 1.42L14.58 12l-5.94 5.94a1 1 0 1 0 1.42 1.42l6.65-6.65a1 1 0 0 0 0-1.42L10.06 4.64a1 1 0 0 0-1.42 0Z',
  'chevron-down':
    'M4.64 8.64a1 1 0 0 1 1.42 0L12 14.58l5.94-5.94a1 1 0 1 1 1.42 1.42l-6.65 6.65a1 1 0 0 1-1.42 0l-6.65-6.65a1 1 0 0 1 0-1.42Z',
  close:
    'M5.64 5.64a1 1 0 0 1 1.42 0L12 10.58l4.94-4.94a1 1 0 1 1 1.42 1.42L13.42 12l4.94 4.94a1 1 0 0 1-1.42 1.42L12 13.42l-4.94 4.94a1 1 0 0 1-1.42-1.42L10.58 12 5.64 7.06a1 1 0 0 1 0-1.42Z',
  check:
    'M20.06 6.06a1 1 0 0 1 0 1.42l-10 10a1 1 0 0 1-1.42 0l-4.5-4.5a1 1 0 1 1 1.42-1.42L9.35 15.3l9.29-9.24a1 1 0 0 1 1.42 0Z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 3a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1Zm0-3.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z',
  warning:
    'M12 2.6a1.4 1.4 0 0 0-1.22.72L2.13 18.2A1.4 1.4 0 0 0 3.35 20.3h17.3a1.4 1.4 0 0 0 1.22-2.1L13.22 3.32A1.4 1.4 0 0 0 12 2.6Zm0 2.5 7.9 13.2H4.1L12 5.1Zm0 4.4a1 1 0 0 0-1 1v3.5a1 1 0 1 0 2 0V10.5a1 1 0 0 0-1-1Zm0 6.5a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z',
  error:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM8.64 8.64a1 1 0 0 1 1.42 0L12 10.58l1.94-1.94a1 1 0 1 1 1.42 1.42L13.42 12l1.94 1.94a1 1 0 0 1-1.42 1.42L12 13.42l-1.94 1.94a1 1 0 0 1-1.42-1.42L10.58 12 8.64 10.06a1 1 0 0 1 0-1.42Z',
  retry:
    'M12 4a8 8 0 0 0-7.6 10.5 1 1 0 0 0 1.9-.6A6 6 0 1 1 12 18a5.98 5.98 0 0 1-4.03-1.55l1.32-1.32A1 1 0 0 0 8.58 13.4H4.6a1 1 0 0 0-1 1v3.98a1 1 0 0 0 1.7.71l1.15-1.15A7.97 7.97 0 0 0 12 20a8 8 0 0 0 0-16Z',
  star: 'M12 2.6a1 1 0 0 1 .9.56l2.6 5.28 5.83.85a1 1 0 0 1 .55 1.7l-4.22 4.1 1 5.8a1 1 0 0 1-1.45 1.06L12 19.2l-5.21 2.74a1 1 0 0 1-1.45-1.05l1-5.8-4.22-4.11a1 1 0 0 1 .55-1.7l5.83-.85 2.6-5.27A1 1 0 0 1 12 2.6Z',
  'star-half':
    'M12 2.6a1 1 0 0 1 .9.56l2.6 5.28 5.83.85a1 1 0 0 1 .55 1.7l-4.22 4.1 1 5.8a1 1 0 0 1-1.45 1.06L12 19.2 6.79 21.95a1 1 0 0 1-1.45-1.05l1-5.8L2.12 11a1 1 0 0 1 .55-1.7l5.83-.85 2.6-5.27A1 1 0 0 1 12 2.6Zm0 3.03V18.6l3.7 1.95-.71-4.13 3-2.9-4.14-.6L12 9.1V5.63Z',
  film: 'M4 3.5h16a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19V5A1.5 1.5 0 0 1 4 3.5Zm.5 2v3h3v-3h-3Zm5 0v3h5v-3h-5Zm7 0v3h3v-3h-3Zm-12 5v4h3v-4h-3Zm5 0v4h5v-4h-5Zm7 0v4h3v-4h-3Zm-12 6v3h3v-3h-3Zm5 0v3h5v-3h-5Zm7 0v3h3v-3h-3Z',
  tv: 'M3 5.5h18A1.5 1.5 0 0 1 22.5 7v11a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 18V7A1.5 1.5 0 0 1 3 5.5Zm.5 2v10h17v-10h-17ZM9.3 2.3a1 1 0 0 1 1.4-.2l1.3 1 1.3-1a1 1 0 1 1 1.2 1.6L13 5.2h-2L9.5 3.9a1 1 0 0 1-.2-1.6Z',
  users:
    'M9 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7.5-.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM9 12.5c3.1 0 5.7 2 6.2 4.75a1 1 0 0 1-1.97.36A4.35 4.35 0 0 0 9 14.5c-2 0-3.75 1.4-4.23 3.11a1 1 0 1 1-1.94-.53 6.36 6.36 0 0 1 6.17-4.58Zm7.5 0c2.6 0 4.8 1.7 5.2 4a1 1 0 1 1-1.97.33 3.3 3.3 0 0 0-3.23-2.33c-.4 0-.8.05-1.17.14a1 1 0 0 1-.47-1.94c.52-.13 1.06-.2 1.64-.2Z',
  pin: 'M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 4.6-5.06 10.16-5.9 11.06a.83.83 0 0 1-1.2 0C10.56 19.16 5.5 13.6 5.5 9A6.5 6.5 0 0 1 12 2.5Zm0 2A4.5 4.5 0 0 0 7.5 9c0 3.4 3.6 7.72 4.5 8.8.9-1.08 4.5-5.4 4.5-8.8A4.5 4.5 0 0 0 12 4.5Zm0 2.25A2.25 2.25 0 1 1 12 11.25 2.25 2.25 0 0 1 12 6.75Z',
  spinner: '',
};

/** Props accepted by {@link Icon}. */
export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Which glyph to render. */
  name: IconName;
  /**
   * Pixel size for both axes. Icons are square, so one value is enough.
   * Emitted as explicit `width`/`height` attributes to prevent layout shift.
   */
  size?: number;
}

/**
 * Renders a single inline SVG icon.
 *
 * @param props - Icon props. `name` selects the glyph; everything else is
 *   forwarded to the underlying `<svg>`.
 * @returns An `<svg>` element, hidden from assistive technology by default.
 */
export function Icon({ name, size = 20, ...rest }: IconProps): JSX.Element {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    // Icons never carry meaning on their own in this app; the enclosing
    // control provides the accessible name.
    'aria-hidden': true,
    focusable: false,
    ...rest,
  } as const;

  if (name === 'spinner') {
    return (
      <svg {...common}>
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="42 14"
        />
      </svg>
    );
  }

  if (name === 'star' || name === 'star-half') {
    // Stars are drawn with an explicit fill so the rating component can tint
    // them independently of the inherited text colour.
    return (
      <svg {...common}>
        <path d={PATHS[name]} />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d={PATHS[name]} />
    </svg>
  );
}
