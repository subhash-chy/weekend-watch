import type { JSX } from 'react';
/**
 * MediaCard — a single title in a rail or grid.
 *
 * Performance details that matter for Core Web Vitals:
 *  - `width`/`height` come from TMDB's fixed rendition sizes, so the browser
 *    reserves the exact box before the image arrives (CLS 0).
 *  - `loading` and `decoding` are caller-controlled: the first few cards in a
 *    rail load eagerly, the rest lazily.
 *  - `srcSet` lets small screens download the 185px rendition instead of 500px.
 *  - `aspect-ratio` on the frame keeps the box reserved even if the image
 *    request fails entirely.
 *
 * The whole card is a button: it opens the details dialog. Using a real
 * `<button>` (rather than a `<div onClick>`) gives keyboard activation, a focus
 * ring and an accessible name for free.
 */

import classNames from 'classnames';
import { Icon } from '@/assets/icons/Icon';
import { Rating } from '@/components/ui/Rating';
import { resolvePosterSrc, resolvePosterSrcSet } from '@/services/tmdb/images';
import { formatReleaseDate } from '@/utils/format';
import type { MediaItem } from '@/types/media';
import styles from './MediaCard.module.css';

/**
 * Intrinsic size of TMDB's `w342` poster rendition. Declaring these on every
 * `<img>` is what reserves the box before paint and keeps CLS at zero.
 */
const POSTER_WIDTH = 342;
const POSTER_HEIGHT = 513;

/** Props accepted by {@link MediaCard}. */
export interface MediaCardProps {
  /** The title to render. */
  item: MediaItem;
  /** Invoked with the item when the card is activated. */
  onSelect: (item: MediaItem) => void;
  /**
   * `eager` for above-the-fold cards, `lazy` for the rest. Defaults to `lazy`.
   */
  priority?: boolean | undefined;
  /** Extra classes on the root element. */
  className?: string | undefined;
}

/**
 * Renders a poster card for one title.
 *
 * @param props - Card props.
 * @returns An `<article>` containing a poster button and its metadata.
 */
export function MediaCard({
  item,
  onSelect,
  priority = false,
  className,
}: MediaCardProps): JSX.Element {
  const posterSrc = resolvePosterSrc(item);
  const posterSrcSet = resolvePosterSrcSet(item);
  const releaseDate = formatReleaseDate(item.releaseDate);
  const kindLabel = item.mediaType === 'tv' ? 'Series' : 'Film';

  return (
    <article className={classNames(styles.card, className)}>
      <button
        type="button"
        className={styles.posterButton}
        onClick={() => onSelect(item)}
        // The button's accessible name is the title plus enough context that a
        // screen-reader user browsing by button knows what it does.
        aria-label={`${item.title} — ${kindLabel}, released ${releaseDate}. View details.`}
      >
        <span className={styles.posterFrame}>
          <img
            className={styles.poster}
            src={posterSrc}
            {...(posterSrcSet !== undefined ? { srcSet: posterSrcSet } : {})}
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 26vw, 176px"
            width={POSTER_WIDTH}
            height={POSTER_HEIGHT}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
          />
          <span className={styles.posterScrim} aria-hidden="true">
            <Icon name="info" size={22} />
          </span>
        </span>
      </button>

      <div className={styles.meta}>
        <h3 className={styles.title} title={item.title}>
          {item.title}
        </h3>
        <p className={styles.date}>{releaseDate}</p>
        <Rating voteAverage={item.voteAverage} voteCount={item.voteCount} />
      </div>
    </article>
  );
}
