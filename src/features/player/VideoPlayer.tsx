/**
 * In-app video player.
 *
 * A custom transport built directly on the `<video>` element. There is no
 * third-party player, no iframe and no embed: the media is decoded by the
 * browser and every control is rendered by this app, which is what keeps the
 * bundle small and the styling consistent with the rest of the design system.
 *
 * Accessibility decisions worth calling out:
 *
 *  - The seek bar and volume slider are **native `<input type="range">`**. They
 *    are visually replaced, but keeping the real element preserves keyboard
 *    operation, `role="slider"` semantics and screen-reader announcements for
 *    free — reimplementing that on a `div` is where custom players usually go
 *    wrong.
 *  - Every icon-only control has an `aria-label`, and the icons themselves are
 *    `aria-hidden`.
 *  - State changes that a sighted user sees instantly (muted, speed, captions)
 *    are pushed to a polite live region instead.
 *  - Controls stay in the tab order even while visually hidden, so hiding them
 *    on mouse idle never traps or strands a keyboard user.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import styles from './VideoPlayer.module.css';
import { Icon } from '@/assets/icons/Icon';
import { useMediaPlayer } from '@/hooks/use-media-player';
import { PLAYBACK_RATES, SKIP_STEP_SECONDS } from '@/hooks/use-media-player';
import type { PlaybackSource } from '@/types/playback';
import { cls, clsAll } from '@/utils/cx';
import { formatDuration } from '@/utils/format';

/** Milliseconds of pointer inactivity before the controls fade out. */
const CONTROLS_IDLE_MS = 2600;

/** Props accepted by {@link VideoPlayer}. */
export interface VideoPlayerProps {
  /** Resolved media source. */
  readonly source: PlaybackSource;
  /** Accessible name for the player region, normally the title. */
  readonly title: string;
}

/**
 * Renders the player and its transport controls.
 *
 * @param source - What to play.
 * @param title - Human-readable title, used for labelling.
 * @returns The player element.
 */
