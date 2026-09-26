/**
 * Route table.
 *
 * Every route except the home page is lazily imported, so the initial bundle
 * contains only what the landing view needs. The search page, its dialog and
 * the 404 are all separate chunks fetched on first navigation.
 *
 * A catch-all `*` route is registered last. Its absence in the original app is
 * why the header's `/movies`, `/tv-show`, `/people` and `/more` links all
 * rendered a blank page instead of an error.
 */

import { lazy, Suspense } from 'react';
import type { JSX } from 'react';
import { Route, Routes } from 'react-router-dom';
import { DiscoveryPage } from '@/features/discovery/DiscoveryPage';
import { RouteLoader } from '@/app/RouteLoader';
import { ROUTES } from '@/utils/constants';

/** Search results — loaded on first visit to `/search`. */
const SearchPage = lazy(async () => {
  const module = await import('@/features/search/SearchPage');
  return { default: module.SearchPage };
});

/** 404 — loaded only when an unknown path is hit. */
const NotFoundPage = lazy(async () => {
  const module = await import('@/features/error/NotFoundPage');
  return { default: module.NotFoundPage };
});

/**
 * Renders the application's route table.
 *
 * @returns A `<Routes>` element with a Suspense boundary around lazy routes.
 */
export function AppRoutes(): JSX.Element {
  return (
    <Suspense fallback={<RouteLoader label="Loading page" />}>
      <Routes>
        <Route path={ROUTES.home} element={<DiscoveryPage />} />
        <Route path={ROUTES.search} element={<SearchPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
