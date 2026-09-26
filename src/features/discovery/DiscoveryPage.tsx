/**
 * DiscoveryPage — the home route.
 *
 * Composition only: it wires the catalogue hooks to the hero, the catalogue
 * toggle and the rails, and owns the two pieces of *UI* state that belong here
 * (which catalogue is selected, which title's dialog is open). All server data
 * stays in SWR — nothing is copied into context, which was the root cause of
 * the original app's whole-tree re-renders.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
import type { JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HeroCarousel } from '@/features/discovery/HeroCarousel';
import { CategoryRail } from '@/features/discovery/CategoryRail';
import { MediaCard } from '@/features/discovery/MediaCard';
import { MediaDetailsDialog } from '@/features/discovery/MediaDetailsDialog';
import { SearchForm } from '@/features/search/SearchForm';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useToast } from '@/features/notifications/ToastProvider';
import { usePageSeo } from '@/hooks/use-page-seo';
import { ENDPOINTS, MOVIE_ROWS, TV_ROWS } from '@/services/tmdb/endpoints';
import { shouldUseMockCatalogue } from '@/services/tmdb/config';
import { describeError } from '@/services/catalog';
import { CATALOGUE_OPTIONS, CATALOGUE_PARAM, ROUTES } from '@/utils/constants';
import type { CatalogueKind, MediaItem } from '@/types/media';
import styles from './DiscoveryPage.module.css';

/** SEO copy for the home route. */
const PAGE_TITLE = 'Discover what to watch';
const PAGE_DESCRIPTION =
  'Weekend Watch surfaces trending films and series from The Movie Database in one frosted-glass browse. See what is popular on streaming and on TV right now.';

/**
 * Renders the discovery experience.
 *
 * @returns The home page.
 */
