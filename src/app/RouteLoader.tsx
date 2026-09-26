import type { JSX } from 'react';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
/**
 * RouteLoader — the Suspense fallback for lazily imported routes.
 *
 * It reserves the full content height so a route chunk arriving mid-navigation
 * does not cause the footer to jump, and it announces itself once via a single
 * polite live region.
 */

import { Skeleton } from '@/components/ui/Skeleton';
import styles from './RouteLoader.module.css';

/** Props accepted by {@link RouteLoader}. */
export interface RouteLoaderProps {
  /** Text announced while the route loads. */
  label?: string | undefined;
}

/**
 * Renders a page-sized loading placeholder.
 *
 * @param props - Loader props.
 * @returns A `<main>` landmark containing the placeholder.
 */
export function RouteLoader({ label = 'Loading page' }: RouteLoaderProps): JSX.Element {
  return (
    <main
      id="main"
      className={classNames(cls(styles, 'loader'), 'ww-shell')}
      role="status"
      aria-live="polite"
    >
      <span className="ww-sr-only">{label}</span>
      <Skeleton className={styles.hero} />
      <div className={styles.rows}>
        <Skeleton className={styles.heading} />
        <Skeleton className={styles.row} />
        <Skeleton className={styles.row} />
      </div>
    </main>
  );
}
