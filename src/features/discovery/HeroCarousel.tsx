/**
 * HeroCarousel — the featured-title showcase above the fold.
 *
 * This is the Largest Contentful Paint element, so it is built for it:
 *  - slide one is rendered immediately with `fetchPriority="high"` and
 *    `loading="eager"`, and is preloaded from `index.html`;
 *  - the frame has a fixed aspect ratio, so the hero reserves its box before
 *    any image arrives and CLS stays at 0 even when artwork is slow;
 *  - the headline is real text over a scrim, not text baked into an image.
 *
 * It follows the ARIA carousel pattern: `aria-roledescription="carousel"`, one
 * labelled `slide` group per item, and an `aria-live` region that is muted
 * while auto-rotating (so a screen reader is not interrupted every six seconds)
 * and polite once the user pauses it. Auto-rotation also stops for reduced
 * motion, on hover, and while focus is inside the carousel.
 *
 * Non-current slides are marked `inert` so they leave both the tab order and
 * the accessibility tree — otherwise a keyboard user would tab through four
 * invisible slides.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
import type { JSX, ReactNode } from 'react';
import { Icon } from '@/assets/icons/Icon';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { resolveBackdropSrc, backdropSrcSet } from '@/services/tmdb/images';
import { formatReleaseDate, genreLabels, truncate } from '@/utils/format';
import { HERO_SLIDE_COUNT } from '@/utils/constants';
import type { MediaItem } from '@/types/media';
import styles from './HeroCarousel.module.css';

/** Hero artwork rendition: 1280×720. */
const HERO_WIDTH = 1280;
const HERO_HEIGHT = 720;

/** Auto-advance interval. */
const AUTOPLAY_MS = 6000;

/** Props accepted by {@link HeroCarousel}. */
export interface HeroCarouselProps {
  /** Featured titles. Truncated to {@link HERO_SLIDE_COUNT}. */
  items: readonly MediaItem[];
  /** Invoked when the user opens a slide's details. */
  onSelect: (item: MediaItem) => void;
  /** Rendered beneath the headline — usually the search form. */
  children?: ReactNode | undefined;
}

/**
 * Renders the hero carousel.
 *
 * @param props - Carousel props.
 * @returns A labelled carousel region, or `null` when there is nothing to show.
 */
export function HeroCarousel({
  items,
  onSelect,
  children,
}: HeroCarouselProps): JSX.Element | null {
  const slides = items.slice(0, HERO_SLIDE_COUNT);
  const [rawIndex, setRawIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const regionRef = useRef<HTMLElement>(null);

  // Auto-rotation is off entirely for reduced-motion users; the manual
  // controls remain, so nothing is lost.
  const autoplaying = !prefersReducedMotion && !paused && slides.length > 1;

  /**
   * Selects a slide. Wrapping is handled by the clamped `index` derivation, so
   * this only records intent.
   *
   * @param next - Target slide index.
   */
  const goTo = useCallback((next: number): void => {
    setRawIndex(next);
  }, []);

  useEffect(() => {
    if (!autoplaying) return;
    const timer = setInterval(() => {
      setRawIndex((current) => current + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [autoplaying, slides.length]);

  /**
   * Index clamped to the current slide count.
   *
   * Derived during render rather than corrected in an effect: switching
   * catalogue can shrink the list, and an effect would render one frame of
   * out-of-range state before fixing it.
   */
  const index =
    slides.length === 0
      ? 0
      : ((rawIndex % slides.length) + slides.length) % slides.length;

  if (slides.length === 0) return null;

  return (
    <section
      ref={regionRef}
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label="Featured titles"
      // Pause auto-rotation while the pointer or focus is inside.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={styles.viewport}
        // Muted while rotating so slides are not announced unbidden.
        aria-live={autoplaying ? 'off' : 'polite'}
      >
        <div
          className={styles.track}
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((item, slideIndex) => {
            const isCurrent = slideIndex === index;
            const genres = genreLabels(item.genreIds, 2);
            return (
              <div
                key={item.id}
                id={`hero-slide-${slideIndex}`}
                className={styles.slide}
                role="group"
                aria-roledescription="slide"
                aria-label={`${slideIndex + 1} of ${slides.length}: ${item.title}`}
                // `inert` removes hidden slides from the tab order and a11y
                // tree in one attribute.
                inert={!isCurrent}
              >
                <img
                  className={styles.image}
                  src={resolveBackdropSrc(item)}
                  {...(backdropSrcSet(item.backdropPath) !== undefined
                    ? { srcSet: backdropSrcSet(item.backdropPath) }
                    : {})}
                  sizes="100vw"
                  width={HERO_WIDTH}
                  height={HERO_HEIGHT}
                  alt=""
                  // Slide one is the LCP candidate; the rest are offscreen.
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={slideIndex === 0 ? 'high' : 'auto'}
                />
                <div className={styles.scrim} aria-hidden="true" />

                <div className={classNames(cls(styles, 'content'), 'ww-shell')}>
                  <div className={styles.contentInner}>
                    <p className={styles.eyebrow}>
                      {item.mediaType === 'tv' ? 'Featured series' : 'Featured film'}
                      {genres.length > 0 ? ` · ${genres.join(' · ')}` : ''}
                    </p>
                    <h1 className={styles.title}>{item.title}</h1>
                    <p className={styles.overview}>{truncate(item.overview, 190)}</p>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={() => onSelect(item)}
                      >
                        <Icon name="info" size={18} aria-hidden="true" />
                        More details
                      </button>
                      <span className={styles.meta}>
                        {formatReleaseDate(item.releaseDate)} · ★{' '}
                        {item.voteAverage.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {children !== undefined ? (
        <div className={classNames(cls(styles, 'searchSlot'), 'ww-shell')}>
          {children}
        </div>
      ) : null}

      <div className={classNames(cls(styles, 'controls'), 'ww-shell')}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => goTo(index - 1)}
          aria-label="Previous featured title"
        >
          <Icon name="chevron-left" size={20} />
        </button>

        <div className={styles.dots} role="tablist" aria-label="Choose a featured title">
          {slides.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-label={`Show ${item.title}`}
              aria-controls={`hero-slide-${dotIndex}`}
              className={classNames(
                cls(styles, 'dot'),
                dotIndex === index && cls(styles, 'dotActive'),
              )}
              onClick={() => goTo(dotIndex)}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.arrow}
          onClick={() => goTo(index + 1)}
          aria-label="Next featured title"
        >
          <Icon name="chevron-right" size={20} />
        </button>
      </div>
    </section>
  );
}
