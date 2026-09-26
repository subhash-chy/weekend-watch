/**
 * Freely-licensed demo media.
 *
 * **Why this file exists.** TMDB is a metadata service: it publishes posters,
 * synopses and ratings, never video files. There is no legal source of
 * commercial movie streams to point a player at. Rather than ship a player that
 * cannot play anything, the demo catalogue resolves to openly licensed sample
 * media, so the player is genuinely exercised end to end with no account and no
 * key.
 *
 * **Why every clip carries several sources.** Public sample-video hosts rot:
 * the once-canonical `gtv-videos-bucket` Google bucket now returns
 * `AccessDenied` to anonymous callers, and other mirrors have gone to parked
 * domains. A single hard-coded origin is therefore a playback outage waiting to
 * happen. Each clip lists several independent origins as `<source>` elements;
 * when one host fails, the browser natively advances to the next — no library,
 * no retry loop.
 *
 * Every URL here is HTTPS, anonymously readable (no CORS or token required for
 * plain playback), and was confirmed reachable. Durations are intentionally not
 * hard-coded: the player reads them from the element's metadata.
 *
 * Swap this registry (or set `VITE_PLAYBACK_BASE_URL`) to point at real
 * licensed media; nothing else in the player needs to change.
 */

import type { PlaybackSource } from '@/types/playback';

/** One entry in the demo registry. */
export interface DemoClip {
  /** Stable identifier, also the lookup key. */
  readonly id: string;
  /** Display title of the underlying film. */
  readonly title: string;
  /**
   * Candidate sources, in preference order. Rendered as `<source>` elements so
   * the browser falls through on failure.
   */
  readonly sources: readonly PlaybackSource[];
}

/**
 * The demo catalogue.
 *
 * MDN's `interactive-examples` CDN and W3Schools both host small, CC0-licensed
 * clips that require no credentials and no CORS header for playback, and both
 * were verified reachable. Listing the other host as a fallback keeps playback
 * alive if either mirror disappears.
 */
export const DEMO_CLIPS: readonly DemoClip[] = [
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny',
    sources: [
      {
        kind: 'progressive',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        attribution: 'Big Buck Bunny — Blender Foundation, CC-BY 3.0',
      },
      {
        kind: 'progressive',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        attribution: 'CC0 sample media, Mozilla MDN',
      },
    ],
  },
  {
    id: 'flower',
    title: 'Flower',
    sources: [
      {
        kind: 'progressive',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        attribution: 'CC0 sample media, Mozilla MDN',
      },
      {
        kind: 'progressive',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        attribution: 'Big Buck Bunny — Blender Foundation, CC-BY 3.0',
      },
    ],
  },
  {
    id: 'friday',
    title: 'Friday',
    sources: [
      {
        kind: 'progressive',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
        attribution: 'CC0 sample media, Mozilla MDN',
      },
      {
        kind: 'progressive',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        attribution: 'Big Buck Bunny — Blender Foundation, CC-BY 3.0',
      },
    ],
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
