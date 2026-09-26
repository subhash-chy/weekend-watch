/**
 * CategoryRail — a horizontally scrolling row of titles.
 *
 * This replaces the Swiper carousel. Native CSS scroll-snap plus `scrollBy`
 * gives the same UX with zero JavaScript library: momentum scrolling works on
 * touch devices for free, the row is keyboard-scrollable, and roughly 40 KB of
 * carousel code (plus a critical prototype-pollution CVE) is gone.
 *
 * The arrow buttons are real `<button>`s with `aria-controls`, and they disable
 * themselves at the ends of the row — an affordance the original lacked, where
 * both arrows stayed clickable on an empty row.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Icon } from '@/assets/icons/Icon';
import { MediaCard } from '@/features/discovery/MediaCard';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { describeError } from '@/services/catalog';
import type { MediaItem } from '@/types/media';
import styles from './CategoryRail.module.css';

/** Props accepted by {@link CategoryRail}. */
export interface CategoryRailProps {
  /** Row heading. */
  title: string;
  /** Optional supporting sentence rendered under the heading. */
  description?: string | undefined;
  /** Items to render. */
  items: readonly MediaItem[];
  /** True while the first request is in flight. */
  isLoading: boolean;
  /** Caught error, if any. */
  error: unknown;
  /** Re-runs the request. */
  onRetry: () => void;
  /** Invoked when a card is activated. */
  onSelect: (item: MediaItem) => void;
}

/** Fraction of the visible width one arrow press scrolls. */
const SCROLL_STEP_FRACTION = 0.85;

/**
 * Renders a titled, scrollable row of media cards.
 *
 * @param props - Rail props.
 * @returns A `<section>` with a heading, scroll controls and the row.
 */
export function CategoryRail({
  title,
  description,
  items,
  isLoading,
  error,
  onRetry,
  onSelect,
}: CategoryRailProps): JSX.Element {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /**
   * Recomputes which arrows are enabled from the track's scroll geometry.
   * A 1px tolerance absorbs sub-pixel rounding at the edges.
   */
  const syncArrows = useCallback((): void => {
    const track = trackRef.current;
    if (track === null) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScrollLeft(track.scrollLeft > 1);
    setCanScrollRight(track.scrollLeft < maxScroll - 1);
  }, []);

  // Re-sync after data lands and whenever the viewport resizes, so the arrows
  // are correct on first paint rather than only after the first scroll.
  useEffect(() => {
    syncArrows();
    const track = trackRef.current;
    if (track === null) return;

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncArrows);
      return () => window.removeEventListener('resize', syncArrows);
    }

    const observer = new ResizeObserver(syncArrows);
    observer.observe(track);
    return () => observer.disconnect();
  }, [syncArrows, items, isLoading]);

  /**
   * Scrolls the row by most of its visible width.
   *
   * @param direction - `-1` for previous, `1` for next.
   */
  const scrollByStep = (direction: 1 | -1): void => {
    const track = trackRef.current;
    if (track === null) return;
    const step = track.clientWidth * SCROLL_STEP_FRACTION * direction;
    track.scrollBy({
      left: step,
      behavior:
        typeof matchMedia !== 'undefined' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
    });
  };

  const headingId = `rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section className={styles.rail} aria-labelledby={headingId}>
      <div className={styles.head}>
        <div className={styles.headings}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {description !== undefined ? (
            <p className={styles.description}>{description}</p>
          ) : null}
        </div>

        {/* Only offer scroll controls when there is something to scroll. */}
        {!isLoading && error === undefined && items.length > 0 ? (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => scrollByStep(-1)}
              disabled={!canScrollLeft}
              aria-label={`Scroll ${title} backwards`}
              aria-controls={headingId}
            >
              <Icon name="chevron-left" size={22} />
            </button>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => scrollByStep(1)}
              disabled={!canScrollRight}
              aria-label={`Scroll ${title} forwards`}
              aria-controls={headingId}
            >
              <Icon name="chevron-right" size={22} />
            </button>
          </div>
        ) : null}
      </div>

      {error !== undefined ? (
        <ErrorState
          title="Could not load this row"
          message={describeError(error)}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <SkeletonCardGrid count={6} label={`Loading ${title}`} className={styles.grid} />
      ) : items.length === 0 ? (
        <p className={styles.empty}>Nothing to show here yet.</p>
      ) : (
        <ul
          ref={trackRef}
          id={headingId}
          className={styles.track}
          onScroll={syncArrows}
          // Horizontal rows are a known screen-reader trap: the list is
          // labelled so its extent is announced, and each card is a labelled
          // button, so browsing by landmark or button still works.
          aria-label={`${title} — ${items.length} titles`}
        >
          {items.map((item, index) => (
            <li key={item.id} className={styles.item}>
              <MediaCard
                item={item}
                onSelect={onSelect}
                // The first few cards are in the initial viewport on desktop;
                // loading them eagerly avoids a late-loading LCP candidate.
                priority={index < 4}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
