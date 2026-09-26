/**
 * Subscribes to the user's `prefers-reduced-motion` setting.
 *
 * CSS already collapses animations under that preference, but some behaviours
 * are driven from JavaScript — auto-advancing the hero carousel, smooth-scrolling
 * a rail — and those must be suppressed too.
 *
 * Built on `useSyncExternalStore`: the preference is external state owned by the
 * OS, so subscribing through React's external-store API is both simpler and free
 * of the render→effect→setState cascade.
 */

import { useCallback, useSyncExternalStore } from 'react';

/** The media query string shared by the subscription and the snapshot read. */
const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the user has asked for reduced motion.
 *
 * @returns `true` when reduced motion is requested. Reports `false` during
 *   server rendering, where there is no preference to read.
 */
export function useReducedMotion(): boolean {
  /**
   * Attaches the change listener.
   *
   * @param onStoreChange - React's notification callback.
   * @returns An unsubscribe function.
   */
  const subscribe = useCallback((onStoreChange: () => void): (() => void) => {
    const list = window.matchMedia(QUERY);
    list.addEventListener('change', onStoreChange);
    return () => list.removeEventListener('change', onStoreChange);
  }, []);

  /** @returns The current preference. */
  const getSnapshot = useCallback((): boolean => window.matchMedia(QUERY).matches, []);

  /** @returns `false`, used when rendering without a DOM. */
  const getServerSnapshot = useCallback((): boolean => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
