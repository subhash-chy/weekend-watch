/**
 * Freely-licensed demo media.
 *
 * **Why this file exists.** TMDB is a metadata service: it publishes posters,
 * synopses and ratings, never video files. There is no legal source of
 * commercial movie streams to point a player at. Rather than ship a player that
 * cannot play anything, the demo catalogue resolves to openly licensed films —
 * the Blender Foundation's open movies and Google's public test clips — so the
 * player is genuinely exercised end to end with no account and no key.
 *
 * Swap this registry (or set `VITE_PLAYBACK_BASE_URL`) to point at real
 * licensed media; nothing else in the player needs to change.
 *
 * All URLs are HTTPS and support byte-range requests, which seeking requires.
 * Durations are intentionally *not* hard-coded: the player reads them from the
 * media element's metadata, which is authoritative.
 */

import type { PlaybackSource } from '@/types/playback';

/** Host serving the public sample bucket. */
const SAMPLE_ORIGIN = 'https://storage.googleapis.com/gtv-videos-bucket/sample';

/** One entry in the demo registry. */
export interface DemoClip {
  /** Stable identifier, also the lookup key. */
  readonly id: string;
  /** Display title of the underlying film — not the catalogue title. */
  readonly title: string;
  readonly source: PlaybackSource;
}

/**
 * The demo catalogue.
 *
 * The four Blender open movies are the substantial entries (nine to fifteen
 * minutes each); the short clips exist so rapid seeking and replay are quick to
 * observe during development.
 */
export const DEMO_CLIPS: readonly DemoClip[] = [
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny',
    source: {
      kind: 'progressive',
      url: `${SAMPLE_ORIGIN}/BigBuckBunny.mp4`,
      attribution: 'Big Buck Bunny — Blender Foundation, CC-BY 3.0',
    },
  },
  {
    id: 'sintel',
    title: 'Sintel',
    source: {
      kind: 'progressive',
      url: `${SAMPLE_ORIGIN}/Sintel.mp4`,
      attribution: 'Sintel — Blender Foundation, CC-BY 3.0',
    },
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel',
    source: {
      kind: 'progressive',
      url: `${SAMPLE_ORIGIN}/TearsOfSteel.mp4`,
      attribution: 'Tears of Steel — Blender Foundation, CC-BY 3.0',
    },
  },
  {
    id: 'elephants-dream',
    title: 'Elephants Dream',
    source: {
      kind: 'progressive',
      url: `${SAMPLE_ORIGIN}/ElephantsDream.mp4`,
      attribution: 'Elephants Dream — Blender Foundation, CC-BY 3.0',
    },
  },
  {
    id: 'for-bigger-fun',
    title: 'For Bigger Fun',
    source: {
      kind: 'progressive',
      url: `${SAMPLE_ORIGIN}/ForBiggerFun.mp4`,
      attribution: 'Google sample clip, provided for testing',
    },
  },
  {
    id: 'for-bigger-escapes',
    title: 'For Bigger Escapes',
    source: {
      kind: 'progressive',
      url: `${SAMPLE_ORIGIN}/ForBiggerEscapes.mp4`,
      attribution: 'Google sample clip, provided for testing',
    },
  },
];

/**
 * Looks a clip up by id.
 *
 * @param id - Registry identifier.
 * @returns The matching clip, or `undefined`.
 */
export function findDemoClip(id: string): DemoClip | undefined {
  return DEMO_CLIPS.find((clip) => clip.id === id);
}
