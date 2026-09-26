import type { JSX } from 'react';
/**
 * Application shell — the composition root.
 *
 * Layering, from outside in:
 *  1. `ToastProvider` — ephemeral UI state, available to everything below.
 *  2. `BrowserRouter` — the router must wrap the boundary because the error
 *     fallback uses `useNavigate` to offer a way home.
 *  3. `ErrorBoundary` — catches any render error in the route subtree and
 *     shows a recovery screen instead of a blank page.
 *  4. Landmarks: skip link → header → routed content → footer.
 *
 * Note what is deliberately *absent*: there is no global "movie context". The
 * original app stored fetched lists in a reducer shared through context, which
 * is server cache masquerading as UI state — every arriving list re-created the
 * context value and re-rendered every consumer. SWR owns server cache now, and
 * components subscribe to it locally.
 */

import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { ToastProvider } from '@/features/notifications/ToastProvider';
import { ErrorFallback } from '@/features/error/ErrorFallback';
import { AppRoutes } from '@/app/router';
import { ScrollToTop } from '@/app/ScrollToTop';

/**
 * Renders the application.
 *
 * @returns The provider tree and page shell.
 */
export function App(): JSX.Element {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ScrollToTop />

          {/* Visible only on first Tab press; the target is the routed
              <main id="main">, which every page provides. */}
          <a className="ww-skip-link" href="#main">
            Skip to main content
          </a>

          <AppHeader />
          <AppRoutes />
          <AppFooter />
        </ErrorBoundary>
      </BrowserRouter>
    </ToastProvider>
  );
}
