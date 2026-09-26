/**
 * Debounces a rapidly-changing value.
 *
 * Search-as-you-type would otherwise fire a request per keystroke. Debouncing
 * here (rather than in the component) keeps the timing logic out of the UI and
 * makes it testable in isolation.
 */

import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stopped changing for `delayMs`.
 *
 * The timer is cleared on unmount, so a component that unmounts mid-debounce
 * can never call `setState` afterwards.
 *
 * @param value - The fast-changing input.
 * @param delayMs - Quiet period required before the value is emitted.
 * @returns The debounced value.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
