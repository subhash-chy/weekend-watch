/**
 * Media player state machine.
 *
 * Wraps a single `<video>` element and exposes imperative transport actions
 * alongside the mirrored state the UI renders. All DOM plumbing lives here so
 * the player components stay declarative.
 *
 * Two deliberate choices:
 *
 *  - **`requestAnimationFrame` drives `currentTime` while playing.** The native
 *    `timeupdate` event fires roughly four times a second, which makes a
 *    scrubber visibly stutter. The rAF loop is started on `play` and cancelled
 *    on `pause`, so it costs nothing while idle.
 *  - **`play()` is never floated.** It returns a promise that rejects when the
 *    browser blocks autoplay; that rejection is caught and surfaced as paused
 *    state rather than an unhandled rejection in the console.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { MediaPlayerState } from '@/types/playback';

/** Playback speeds offered in the rate menu, slowest to fastest. */
export const PLAYBACK_RATES: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Seconds skipped by the rewind/forward buttons and arrow keys. */
export const SKIP_STEP_SECONDS = 10;

/** Volume step applied by the up/down arrow keys. */
const VOLUME_STEP = 0.1;

/** State before any media has loaded. */
const INITIAL_STATE: MediaPlayerState = {
  isPlaying: false,
  isBuffering: false,
  hasEnded: false,
  currentTime: 0,
  duration: 0,
  bufferedRatio: 0,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isFullscreen: false,
  isPictureInPicture: false,
  error: null,
  isReady: false,
};

/** Everything {@link useMediaPlayer} hands back. */
export interface MediaPlayer {
  /** Attach to the `<video>` element. */
  readonly videoRef: RefObject<HTMLVideoElement | null>;
  /** Attach to the fullscreen container. */
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly state: MediaPlayerState;
  readonly togglePlay: () => void;
  /** Skips relative to the current position. */
  readonly skip: (deltaSeconds: number) => void;
  /** Seeks to an absolute position. */
  readonly seekTo: (seconds: number) => void;
  readonly setVolume: (value: number) => void;
  readonly toggleMute: () => void;
  readonly setRate: (rate: number) => void;
  readonly toggleFullscreen: () => void;
  readonly togglePictureInPicture: () => void;
  readonly retry: () => void;
}

/**
 * Drives a video element.
 *
 * @param mediaUrl - Source URL. Changing it resets the transport.
 * @param posterUrl - Optional still shown before playback.
 * @returns Transport state and actions.
 */
