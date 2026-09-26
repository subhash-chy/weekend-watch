/**
 * Tests for playback resolution.
 *
 * These cover the contract the player depends on: a title either resolves to
 * something playable with a stable URL, or it reports why not. The "why not"
 * branch matters as much as the happy path — it is what stops the UI offering a
 * Play button that leads nowhere.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_CLIPS } from '@/services/playback/sources';
import {
  PLAYBACK_DISABLED_REASON,
  resolvePlayback,
  sourceOrNull,
} from '@/services/playback/resolver';
import { MOCK_TRENDING } from '@/services/mock/catalog';
import type { MediaItem } from '@/types/media';

/**
 * Builds a minimal catalogue entry.
 *
 * @param overrides - Fields to override.
 * @returns A `MediaItem`.
 */
function makeItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 24,
    mediaType: 'movie',
    title: 'Neon Meridian',
    originalTitle: 'Neon Meridian',
    overview: 'A courier smuggles a memory.',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2025-03-12',
    voteAverage: 7.4,
    voteCount: 128,
    popularity: 42.5,
    genreIds: [878],
    originalLanguage: 'en',
    adult: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolvePlayback', () => {
  it('resolves a playable progressive source for a catalogue entry', () => {
    const resolution = resolvePlayback(makeItem());

    expect(resolution.status).toBe('available');
    if (resolution.status !== 'available') return;
    const primary = resolution.sources[0];
    expect(primary).toBeDefined();
    expect(primary?.kind).toBe('progressive');
    expect(primary?.url).toMatch(/^https:\/\/.+\.mp4$/);
  });

  it('is deterministic, so a shared link always plays the same film', () => {
    const first = resolvePlayback(makeItem({ id: 4242 }));
    const second = resolvePlayback(makeItem({ id: 4242 }));

    expect(first).toEqual(second);
  });

  it('spreads different titles across the registry instead of one clip', () => {
    const urls = new Set(
      Array.from({ length: DEMO_CLIPS.length * 3 }, (_, index) => {
        const resolution = resolvePlayback(makeItem({ id: index + 1 }));
        return resolution.status === 'available'
          ? (resolution.sources[0]?.url ?? '')
          : '';
      }),
    );

    expect(urls.size).toBe(DEMO_CLIPS.length);
  });

  it('resolves every entry in the shipped catalogue', () => {
    // A title that renders a Play button but cannot resolve is the exact bug
    // this guards against.
    for (const item of MOCK_TRENDING) {
      expect(resolvePlayback(item).status, item.title).toBe('available');
    }
  });

  it('points at the configured media origin when one is set', () => {
    vi.stubEnv('VITE_PLAYBACK_BASE_URL', 'https://media.example.com/');

    const resolution = resolvePlayback(makeItem({ id: 99, mediaType: 'tv' }));

    expect(resolution.status).toBe('available');
    if (resolution.status !== 'available') return;
    // The trailing slash on the base must not produce a doubled separator.
    expect(resolution.sources[0]?.url).toBe('https://media.example.com/tv/99.mp4');
  });

  it('reports a reason instead of a source when playback is disabled', () => {
    vi.stubEnv('VITE_PLAYBACK_DISABLED', '1');

    const resolution = resolvePlayback(makeItem());

    expect(resolution.status).toBe('unavailable');
    if (resolution.status !== 'unavailable') return;
    expect(resolution.reason).toBe(PLAYBACK_DISABLED_REASON);
  });

  it('credits the underlying media, as the CC-BY licences require', () => {
    const resolution = resolvePlayback(makeItem());
    if (resolution.status !== 'available') throw new Error('expected a source');

    // Every source carries credit, as the licences require.
    for (const source of resolution.sources) {
      expect(source.attribution).toMatch(/CC-BY|CC0|sample media/);
    }
  });
});

describe('sourceOrNull', () => {
  it('narrows an available resolution to its source', () => {
    expect(sourceOrNull(resolvePlayback(makeItem()))).not.toBeNull();
  });

  it('returns null rather than throwing when nothing is playable', () => {
    vi.stubEnv('VITE_PLAYBACK_DISABLED', '1');
    expect(sourceOrNull(resolvePlayback(makeItem()))).toBeNull();
  });
});
