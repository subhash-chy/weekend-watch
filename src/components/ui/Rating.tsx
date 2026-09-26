import type { JSX } from 'react';
/**
 * Rating — accessible, read-only star display.
 *
 * Replaces `react-simple-star-rating`, which was unmaintained and whose v4
 * `allowHalfIcon` prop no longer existed in its published types — the exact
 * error that broke the original build.
 *
 * Accessibility approach: the widget is presentational, so the whole thing is
 * a single `role="img"` with one descriptive label, and the individual stars
 * are hidden. Screen readers therefore hear "Rated 8.3 out of 10, 1,240 votes"
 * once instead of five meaningless "star" nodes.
 */

import classNames from 'classnames';
import { Icon } from '@/assets/icons/Icon';
import { toPercent } from '@/utils/format';
import styles from './Rating.module.css';

/** Always renders five stars, matching the 0–10 → 0–5 conversion. */
const STAR_COUNT = 5;

/** Horizontal gap between stars, in pixels. */
const STAR_GAP = 2;

/** Props accepted by {@link Rating}. */
export interface RatingProps {
  /** TMDB vote average on a 0–10 scale. */
  voteAverage: number;
  /** Optional vote count; when present it is included in the label. */
  voteCount?: number | undefined;
  /** Star edge length in pixels. */
  size?: number | undefined;
  /** Extra classes applied to the root element. */
  className?: string | undefined;
}

/**
 * Formats the accessible label.
 *
 * @param voteAverage - 0–10 score.
 * @param voteCount - Number of votes, if known.
 * @returns A sentence describing the rating.
 */
function describeRating(voteAverage: number, voteCount?: number): string {
  const score = voteAverage.toFixed(1);
  const votes =
    voteCount !== undefined && voteCount > 0
      ? `, from ${voteCount.toLocaleString('en-US')} votes`
      : '';
  return `Rated ${score} out of 10${votes}`;
}

/**
 * Renders a proportional star rating.
 *
 * @param props - Rating props.
 * @returns A labelled, hidden-from-AT star row.
 */
export function Rating({
  voteAverage,
  voteCount,
  size = 16,
  className,
}: RatingProps): JSX.Element {
  // Clamp to 0–1 so an out-of-range API value cannot overflow the track.
  const fraction = Math.min(Math.max(voteAverage / 10, 0), 1);

  // The filled layer is clipped by percentage width, so its inner row has to
  // keep the *full* track width or the stars would squash together.
  const trackWidth = size * STAR_COUNT + STAR_GAP * (STAR_COUNT - 1);

  return (
    <span
      className={classNames(styles.rating, className)}
      role="img"
      aria-label={describeRating(voteAverage, voteCount)}
      title={describeRating(voteAverage, voteCount)}
    >
      <span
        className={styles.track}
        aria-hidden="true"
        style={{ width: trackWidth, height: size }}
      >
        <span className={styles.stars}>
          {Array.from({ length: STAR_COUNT }, (_, index) => (
            <Icon key={index} name="star" size={size} className={styles.starEmpty} />
          ))}
        </span>
        {/* The filled layer is the same row, clipped by width. Rendering it as
            an overlay keeps the layout identical at every rating. */}
        <span className={styles.fill} style={{ width: toPercent(fraction) }}>
          <span className={styles.stars} style={{ width: trackWidth }}>
            {Array.from({ length: STAR_COUNT }, (_, index) => (
              <Icon key={index} name="star" size={size} className={styles.starFull} />
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}
