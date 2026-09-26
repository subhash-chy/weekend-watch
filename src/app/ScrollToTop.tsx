/**
 * Scrolls the window to the top on every navigation.
 *
 * Without this, following a link from a scrolled page lands the user halfway
 * down the next one — a defect the original app had, since react-router does not
 * reset scroll on its own.
 *
 * Hash links are left alone so in-page anchors still work.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets scroll position when the pathname changes.
 *
 * @returns `null`; this component renders nothing.
 */
export function ScrollToTop(): null {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash.length > 0) return;
    // Instant, not smooth: this is a navigation reset, not a user-initiated
    // scroll, and animating it would fight the reduced-motion preference.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}
