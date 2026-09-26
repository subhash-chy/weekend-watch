/**
 * Brand mark.
 *
 * Inline SVG rather than a raster or an external `.svg` request: it is one
 * element in the initial bundle, scales crisply to any DPI, inherits
 * `currentColor` so it works on every glass surface, and costs no extra
 * network round trip on the critical path.
 */

import type { JSX, SVGProps } from 'react';

/** Props accepted by {@link Logo}. */
export interface LogoProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Rendered height in pixels. Width follows the 6.4:1 aspect ratio. */
  height?: number;
}

/** Intrinsic aspect ratio of the mark (width ÷ height). */
const LOGO_ASPECT = 6.4;

/**
 * Renders the Weekend Watch wordmark.
 *
 * The SVG is `aria-hidden` because the enclosing link supplies the accessible
 * name ("Weekend Watch, home"); a second label here would be announced twice.
 *
 * @param props - Logo props.
 * @returns An `<svg>` element sized by `height`.
 */
export function Logo({ height = 30, ...rest }: LogoProps): JSX.Element {
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <svg
      viewBox="0 0 192 30"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {/* Play-triangle inside a rounded frame. */}
      <rect
        x="0.5"
        y="0.5"
        width="29"
        height="29"
        rx="9"
        fill="var(--accent-fill)"
        stroke="rgba(255,255,255,0.24)"
      />
      <path d="M11.6 9.2v11.6L21 15l-9.4-5.8Z" fill="#fff" />
      <path d="M11.6 9.2v11.6L21 15l-9.4-5.8Z" fill="url(#ww-logo-sheen)" />

      <defs>
        <linearGradient id="ww-logo-sheen" x1="11" y1="9" x2="21" y2="21">
          <stop stopColor="rgba(255,255,255,0.42)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Wordmark. Uses the display font so it tracks the app's typography. */}
      <text
        x="38"
        y="20.5"
        fill="currentColor"
        fontFamily="'Space Grotesk Variable', system-ui, sans-serif"
        fontSize="16"
        fontWeight="700"
        letterSpacing="0.5"
      >
        WEEKEND
      </text>
      <text
        x="112"
        y="20.5"
        fill="var(--ink-tertiary)"
        fontFamily="'Space Grotesk Variable', system-ui, sans-serif"
        fontSize="16"
        fontWeight="500"
        letterSpacing="0.5"
      >
        WATCH
      </text>
    </svg>
  );
}