export function DiscoveryPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /**
   * The toggle is URL-driven. `?catalogue=tv` deep-links the Series section, so
   * the header's Films/Series links are real destinations rather than aliases
   * for the same page, and the state survives a reload or a shared link.
   */
  const kind: CatalogueKind =
    searchParams.get(CATALOGUE_PARAM) === 'tv' ? 'tv' : 'streaming';

  /**
   * Updates the toggle by rewriting the query parameter.
   *
   * @param next - The newly selected catalogue.
   */
  const setKind = useCallback(
    (next: CatalogueKind): void => {
      const params = new URLSearchParams(searchParams);
      if (next === 'streaming') params.delete(CATALOGUE_PARAM);
      else params.set(CATALOGUE_PARAM, next);
      // react-router v7's navigate is async; the navigation itself is
      // fire-and-forget, so the promise is explicitly discarded.
      void navigate(`${ROUTES.home}${params.size > 0 ? `?${params.toString()}` : ''}`, {
        replace: true,
      });
    },
    [navigate, searchParams],
  );
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [draftQuery, setDraftQuery] = useState('');
  const { push } = useToast();

  usePageSeo({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: ROUTES.home,
  });

  // One request per row. SWR dedupes and caches by endpoint key, so toggling
  // the catalogue back and forth never refetches a row already in the cache.
  const trending = useCatalogue(ENDPOINTS.trending);
  const firstRow = useCatalogue(
    kind === 'streaming' ? ENDPOINTS.nowPlayingMovies : ENDPOINTS.onTheAirTv,
  );
  const secondRow = useCatalogue(
    kind === 'streaming' ? ENDPOINTS.popularMovies : ENDPOINTS.popularTv,
  );
  const thirdRow = useCatalogue(
    kind === 'streaming' ? ENDPOINTS.topRatedMovies : ENDPOINTS.topRatedTv,
  );

  /**
   * Tells the user when the app is on the offline catalogue, so a familiar
   * dataset never gets mistaken for a bug or for real TMDB data.
   */
  useEffect(() => {
    if (!shouldUseMockCatalogue()) return;
    push({
      tone: 'info',
      title: 'Showing the offline demo catalogue',
      description: 'Add a TMDB key to .env.local to browse the live database.',
      durationMs: 8000,
    });
    // Mount-time notice only; `push` is stable via useCallback upstream.
  }, [push]);

  /**
   * Narrows the mixed trending feed to the selected catalogue.
   *
   * Memoised because SWR revalidation re-renders the page and the filter
   * allocates a new array on every pass.
   */
  const trendingItems = useMemo(() => {
    const wanted = kind === 'streaming' ? 'movie' : 'tv';
    return trending.items.filter((item) => item.mediaType === wanted);
  }, [trending.items, kind]);

  const openDetails = useCallback((item: MediaItem): void => {
    setSelected(item);
  }, []);

  const closeDetails = useCallback((): void => {
    setSelected(null);
  }, []);

  /**
   * Pushes the query onto the URL so results are shareable and the back button
   * works. Uses the router rather than `window.location` to avoid a full page
   * reload.
   *
   * @param value - The submitted query.
   */
  const submitSearch = useCallback(
    (value: string): void => {
      void navigate(
        `${ROUTES.search}?${new URLSearchParams({ query: value }).toString()}`,
      );
    },
    [navigate],
  );

  const rowKeys = kind === 'streaming' ? MOVIE_ROWS : TV_ROWS;
  const rowQueries = [firstRow, secondRow, thirdRow];
  const kindNoun = kind === 'streaming' ? 'films' : 'series';

  return (
    <>
      <HeroCarousel items={trending.items} onSelect={openDetails}>
        <SearchForm
          value={draftQuery}
          onChange={setDraftQuery}
          onSubmit={submitSearch}
          size="lg"
        />
      </HeroCarousel>

      <main id="main" className={classNames(cls(styles, 'main'), 'ww-shell')}>
        <section className={styles.headlineRow} aria-labelledby="trending-heading">
          <div className={styles.headlineHead}>
            <div className={styles.headingBlock}>
              <h2 id="trending-heading" className={styles.sectionTitle}>
                What&rsquo;s popular
              </h2>
              <p className={styles.sectionDescription}>
                {ENDPOINTS.trending.description}
              </p>
            </div>

            <SegmentedControl
              options={CATALOGUE_OPTIONS}
              value={kind}
              onChange={setKind}
              label="Choose between streaming titles and TV shows"
            />
          </div>

          {trending.error !== undefined ? (
            <ErrorState
              title="Could not load trending titles"
              message={describeError(trending.error)}
              onRetry={trending.retry}
            />
          ) : trending.isLoading ? (
            <SkeletonCardGrid
              count={6}
              label="Loading trending titles"
              className={styles.railSkeleton}
            />
          ) : trendingItems.length === 0 ? (
            <p className={styles.empty}>No {kindNoun} in today&rsquo;s trending list.</p>
          ) : (
            <ul
              className={styles.trendingTrack}
              aria-label={`Trending ${kindNoun} — ${trendingItems.length} titles`}
            >
              {trendingItems.map((item, index) => (
                <li key={item.id} className={styles.trendingItem}>
                  <MediaCard
                    item={item}
                    onSelect={openDetails}
                    // The first cards are in the initial viewport on desktop,
                    // so they load eagerly rather than waiting on an observer.
                    priority={index < 6}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {rowKeys.map((rowKey, index) => {
          // Both arrays are parallel and fixed-length, but indexing under
          // `noUncheckedIndexedAccess` yields `T | undefined`, so narrow once.
          const rowQuery = rowQueries[index];
          const descriptor = ENDPOINTS[rowKey];
          if (rowQuery === undefined) return null;
          return (
            <CategoryRail
              key={rowKey}
              title={descriptor.label}
              description={descriptor.description}
              items={rowQuery.items}
              isLoading={rowQuery.isLoading}
              error={rowQuery.error}
              onRetry={rowQuery.retry}
              onSelect={openDetails}
            />
          );
        })}
      </main>

      {selected !== null ? (
        <MediaDetailsDialog item={selected} onClose={closeDetails} />
      ) : null}
    </>
  );
}