export function useMediaPlayer(mediaUrl: string, posterUrl?: string): MediaPlayer {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const [state, setState] = useState<MediaPlayerState>(INITIAL_STATE);

  /** Merges a partial update into state without re-creating the setter. */
  const patch = useCallback((next: Partial<MediaPlayerState>): void => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  /** Cancels a pending animation frame, if one is scheduled. */
  const stopFrameLoop = useCallback((): void => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  /** Reads the furthest buffered position as a 0–1 ratio. */
  const readBufferedRatio = useCallback((video: HTMLVideoElement): number => {
    if (video.duration <= 0 || video.buffered.length === 0) return 0;
    return Math.min(1, video.buffered.end(video.buffered.length - 1) / video.duration);
  }, []);

  /**
   * Starts the rAF loop that keeps `currentTime` smooth.
   *
   * Scheduling is idempotent: calling it while a frame is already pending is a
   * no-op, so overlapping `play` events cannot stack loops.
   */
  const startFrameLoop = useCallback((): void => {
    if (frameRef.current !== null) return;
    const tick = (): void => {
      const video = videoRef.current;
      if (video === null) {
        frameRef.current = null;
        return;
      }
      patch({
        currentTime: video.currentTime,
        bufferedRatio: readBufferedRatio(video),
      });
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [patch, readBufferedRatio]);

  /**
   * Requests playback, treating an autoplay refusal as a normal pause rather
   * than an error.
   */
  const play = useCallback((): void => {
    const video = videoRef.current;
    if (video === null) return;
    void video.play().catch(() => {
      patch({ isPlaying: false });
    });
  }, [patch]);

  const pause = useCallback((): void => {
    const video = videoRef.current;
    if (video === null) return;
    video.pause();
  }, []);

  const togglePlay = useCallback((): void => {
    const video = videoRef.current;
    if (video === null) return;
    if (video.ended) {
      video.currentTime = 0;
    }
    if (video.paused) {
      play();
    } else {
      pause();
    }
  }, [play, pause]);

  const seekTo = useCallback(
    (seconds: number): void => {
      const video = videoRef.current;
      if (video === null || !Number.isFinite(video.duration)) return;
      const clamped = Math.min(Math.max(seconds, 0), video.duration);
      video.currentTime = clamped;
      patch({ currentTime: clamped, hasEnded: false });
    },
    [patch],
  );

  const skip = useCallback(
    (deltaSeconds: number): void => {
      const video = videoRef.current;
      if (video === null) return;
      seekTo(video.currentTime + deltaSeconds);
    },
    [seekTo],
  );

  const setVolume = useCallback(
    (value: number): void => {
      const video = videoRef.current;
      if (video === null) return;
      const clamped = Math.min(Math.max(value, 0), 1);
      video.volume = clamped;
      // Raising the volume from zero is an explicit intent to hear audio.
      if (clamped > 0 && video.muted) video.muted = false;
      patch({ volume: clamped, isMuted: video.muted });
    },
    [patch],
  );

  const toggleMute = useCallback((): void => {
    const video = videoRef.current;
    if (video === null) return;
    video.muted = !video.muted;
    patch({ isMuted: video.muted });
  }, [patch]);

  const setRate = useCallback(
    (rate: number): void => {
      const video = videoRef.current;
      if (video === null) return;
      video.playbackRate = rate;
      patch({ playbackRate: rate });
    },
    [patch],
  );

  const toggleFullscreen = useCallback((): void => {
    const container = containerRef.current;
    if (container === null) return;
    if (document.fullscreenElement === null) {
      // A rejected fullscreen request (permissions policy, iframe sandbox) is
      // recoverable, so it is caught rather than thrown.
      void container.requestFullscreen().catch(() => {
        patch({ isFullscreen: false });
      });
    } else {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [patch]);

  const togglePictureInPicture = useCallback((): void => {
    const video = videoRef.current;
    if (video === null) return;
    const request =
      document.pictureInPictureElement === null
        ? video.requestPictureInPicture().then(() => undefined)
        : document.exitPictureInPicture().then(() => undefined);
    void request.catch(() => {
      patch({ isPictureInPicture: false });
    });
  }, [patch]);

  const retry = useCallback((): void => {
    const video = videoRef.current;
    if (video === null) return;
    video.load();
    patch({ error: null, isReady: false, hasEnded: false });
    play();
  }, [patch, play]);

  // Wire the element's events. Re-runs only when the URL changes, which also
  // covers the reset case.
  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;

    const onLoadedMetadata = (): void => {
      patch({
        duration: video.duration,
        currentTime: video.currentTime,
        volume: video.volume,
        isMuted: video.muted,
        playbackRate: video.playbackRate,
        isReady: true,
        isBuffering: false,
      });
    };
    const onPlay = (): void => {
      patch({ isPlaying: true, hasEnded: false });
      startFrameLoop();
    };
    const onPause = (): void => {
      patch({ isPlaying: false, currentTime: video.currentTime });
      stopFrameLoop();
    };
    const onWaiting = (): void => patch({ isBuffering: true });
    const onPlaying = (): void =>
      patch({ isBuffering: false, isPlaying: true, error: null });
    const onTimeUpdate = (): void =>
      patch({ currentTime: video.currentTime, isBuffering: false });
    const onProgress = (): void => patch({ bufferedRatio: readBufferedRatio(video) });
    const onEnded = (): void => {
      patch({ isPlaying: false, hasEnded: true, currentTime: video.duration });
      stopFrameLoop();
    };
    const onVolumeChange = (): void =>
      patch({ volume: video.volume, isMuted: video.muted });
    const onRateChange = (): void => patch({ playbackRate: video.playbackRate });
    const onError = (): void => {
      const code = video.error?.code;
      const message =
        code === undefined ? 'This title could not be played.' : describeMediaError(code);
      patch({ error: message, isPlaying: false, isBuffering: false });
      stopFrameLoop();
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('progress', onProgress);
    video.addEventListener('ended', onEnded);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ratechange', onRateChange);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ratechange', onRateChange);
      video.removeEventListener('error', onError);
      stopFrameLoop();
    };
  }, [mediaUrl, patch, readBufferedRatio, startFrameLoop, stopFrameLoop]);

  /*
   * There is deliberately no "reset when the URL changes" effect. Writing
   * state synchronously from an effect cascades a second render, and the reset
   * is unnecessary: `WatchPage` keys the player by source URL, so a different
   * title mounts a fresh instance with `INITIAL_STATE` already in place.
   */

  // Fullscreen and PiP are tracked on the document, not the element.
  useEffect(() => {
    const onFullscreenChange = (): void =>
      patch({ isFullscreen: document.fullscreenElement !== null });
    const onPiPChange = (): void =>
      patch({ isPictureInPicture: document.pictureInPictureElement !== null });

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('pictureinpicturechange', onPiPChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('pictureinpicturechange', onPiPChange);
    };
  }, [patch]);

  // Publish metadata to the OS media controls where supported. Guarded because
  // MediaSession is absent in several browsers and in the test environment.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (posterUrl !== undefined) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: mediaUrl.split('/').pop() ?? 'Now playing',
        artwork: [{ src: posterUrl }],
      });
    }
    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('seekbackward', () =>
      skip(-SKIP_STEP_SECONDS),
    );
    navigator.mediaSession.setActionHandler('seekforward', () => skip(SKIP_STEP_SECONDS));
  }, [mediaUrl, pause, play, posterUrl, skip]);

  // Memoised so that `player.videoRef` and the callbacks are stable identities.
  // Returning a fresh object literal each render makes every consumer prop a
  // new value and defeats memoisation downstream.
  return useMemo<MediaPlayer>(
    () => ({
      videoRef,
      containerRef,
      state,
      togglePlay,
      skip,
      seekTo,
      setVolume,
      toggleMute,
      setRate,
      toggleFullscreen,
      togglePictureInPicture,
      retry,
    }),
    [
      retry,
      seekTo,
      setRate,
      setVolume,
      skip,
      state,
      toggleFullscreen,
      toggleMute,
      togglePlay,
      togglePictureInPicture,
    ],
  );
}

/**
 * Maps a `MediaError` code to a message safe to show.
 *
 * @param code - The numeric code from `MediaError.code`.
 * @returns A human-readable explanation.
 */
function describeMediaError(code: number): string {
  switch (code) {
    case 1:
      return 'Playback was aborted before it could start.';
    case 2:
      return 'The network failed while loading this title. Check your connection and try again.';
    case 3:
      return 'This file could not be decoded. It may use a codec your browser does not support.';
    case 4:
      return 'This source is not available in a format your browser can play.';
    default:
      return 'This title could not be played.';
  }
}

/** Clamped helper used by the volume controls. */
export const VOLUME_STEP_AMOUNT = VOLUME_STEP;
