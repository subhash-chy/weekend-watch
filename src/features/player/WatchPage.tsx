/**
 * Watch route.
 *
 * A real page rather than a modal, for three reasons: playback is the primary
 * task on this screen and deserves the viewport; a URL makes a position in a
 * title shareable; and it keeps the player out of the discovery bundle so
 * nobody downloading the home page pays for it.
 *
 * The route is `/watch/:mediaType/:id`. Both params are validated before any
 * request is made — an invalid link renders the not-found state instead of
 * firing a fetch that cannot succeed.
 */

import { useMemo } from 'react';
import type { JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './WatchPage.module.css';
import { VideoPlayer } from '@/features/player/VideoPlayer';
import { NotFoundPage } from '@/features/error/NotFoundPage';
import { ErrorState } from '@/components/ui/ErrorState';
import { GlassButton } from '@/components/ui/GlassButton';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/assets/icons/Icon';
import { useMediaDetails } from '@/hooks/use-catalogue';
import { usePageSeo } from '@/hooks/use-page-seo';
import { resolvePlayback } from '@/services/playback/resolver';
import { describeError } from '@/services/catalog';
import { ROUTES } from '@/utils/constants';
import { cls } from '@/utils/cx';
import { formatReleaseDate, genreLabels, truncate } from '@/utils/format';

/** The two media kinds that can be watched. */
const WATCHABLE_TYPES = ['movie', 'tv'] as const;

/** A `mediaType` route param narrowed to a watchable kind. */
type WatchableType = (typeof WATCHABLE_TYPES)[number];

/**
 * Narrows a route param to a watchable media type.
 *
 * @param value - Raw route param.
 * @returns The narrowed type, or `undefined`.
 */
function toWatchableType(value: string | undefined): WatchableType | undefined {
  return WATCHABLE_TYPES.find((type) => type === value);
}

/**
 * Renders the player page for one title.
 *
 * @returns The watch view, a loading skeleton, an error panel, or the 404.
 */
export function WatchPage(): JSX.Element {
  const params = useParams<{ mediaType?: string; id?: string }>();

  const mediaType = toWatchableType(params.mediaType);
  const id = useMemo(() => {
    const parsed = Number(params.id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, [params.id]);

  // A malformed link is a 404, not an error: there is nothing to retry.
  if (mediaType === undefined || id === undefined) return <NotFoundPage />;

  return <WatchView mediaType={mediaType} id={id} />;
}

/** Props for the resolved half of the page. */
interface WatchViewProps {
  readonly mediaType: WatchableType;
  readonly id: number;
}

/**
 * The page body once the route params are known to be valid.
 *
 * Split from {@link WatchPage} so the hooks below can assume non-optional
 * params and the early-return 404 stays above them.
 *
 * @param mediaType - Validated media kind.
 * @param id - Validated catalogue id.
 * @returns The watch view.
 */
function WatchView({ mediaType, id }: WatchViewProps): JSX.Element {
  const { data, isLoading, error, retry } = useMediaDetails(mediaType, id);

  const description =
    data?.overview !== undefined && data.overview.length > 0
      ? truncate(data.overview, 160)
      : `Watch ${data?.title ?? 'this title'} on Weekend Watch.`;

  usePageSeo({
    title: data === undefined ? 'Loading' : `Watch ${data.title}`,
    description,
    path: `/watch/${mediaType}/${id}`,
    jsonLd:
      data === undefined
        ? undefined
        : {
            '@context': 'https://schema.org',
            '@type': mediaType === 'movie' ? 'Movie' : 'TVSeries',
            name: data.title,
            description: data.overview,
            datePublished: data.releaseDate ?? undefined,
          },
  });

  if (isLoading) {
    return (
      <div className={cls(styles, 'page')}>
        <Skeleton className={cls(styles, 'playerSkeleton')} />
        <Skeleton className={cls(styles, 'titleSkeleton')} />
        <Skeleton className={cls(styles, 'bodySkeleton')} />
        <span className="ww-sr-only" role="status">
          Loading title
        </span>
      </div>
    );
  }

  if (error !== undefined || data === undefined) {
    return (
      <div className={cls(styles, 'page')}>
        <ErrorState
          title="We couldn’t load that title"
          message={describeError(error)}
          onRetry={retry}
          retryLabel="Try again"
        >
          <GlassButton variant="secondary" size="md" to={ROUTES.home}>
            Back to browsing
          </GlassButton>
        </ErrorState>
      </div>
    );
  }

  const genres = genreLabels(data.genreIds, 4);
  // Pure and synchronous, so it is safe to call after the guards above rather
  // than memoising it.
  const resolution = resolvePlayback(data);

  return (
    <div className={cls(styles, 'page')}>
      <Link to={ROUTES.home} className={cls(styles, 'back')}>
        <Icon name="chevron-left" size={16} aria-hidden="true" />
        Browse titles
      </Link>

      {resolution.status === 'unavailable' ? (
        <div className={cls(styles, 'unavailable')} role="status">
          <Icon name="info" size={28} aria-hidden="true" />
          <h1 className={cls(styles, 'heading')}>{data.title}</h1>
          <p className={cls(styles, 'note')}>{resolution.reason}</p>
        </div>
      ) : (
        <>
          {/*
            Keyed by source URL so switching title remounts the player. That is
            what keeps the transport state fresh, and it is why the hook needs
            no reset effect of its own.
          */}
          <VideoPlayer
            key={resolution.sources[0]?.url ?? String(data.id)}
            sources={resolution.sources}
            title={data.title}
          />

          <header className={cls(styles, 'meta')}>
            <h1 className={cls(styles, 'heading')}>{data.title}</h1>
            <div className={cls(styles, 'facts')}>
              {data.releaseDate !== null ? (
                <span>{formatReleaseDate(data.releaseDate)}</span>
              ) : null}
              <span>{mediaType === 'movie' ? 'Film' : 'Series'}</span>
              {data.voteCount > 0 ? (
                <Rating voteAverage={data.voteAverage} voteCount={data.voteCount} />
              ) : null}
            </div>
            {genres.length > 0 ? (
              <ul className={cls(styles, 'genres')} aria-label="Genres">
                {genres.map((genre) => (
                  <li key={genre} className={cls(styles, 'genre')}>
                    {genre}
                  </li>
                ))}
              </ul>
            ) : null}
            {data.overview.length > 0 ? (
              <p className={cls(styles, 'overview')}>{data.overview}</p>
            ) : null}
          </header>
        </>
      )}
    </div>
  );
}
