/**
 * Playback resolution.
 *
 * Turns a catalogue entry into something the player can decode. Kept
 * deliberately separate from the player itself so the source of truth for
 * "what plays" can be replaced — a CDN, an authenticated edge function, a
 * locally-hosted library — without touching a single line of UI.
 *
 * Resolution order:
 *  1. `VITE_PLAYBACK_BASE_URL` — point at your own media server and every title
 *     resolves to `${base}/${mediaType}/${id}.mp4`.
 *  2. Otherwise the freely-licensed demo registry, assigned deterministically
 *     so a given title always plays the same film.
 *  3. `VITE_PLAYBACK_DISABLED=1` turns resolution off entirely, which is how
 *     the "no playable source" state is exercised in tests and demos.
 */

import { DEMO_CLIPS } from './sources';
import type { MediaItem } from '@/types/media';
import type { PlaybackResolution, PlaybackSource } from '@/types/playback';

/** Reason reported when playback is switched off by configuration. */
export const PLAYBACK_DISABLED_REASON =
  'Playback is disabled for this deployment. Set VITE_PLAYBACK_BASE_URL to serve licensed media.';

/**
 * Reads the configured media origin.
 *
 * @returns A normalised base URL with no trailing slash, or `null`.
 */
function configuredBaseUrl(): string | null {
  const raw = import.meta.env.VITE_PLAYBACK_BASE_URL;
  if (raw === undefined || raw.trim() === '') return null;
  return raw.trim().replace(/\/+$/, '');
}

/**
 * Picks a demo clip deterministically for a catalogue entry.
 *
 * Uses the item id rather than a random draw so the mapping is stable across
 * reloads, sessions and test runs.
 *
 * @param item - The catalogue entry.
 * @returns A playable source from the demo registry.
 */
function demoSourceFor(item: MediaItem): PlaybackSource {
  const index = Math.abs(item.id) % DEMO_CLIPS.length;
  // Modulo over a non-empty array, so this is always defined; the fallback only
  // exists because `noUncheckedIndexedAccess` cannot know that.
  const clip = DEMO_CLIPS[index] ?? DEMO_CLIPS[0];
  if (clip === undefined) {
    throw new Error('The demo clip registry must not be empty.');
  }
  return clip.source;
}

/**
 * Resolves what should play for a catalogue entry.
 *
 * Pure and synchronous, so it can be called during render and tested without
 * mocks.
 *
 * @param item - The catalogue entry to resolve.
 * @returns Either a playable source, or a reason why there is none.
 */
export function resolvePlayback(item: MediaItem): PlaybackResolution {
  if (import.meta.env.VITE_PLAYBACK_DISABLED === '1') {
    return { status: 'unavailable', reason: PLAYBACK_DISABLED_REASON };
  }

  const base = configuredBaseUrl();
  if (base !== null) {
    return {
      status: 'available',
      source: {
        kind: 'progressive',
        url: `${base}/${item.mediaType}/${item.id}.mp4`,
      },
    };
  }

  return { status: 'available', source: demoSourceFor(item) };
}

/**
 * Narrows a resolution to its source, for call sites that have already checked.
 *
 * @param resolution - The resolution to inspect.
 * @returns The source when available, otherwise `null`.
 */
export function sourceOrNull(resolution: PlaybackResolution): PlaybackSource | null {
  return resolution.status === 'available' ? resolution.source : null;
}
