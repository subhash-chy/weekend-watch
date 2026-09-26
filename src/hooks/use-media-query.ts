/**
 * Reactive `matchMedia` subscription.
 *
 * Implemented with `useSyncExternalStore` rather than `useState` + an effect:
 * the media query is external state, and subscribing through React's own
 * external-store API avoids the render→effect→setState cascade (and the torn
 * read it can produce under concurrent rendering).
 *
 * Used where JavaScript genuinely needs to know the viewport — sizing carousel
 * scroll steps, for example. Layout that can be expressed in CSS stays in CSS.
 */

import { useCallback, useSyncExternalStore } from 'react';

/** Breakpoints mirroring the CSS layout steps, for JS-side decisions. */
export const BREAKPOINTS = {
  compact: '(max-width: 639px)',
  medium: '(min-width: 640px)',
  wide: '(min-width: 1024px)',
  ultraWide: '(min-width: 1920px)',
} as const;

/**
 * Subscribes to a media query.
 *
 * @param query - A CSS media query string, e.g. `(min-width: 768px)`.
 * @returns `true` while the query matches. Reports `false` during server
 *   rendering, where there is no viewport to measure.
 */
export function useMediaQuery(query: string): boolean {
  /**
   * Attaches the change listener.
   *
   * @param onStoreChange - React's notification callback.
   * @returns An unsubscribe function.
   */
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  /** @returns The current match state. */
  const getSnapshot = useCallback(
    (): boolean => window.matchMedia(query).matches,
    [query],
  );

  /** @returns `false`, used when rendering without a DOM. */
  const getServerSnapshot = useCallback((): boolean => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
