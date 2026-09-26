/**
 * Integration tests for in-app playback.
 *
 * These render the real router and the real page, against the offline
 * catalogue. They exist because the transport is the one part of the app that
 * unit tests cannot meaningfully cover: what matters is that a link from a card
 * reaches a page that mounts a working player, and that every control is
 * reachable and named.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/app/router';
import { MediaCard } from '@/features/discovery/MediaCard';
import { MOCK_MOVIES } from '@/services/mock/catalog';
import type { MediaItem } from '@/types/media';

// Force the offline catalogue so no test touches the network.
vi.stubEnv('VITE_USE_MOCK_CATALOGUE', '1');

/** A real id from the offline catalogue. */
const WATCHABLE: MediaItem = MOCK_MOVIES[0]!;

/**
 * Renders the route table at a path.
 *
 * @param path - Initial location.
 * @returns Testing Library's render result.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('VITE_USE_MOCK_CATALOGUE', '1');
});

describe('Watch route', () => {
  it('mounts a video element for a title that resolves', async () => {
    renderAt(`/watch/movie/${WATCHABLE.id}`);

    const video = await screen.findByRole('group', {
      name: `${WATCHABLE.title} player`,
    });
    expect(video).toBeInTheDocument();

    const element = document.querySelector('video');
    expect(element).not.toBeNull();
    expect(element).toHaveAttribute('src');
  });

  it('does not use the browser’s native controls', async () => {
    renderAt(`/watch/movie/${WATCHABLE.id}`);
    await screen.findByRole('group', { name: `${WATCHABLE.title} player` });

    // The whole point of the custom transport: the native chrome would be
    // unstyleable and unreachable by the design system.
    expect(document.querySelector('video')).not.toHaveAttribute('controls');
  });

  it('names every icon-only transport control', async () => {
    renderAt(`/watch/movie/${WATCHABLE.id}`);
    await screen.findByRole('group', { name: `${WATCHABLE.title} player` });

    for (const name of [
      'Play',
      'Rewind 10 seconds',
      'Forward 10 seconds',
      'Mute',
      'Picture in picture',
      'Enter full screen',
    ]) {
      expect(screen.getByRole('button', { name }), name).toBeInTheDocument();
    }
  });

  it('keeps the sliders as real range inputs so keyboard and ARIA work', async () => {
    renderAt(`/watch/movie/${WATCHABLE.id}`);
    await screen.findByRole('group', { name: `${WATCHABLE.title} player` });

    const seek = screen.getByRole('slider', { name: `Seek within ${WATCHABLE.title}` });
    expect(seek).toHaveAttribute('aria-valuetext');

    const volume = screen.getByRole('slider', { name: 'Volume' });
    // An exact string, not a regex: jest-dom's `toHaveAttribute` compares with
    // `equals()`, so a RegExp expectation silently never matches.
    expect(volume).toHaveAttribute('aria-valuetext', '100 percent');
  });

  it('offers playback speed as a labelled select', async () => {
    renderAt(`/watch/movie/${WATCHABLE.id}`);
    await screen.findByRole('group', { name: `${WATCHABLE.title} player` });

    expect(screen.getByRole('combobox', { name: 'Playback speed' })).toBeInTheDocument();
  });

  it('renders the 404 for a media type that cannot be watched', async () => {
    renderAt(`/watch/person/${WATCHABLE.id}`);
    await waitFor(() => {
      expect(document.querySelector('video')).toBeNull();
    });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the 404 for a non-numeric id rather than fetching', async () => {
    renderAt('/watch/movie/not-a-number');
    await waitFor(() => {
      expect(document.querySelector('video')).toBeNull();
    });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('says so plainly when playback is disabled, and mounts no video', async () => {
    vi.stubEnv('VITE_PLAYBACK_DISABLED', '1');
    renderAt(`/watch/movie/${WATCHABLE.id}`);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: WATCHABLE.title }),
      ).toBeInTheDocument();
    });
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByText(/playback is disabled/i)).toBeInTheDocument();
  });
});

describe('Playback entry points', () => {
  /**
   * Renders a card inside a router, as the app does.
   *
   * @param item - The title to render.
   * @returns Testing Library's render result.
   */
  function renderCard(item: MediaItem) {
    return render(
      <MemoryRouter>
        <MediaCard item={item} onSelect={() => {}} />
      </MemoryRouter>,
    );
  }

  it('links a card straight to the watch route', () => {
    renderCard(WATCHABLE);

    const play = screen.getByRole('link', { name: `Play ${WATCHABLE.title}` });
    expect(play).toHaveAttribute('href', `/watch/movie/${WATCHABLE.id}`);
  });

  it('keeps the play link outside the details button, as HTML requires', () => {
    const { container } = renderCard(WATCHABLE);

    // Nesting an anchor inside a button is invalid and browsers resolve it
    // unpredictably, so assert the two are siblings.
    const button = container.querySelector('button');
    const link = container.querySelector('a');
    expect(button).not.toBeNull();
    expect(link).not.toBeNull();
    expect(button?.contains(link)).toBe(false);
  });

  it('leaves the details button as the only button on the card', () => {
    renderCard(WATCHABLE);

    // The play affordance must not steal the card's single button role, or the
    // accessible name the discovery rails rely on becomes ambiguous.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
