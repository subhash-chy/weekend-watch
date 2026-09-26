/**
 * MediaDetailsDialog — accessible modal for a single title.
 *
 * Implements the WAI-ARIA dialog pattern end to end:
 *  - `role="dialog"` + `aria-modal="true"`, labelled by its own heading,
 *  - focus moves in on open, `Tab` is trapped, `Escape` closes,
 *  - focus returns to the card that opened it,
 *  - the page behind it cannot scroll.
 *
 * It is rendered only while open, and it is code-split by the route that owns
 * it, so the modal's cost is not paid on first paint.
 */

import { useRef } from 'react';
import type { JSX, MouseEvent } from 'react';
import { Icon } from '@/assets/icons/Icon';
import { Rating } from '@/components/ui/Rating';
import { GlassButton } from '@/components/ui/GlassButton';
import { useFocusTrap, useBodyScrollLock } from '@/hooks/use-focus-trap';
import { resolveBackdropSrc, backdropSrcSet } from '@/services/tmdb/images';
import { formatReleaseDate, genreLabels, formatCompactCount } from '@/utils/format';
import type { MediaItem } from '@/types/media';
import styles from './MediaDetailsDialog.module.css';

/** Backdrop rendition width used by the hero image inside the dialog. */
const BACKDROP_WIDTH = 780;
const BACKDROP_HEIGHT = 439;

/** Props accepted by {@link MediaDetailsDialog}. */
export interface MediaDetailsDialogProps {
  /** The title to display. */
  item: MediaItem;
  /** Called when the dialog should close. */
  onClose: () => void;
}

/**
 * Renders the details modal.
 *
 * @param props - Dialog props.
 * @returns A modal dialog element.
 */
export function MediaDetailsDialog({
  item,
  onClose,
}: MediaDetailsDialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `media-title-${item.id}`;

  // Both call sites memoise `onClose` with useCallback, so it is stable and can
  // be used directly. Writing it into a ref during render would be a ref mutation
  // outside an effect, which React 19's compiler rules reject.
  const initialFocusRef = useFocusTrap<HTMLDivElement, HTMLButtonElement>(dialogRef, {
    active: true,
    onEscape: onClose,
  });

  useBodyScrollLock(true);

  const backdrop = resolveBackdropSrc(item);
  const srcSet = backdropSrcSet(item.backdropPath);
  const genres = genreLabels(item.genreIds);

  /** Closes when the backdrop itself is clicked, not when the panel is. */
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      // `presentation` is accurate: the scrim is not an interactive element, and
      // click-to-dismiss is a mouse convenience on top of Escape, which the
      // focus trap already handles for keyboard users.
      role="presentation"
      className={styles.backdrop}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // The container must be focusable so the trap has somewhere to park
        // focus when the dialog has no focusable children.
        tabIndex={-1}
        className={styles.dialog}
      >
        <div className={styles.hero}>
          <img
            className={styles.heroImage}
            src={backdrop}
            {...(srcSet !== undefined ? { srcSet } : {})}
            sizes="(max-width: 640px) 100vw, 780px"
            width={BACKDROP_WIDTH}
            height={BACKDROP_HEIGHT}
            alt=""
            loading="lazy"
            decoding="async"
          />
          <div className={styles.heroScrim} aria-hidden="true" />

          <button
            ref={initialFocusRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close details"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.headline}>
            <h2 id={titleId} className={styles.title}>
              {item.title}
            </h2>
            <p className={styles.subtitle}>
              {item.mediaType === 'tv' ? 'Series' : 'Film'} ·{' '}
              {formatReleaseDate(item.releaseDate)}
            </p>
          </div>

          <div className={styles.stats}>
            <Rating voteAverage={item.voteAverage} voteCount={item.voteCount} size={20} />
            <span className={styles.score}>
              {item.voteAverage.toFixed(1)}
              <span className={styles.scoreMax}>/10</span>
            </span>
            <span className={styles.votes}>
              {formatCompactCount(item.voteCount)} votes
            </span>
          </div>

          {genres.length > 0 ? (
            <ul className={styles.genres} aria-label="Genres">
              {genres.map((genre) => (
                <li key={genre} className={styles.genre}>
                  {genre}
                </li>
              ))}
            </ul>
          ) : null}

          <p className={styles.overview}>
            {item.overview.length > 0
              ? item.overview
              : 'No synopsis has been published for this title yet.'}
          </p>

          <div className={styles.actions}>
            <GlassButton variant="primary" size="md" onClick={onClose}>
              Close
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}