export function VideoPlayer({ source, title }: VideoPlayerProps): JSX.Element {
  const {
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
  } = useMediaPlayer(source.url, source.posterUrl);

  const idleTimer = useRef<number | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [captionsOn, setCaptionsOn] = useState(false);

  const hasCaptions = (source.captions?.length ?? 0) > 0;

  /**
   * Whether the control bar is showing.
   *
   * Derived rather than stored: a paused player always shows its controls, so
   * there is no state to keep in sync with `isPlaying`. `isIdle` only ever
   * matters while playing, which removes a whole class of "controls stuck
   * hidden after pausing" bug.
   */
  const controlsVisible = !state.isPlaying || !isIdle;

  /**
   * Restarts the idle timer that fades the controls out.
   *
   * Called from user interaction, never from an effect, so it never writes
   * state during a render pass.
   */
  const wake = useCallback((): void => {
    setIsIdle(false);
    if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      setIsIdle(true);
    }, CONTROLS_IDLE_MS);
  }, []);

  /*
   * Arms the idle timer while playing. The only state write happens inside the
   * timeout callback, not in the effect body, so starting playback cannot
   * cascade a second render. `isIdle` begins false, so the controls are already
   * visible when playback starts.
   */
  useEffect(() => {
    if (!state.isPlaying) return;
    idleTimer.current = window.setTimeout(() => {
      setIsIdle(true);
    }, CONTROLS_IDLE_MS);
    return () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    };
  }, [state.isPlaying]);

  /** Toggles text tracks on and off, and announces the change. */
  const toggleCaptions = useCallback((): void => {
    const video = videoRef.current;
    if (video === null) return;
    const next = !captionsOn;
    for (const track of Array.from(video.textTracks)) {
      track.mode = next ? 'showing' : 'disabled';
    }
    setCaptionsOn(next);
    setAnnouncement(next ? 'Captions on' : 'Captions off');
  }, [captionsOn, videoRef]);

  /**
   * Handles every player keyboard shortcut.
   *
   * Attached to the player container rather than the document, so the shortcuts
   * only apply while the player has focus. Space is intercepted to prevent the
   * page scrolling — but only when focus is not on a control that needs it.
   *
   * @param event - The keyboard event.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      const target = event.target as HTMLElement | null;
      // Let native controls keep their own keyboard behaviour.
      const isFormField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'BUTTON';

      switch (event.key) {
        case ' ':
        case 'k': {
          if (event.key === ' ' && isFormField) return;
          event.preventDefault();
          togglePlay();
          setAnnouncement(state.isPlaying ? 'Paused' : 'Playing');
          wake();
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          skip(SKIP_STEP_SECONDS);
          wake();
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          skip(-SKIP_STEP_SECONDS);
          wake();
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          setVolume(state.volume + 0.1);
          wake();
          break;
        }
        case 'ArrowDown': {
          event.preventDefault();
          setVolume(state.volume - 0.1);
          wake();
          break;
        }
        case 'm': {
          event.preventDefault();
          toggleMute();
          setAnnouncement(state.isMuted ? 'Unmuted' : 'Muted');
          wake();
          break;
        }
        case 'f': {
          event.preventDefault();
          toggleFullscreen();
          wake();
          break;
        }
        case 'c': {
          if (!hasCaptions) return;
          event.preventDefault();
          toggleCaptions();
          wake();
          break;
        }
        case 'Home': {
          event.preventDefault();
          seekTo(0);
          wake();
          break;
        }
        case 'End': {
          event.preventDefault();
          seekTo(state.duration);
          wake();
          break;
        }
        default:
          break;
      }
    },
    [
      hasCaptions,
      seekTo,
      setVolume,
      skip,
      state.duration,
      state.isPlaying,
      state.isMuted,
      state.volume,
      toggleCaptions,
      toggleFullscreen,
      toggleMute,
      togglePlay,
      wake,
    ],
  );

  const progressPercent =
    state.duration > 0 ? Math.min(100, (state.currentTime / state.duration) * 100) : 0;
  const bufferedPercent = Math.round(state.bufferedRatio * 100);

  return (
    /*
     * The shortcuts live on the container so they work whichever control has
     * focus, and events bubble up from the controls inside. `role="group"` is
     * the right role here — this is a labelled set of controls, not a widget —
     * which is precisely why the non-interactive-element rule fires. The region
     * is reached through its focusable children, never directly.
     */
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={containerRef}
      className={clsAll(styles, ['player', state.isFullscreen ? 'is-fullscreen' : ''])}
      onKeyDown={handleKeyDown}
      onMouseMove={wake}
      onMouseLeave={() => {
        if (state.isPlaying) setIsIdle(true);
      }}
      onFocus={wake}
      role="group"
      aria-label={`${title} player`}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- captions are attached when the source provides them */}
      <video
        ref={videoRef}
        className={cls(styles, 'video')}
        src={source.url}
        poster={source.posterUrl}
        preload="metadata"
        playsInline
        onClick={togglePlay}
      >
        {source.captions?.map((track) => (
          <track
            key={track.language}
            kind="subtitles"
            src={track.src}
            srcLang={track.language}
            label={track.label}
            default={track.isDefault}
          />
        ))}
      </video>

      {state.isBuffering ? (
        <div className={cls(styles, 'buffering')} role="status">
          <Icon name="spinner" size={44} className={cls(styles, 'spinner')} />
          <span className="ww-sr-only">Buffering</span>
        </div>
      ) : null}

      {!state.isPlaying && !state.isBuffering && state.error === null ? (
        <button
          type="button"
          className={cls(styles, 'bigPlay')}
          onClick={togglePlay}
          aria-label={`Play ${title}`}
        >
          <Icon name="play" size={30} aria-hidden="true" />
        </button>
      ) : null}

      {state.error !== null ? (
        <div className={cls(styles, 'error')} role="alert">
          <Icon name="error" size={32} aria-hidden="true" />
          <p className={cls(styles, 'errorMessage')}>{state.error}</p>
          <button type="button" className={cls(styles, 'retry')} onClick={retry}>
            <Icon name="retry" size={18} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : null}

      <div className={clsAll(styles, ['controls', controlsVisible ? '' : 'is-hidden'])}>
        <div className={cls(styles, 'seekRow')}>
          <div className={cls(styles, 'seekTrack')} aria-hidden="true">
            <div
              className={cls(styles, 'seekBuffered')}
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className={cls(styles, 'seekPlayed')}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            className={cls(styles, 'seekInput')}
            min={0}
            max={state.duration > 0 ? state.duration : 0}
            step={0.5}
            value={Math.min(state.currentTime, state.duration || 0)}
            disabled={state.duration <= 0}
            onChange={(event) => {
              seekTo(Number(event.target.value));
            }}
            aria-label={`Seek within ${title}`}
            aria-valuetext={`${formatDuration(state.currentTime)} of ${formatDuration(state.duration)}`}
          />
        </div>

        <div className={cls(styles, 'buttonRow')}>
          <button
            type="button"
            className={cls(styles, 'control')}
            onClick={togglePlay}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            <Icon
              name={state.isPlaying ? 'pause' : 'play'}
              size={22}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            className={cls(styles, 'control')}
            onClick={() => {
              skip(-SKIP_STEP_SECONDS);
            }}
            aria-label={`Rewind ${SKIP_STEP_SECONDS} seconds`}
          >
            <Icon name="rewind" size={20} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={cls(styles, 'control')}
            onClick={() => {
              skip(SKIP_STEP_SECONDS);
            }}
            aria-label={`Forward ${SKIP_STEP_SECONDS} seconds`}
          >
            <Icon name="forward" size={20} aria-hidden="true" />
          </button>

          <div className={cls(styles, 'volumeGroup')}>
            <button
              type="button"
              className={cls(styles, 'control')}
              onClick={toggleMute}
              aria-label={state.isMuted || state.volume === 0 ? 'Unmute' : 'Mute'}
              aria-pressed={state.isMuted}
            >
              <Icon
                name={
                  state.isMuted || state.volume === 0
                    ? 'volume-muted'
                    : state.volume < 0.5
                      ? 'volume-low'
                      : 'volume-high'
                }
                size={20}
                aria-hidden="true"
              />
            </button>
            <input
              type="range"
              className={cls(styles, 'volumeInput')}
              min={0}
              max={1}
              step={0.05}
              value={state.isMuted ? 0 : state.volume}
              onChange={(event) => {
                setVolume(Number(event.target.value));
              }}
              aria-label="Volume"
              aria-valuetext={`${Math.round((state.isMuted ? 0 : state.volume) * 100)} percent`}
            />
          </div>

          <span className={cls(styles, 'time')} aria-hidden="true">
            {formatDuration(state.currentTime)} / {formatDuration(state.duration)}
          </span>

          <div className={cls(styles, 'spacer')} />

          {hasCaptions ? (
            <button
              type="button"
              className={clsAll(styles, ['control', captionsOn ? 'is-active' : ''])}
              onClick={toggleCaptions}
              aria-label={captionsOn ? 'Turn captions off' : 'Turn captions on'}
              aria-pressed={captionsOn}
            >
              <Icon name="captions" size={20} aria-hidden="true" />
            </button>
          ) : null}

          <label className={cls(styles, 'rateField')}>
            <span className="ww-sr-only">Playback speed</span>
            <select
              className={cls(styles, 'rateSelect')}
              value={state.playbackRate}
              onChange={(event) => {
                const rate = Number(event.target.value);
                setRate(rate);
                setAnnouncement(`Playback speed ${rate} times`);
              }}
            >
              {PLAYBACK_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}×
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={clsAll(styles, [
              'control',
              state.isPictureInPicture ? 'is-active' : '',
            ])}
            onClick={togglePictureInPicture}
            aria-label={
              state.isPictureInPicture ? 'Exit picture in picture' : 'Picture in picture'
            }
            aria-pressed={state.isPictureInPicture}
          >
            <Icon name="picture-in-picture" size={20} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={cls(styles, 'control')}
            onClick={toggleFullscreen}
            aria-label={state.isFullscreen ? 'Exit full screen' : 'Enter full screen'}
            aria-pressed={state.isFullscreen}
          >
            <Icon
              name={state.isFullscreen ? 'compress' : 'expand'}
              size={20}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {source.attribution !== undefined ? (
        <p className={cls(styles, 'attribution')}>{source.attribution}</p>
      ) : null}

      <p className="ww-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
