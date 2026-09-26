import type { JSX } from 'react';
/**
 * Skeleton — loading placeholder.
 *
 * Every skeleton declares the exact box its content will occupy, so swapping
 * real data in never moves surrounding layout. That is what keeps CLS at 0
 * through the loading → loaded transition.
 *
 * Announcing: a *single* `role="status"` wrapper announces the pending state
 * once. Individual blocks are inert — putting `role="status"` on each of six
 * placeholders would make a screen reader repeat itself six times.
 */

import classNames from 'classnames';
import styles from './Skeleton.module.css';

/** Props accepted by {@link Skeleton}. */
export interface SkeletonProps {
  /** Extra classes — usually a shape/size helper from a feature module. */
  className?: string | undefined;
}

/**
 * Renders one shimmering placeholder block. Inert to assistive technology.
 *
 * @param props - Skeleton props.
 * @returns A decorative `<span>`.
 */
export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return (
    <span className={classNames(styles.skeleton, className)} aria-hidden="true">
      <span className={styles.shimmer} />
    </span>
  );
}

/** Props accepted by {@link SkeletonCardGrid}. */
export interface SkeletonCardGridProps {
  /** How many card placeholders to render. Defaults to 6. */
  count?: number | undefined;
  /** Message announced while loading. */
  label?: string | undefined;
  /** Extra classes for the wrapper. */
  className?: string | undefined;
}

/**
 * Renders a rail/grid of card placeholders behind one live region.
 *
 * @param props - Grid props.
 * @returns A `<div>` with `role="status"` containing the placeholders.
 */
export function SkeletonCardGrid({
  count = 6,
  label = 'Loading titles',
  className,
}: SkeletonCardGridProps): JSX.Element {
  return (
    <div className={classNames(styles.grid, className)} role="status" aria-live="polite">
      <span className="ww-sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={styles.card} />
      ))}
    </div>
  );
}
