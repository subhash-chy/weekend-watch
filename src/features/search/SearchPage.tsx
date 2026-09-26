/**
 * SearchPage — the results route.
 *
 * Fixes every defect in the original `SearchResults` component:
 *
 *  1. **Race condition.** The old code fetched in a `useEffect` with an empty
 *     dependency array and no `AbortController`, so retyping the query left the
 *     first request in flight and the last response won regardless of order.
 *     SWR keys the request by query and cancels superseded fetches.
 *  2. **Stale results.** The effect never re-ran when the query changed, so the
 *     page kept showing the previous query's results.
 *  3. **Unhandled rejection.** `fetch(...).then(res => res.json())` had no
 *     `.catch`, so any network failure produced an unhandled promise rejection
 *     and a permanently blank page.
 *  4. **No loading, error or empty states** — all three now exist.
 *  5. **`useState([])`** inferred `never[]`; the state is now a typed
 *     `MediaPage` owned by SWR.
 *
 * The URL is the single source of truth, so results are shareable and the back
 * button works.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MediaCard } from '@/features/discovery/MediaCard';
import { MediaDetailsDialog } from '@/features/discovery/MediaDetailsDialog';
import { SearchForm } from '@/features/search/SearchForm';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';
import { useSearch } from '@/hooks/use-catalogue';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePageSeo } from '@/hooks/use-page-seo';
import { describeError } from '@/services/catalog';
import { SEARCH_DEBOUNCE_MS, ROUTES } from '@/utils/constants';
import type { MediaItem } from '@/types/media';
import styles from './SearchPage.module.css';

/** SEO copy used before a query exists. */
const DEFAULT_TITLE = 'Search';
const DEFAULT_DESCRIPTION =
  'Search thousands of films and series from The Movie Database and find something worth watching this weekend.';

/**
 * Renders search results.
 *
 * @returns The search page.
 */
export function SearchPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  /** The query currently committed to the URL. */
  const committedQuery = searchParams.get('query')?.trim() ?? '';

  const [draft, setDraft] = useState(committedQuery);
  const [selected, setSelected] = useState<MediaItem | null>(null);

  /**
   * Keeps the input in step when the URL changes from outside the form — the
   * back button, a shared link, the header's search button.
   *
   * This is React's documented "adjusting state when a prop changes" pattern:
   * comparing during render and updating in the same pass. Doing it in an
   * effect would render one frame with the stale draft first.
   */
  const [syncedQuery, setSyncedQuery] = useState(committedQuery);
  if (syncedQuery !== committedQuery) {
    setSyncedQuery(committedQuery);
    setDraft(committedQuery);
  }

  /** Debounced so typing does not rewrite history on every keystroke. */
  const debouncedDraft = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS);

  /**
   * Mirrors the debounced draft into the URL.
   *
   * This is the only place that writes the query parameter. An earlier revision
   * also wrote it from the form's submit handler, which raced: submitting
   * committed `query=x` immediately while the debounce still held the
   * pre-typing value, so the next effect run saw a mismatch and wiped the
   * query. One writer, one source of truth.
   *
   * `replace: true` keeps typing out of the history stack, so Back leaves the
   * page instead of stepping through every intermediate keystroke.
   */
  useEffect(() => {
    if (debouncedDraft === committedQuery) return;
    if (debouncedDraft.trim().length === 0) {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ query: debouncedDraft.trim() }, { replace: true });
  }, [debouncedDraft, committedQuery, setSearchParams]);

  // The request follows the committed query, not the draft, so an in-progress
  // edit never fires a request for a half-typed word.
  const results = useSearch(committedQuery);

  usePageSeo({
    title: committedQuery.length > 0 ? `Results for “${committedQuery}”` : DEFAULT_TITLE,
    description:
      committedQuery.length > 0
        ? `Films and series matching “${committedQuery}” on Weekend Watch.`
        : DEFAULT_DESCRIPTION,
    path:
      committedQuery.length > 0
        ? `${ROUTES.search}?query=${encodeURIComponent(committedQuery)}`
        : ROUTES.search,
    // Structured data describing the result set, so the page is machine
    // readable as a collection rather than an anonymous document.
    jsonLd:
      committedQuery.length > 0 && results.items.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `Results for “${committedQuery}”`,
            description: `Films and series matching “${committedQuery}”.`,
            numberOfItems: results.items.length,
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: results.items.slice(0, 20).map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.title,
              })),
            },
          }
        : undefined,
  });

  const openDetails = useCallback((item: MediaItem): void => {
    setSelected(item);
  }, []);

  const closeDetails = useCallback((): void => {
    setSelected(null);
  }, []);

  /**
   * Handles form submission.
   *
   * Deliberately does not write the URL: the debounce effect above is the
   * single writer. Submitting only needs to make sure the input holds the
   * intended value; `preventDefault` in the form stops a page navigation.
   *
   * @param value - The submitted query.
   */
  const handleSubmit = useCallback((value: string): void => {
    setDraft(value);
  }, []);

  const heading = useMemo(() => {
    if (committedQuery.length === 0) return 'Search the catalogue';
    if (results.isLoading) return `Searching for “${committedQuery}”…`;
    return `${results.items.length} ${results.items.length === 1 ? 'result' : 'results'} for “${committedQuery}”`;
  }, [committedQuery, results.isLoading, results.items.length]);

  return (
    <main id="main" className={classNames(cls(styles, 'main'), 'ww-shell')}>
      <SearchForm
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        // Intentional: the user navigated here specifically to type a query.
        // The input is labelled, and the hero's instance never autofocuses.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        size="lg"
      />

      <section aria-labelledby="results-heading" className={styles.results}>
        <h1 id="results-heading" className={styles.heading}>
          {heading}
        </h1>

        {/* A polite live region so a screen-reader user hears when new results
            land, without the announcement interrupting their typing. */}
        <p className="ww-sr-only" role="status" aria-live="polite">
          {results.isLoading
            ? 'Loading results'
            : `${results.items.length} results loaded`}
        </p>

        {results.error !== undefined ? (
          <ErrorState
            title="Search failed"
            message={describeError(results.error)}
            onRetry={results.retry}
            retryLabel="Search again"
          />
        ) : results.isLoading ? (
          <SkeletonCardGrid count={12} label="Loading search results" />
        ) : results.items.length === 0 ? (
          <div className={classNames(cls(styles, 'empty'), 'ww-glass')}>
            <h2 className={styles.emptyTitle}>No matches</h2>
            <p className={styles.emptyText}>
              {committedQuery.length === 0
                ? 'Type a title, genre or keyword above to get started.'
                : `Nothing matched “${committedQuery}”. Check the spelling, or try a broader term.`}
            </p>
          </div>
        ) : (
          <ul className={styles.grid} aria-label={`Search results for ${committedQuery}`}>
            {results.items.map((item, index) => (
              <li key={`${item.mediaType}-${item.id}`} className={styles.gridItem}>
                <MediaCard item={item} onSelect={openDetails} priority={index < 8} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected !== null ? (
        <MediaDetailsDialog item={selected} onClose={closeDetails} />
      ) : null}
    </main>
  );
}
