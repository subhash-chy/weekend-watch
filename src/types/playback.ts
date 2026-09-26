/**
 * Playback domain types.
 *
 * These describe something the player can actually decode — deliberately
 * separate from {@link MediaItem}, which is catalogue metadata. A title having
 * a poster, a synopsis and a rating says nothing about whether a playable file
 * exists for it, and conflating the two is how apps end up promising a stream
 * they cannot deliver.
 */

/**
 * Container the browser consumes.
 *
 * - `progressive` — a single MP4/WebM file. Works in every browser via a plain
 *   `<video src>`, needs no library, and supports HTTP range requests for
 *   seeking.
 * - `hls` — an `.m3u8` playlist. Natively playable in Safari and iOS; other
 *   browsers need a MediaSource engine. The player detects this and reports it
 *   rather than silently failing.
 */
export type PlaybackKind = 'progressive' | 'hls';

/** One subtitle/caption track offered alongside the media. */
export interface CaptionTrack {
  /** URL of a WebVTT file. */
  readonly src: string;
  /** Human label shown in the caption menu. */
  readonly label: string;
  /** BCP-47 tag, used for `srclang` and for auto-matching the UI language. */
  readonly language: string;
  /** Whether this track is on by default. */
  readonly isDefault?: boolean;
}

/** A resolved, playable media source. */
export interface PlaybackSource {
  readonly kind: PlaybackKind;
  /** Media URL. Progressive files should support byte-range requests. */
  readonly url: string;
  /** Still shown behind the video before playback starts. */
  readonly posterUrl?: string;
  /** Duration in seconds, when known ahead of time. */
  readonly durationSeconds?: number;
  readonly captions?: readonly CaptionTrack[];
  /**
   * Human-readable credit for the media itself. Surfaced in the player UI
   * because the demo catalogue streams Creative Commons open movies, whose
   * licences require attribution.
   */
  readonly attribution?: string;
}

/**
 * Outcome of resolving playback for a title.
 *
 * `unavailable` is a first-class result, not an error: most catalogue entries
 * have no licence to stream, and the honest answer is to say so rather than
 * render a button that fails.
 */
export type PlaybackResolution =
  | { readonly status: 'available'; readonly source: PlaybackSource }
  | { readonly status: 'unavailable'; readonly reason: string };

/** Live state the player mirrors out of the `<video>` element. */
export interface MediaPlayerState {
  readonly isPlaying: boolean;
  /** True between `loadstart` and the first frame, or during a seek. */
  readonly isBuffering: boolean;
  /** True once playback reached the end. */
  readonly hasEnded: boolean;
  readonly currentTime: number;
  /** Total duration, or `0` until metadata loads. */
  readonly duration: number;
  /** Fraction of the file buffered ahead of the playhead, 0–1. */
  readonly bufferedRatio: number;
  /** 0–1. */
  readonly volume: number;
  readonly isMuted: boolean;
  readonly playbackRate: number;
  readonly isFullscreen: boolean;
  readonly isPictureInPicture: boolean;
  /** Set once the element raises an `error` event. */
  readonly error: string | null;
  /** Whether metadata has loaded, i.e. `duration` is trustworthy. */
  readonly isReady: boolean;
}
