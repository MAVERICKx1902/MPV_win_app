import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import type { MediaItem, RepeatMode } from '../types';
import { resolveTrace } from '../lib/urlResolver';
import { clamp } from '../lib/utils';

/** Show the "up next" card once this many seconds remain. */
export const AUTO_NEXT_WINDOW = 5;
/** How long each simulated resolver step takes (ms). */
const RESOLVE_STEP_MS = 300;

export interface ResolvePhase {
  target: MediaItem;
  steps: string[];
  activeStep: number;
  mode: 'auto' | 'manual';
}

interface Options {
  current: MediaItem | undefined;
  next: MediaItem | undefined;
  repeat: RepeatMode;
  /** Pull the next item from the queue (wraps according to `repeat`). */
  onAdvance: () => MediaItem | undefined;
  onPrevious: () => void;
  onError?: (message: string) => void;
  onAutoNextScheduled?: (target: MediaItem) => void;
}

/**
 * Owns the HTML5 <video> element: transport state, volume, cinema mode and the
 * simulated URL-resolution "Auto-Next" engine that hands off to the next queue
 * entry once the current one finishes.
 */
export function usePlayer(options: Options) {
  const { current, next, repeat, onAdvance, onPrevious, onError, onAutoNextScheduled } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(current?.duration ?? 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [rate, setRate] = useState(1);
  const [cinema, setCinema] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [subtitles, setSubtitles] = useState(true);
  const [loopOne, setLoopOne] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [autoNextArmed, setAutoNextArmed] = useState(false);
  const [autoNextSeconds, setAutoNextSeconds] = useState<number | null>(null);
  const [resolvePhase, setResolvePhase] = useState<ResolvePhase | null>(null);
  const [ended, setEnded] = useState(false);

  const [autoNextEnabled, setAutoNextEnabledState] = useState(true);
  const autoNextRef = useRef(true);
  const autoplayPendingRef = useRef(true);
  const wasPlayingRef = useRef(false);

  const setAutoNextEnabled = useCallback((value: boolean) => {
    autoNextRef.current = value;
    setAutoNextEnabledState(value);
  }, []);

  /* ---------------------------------------------------------------- *
   *  Transport
   * ---------------------------------------------------------------- */
  const attemptPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
      setPlaying(true);
      setAutoplayBlocked(false);
    } catch {
      // The browser refused unmuted autoplay → fall back to muted playback so
      // the demo still animates, then surface an "unmute" affordance.
      try {
        video.muted = true;
        setMuted(true);
        await video.play();
        setPlaying(true);
        setAutoplayBlocked(true);
      } catch {
        setPlaying(false);
      }
    }
  }, []);

  /* ---------------------------------------------------------------- *
   *  Source changes — reset transport state, keep playing if we were.
   * ---------------------------------------------------------------- */
  // Syncs the mocked "next source" hand-off onto the real <video> element —
  // deliberately an effect, because the element is an external system.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const video = videoRef.current;
    setCurrentTime(0);
    setBuffered(0);
    setDuration(current?.duration ?? 0);
    setEnded(false);
    setAutoNextArmed(false);
    setAutoNextSeconds(null);
    setError(null);

    if (!video) return;
    video.load();
    setWaiting(true);

    if (wasPlayingRef.current || autoplayPendingRef.current) {
      autoplayPendingRef.current = false;
      void attemptPlay();
    }
  }, [current?.id, current?.duration, attemptPlay]);

  const play = useCallback(() => {
    void attemptPlay();
  }, [attemptPlay]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void attemptPlay();
    else pause();
  }, [attemptPlay, pause]);

  const seek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      const target = clamp(seconds, 0, video.duration || duration || 0);
      video.currentTime = target;
      setCurrentTime(target);
    },
    [duration],
  );

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      seek((video?.currentTime ?? currentTime) + delta);
    },
    [currentTime, seek],
  );

  const setVolume = useCallback((value: number) => {
    const next = clamp(value, 0, 1);
    setVolumeState(next);
    setMuted(next === 0);
  }, []);

  const toggleMute = useCallback(() => setMuted((value) => !value), []);

  const unmute = useCallback(() => {
    setMuted(false);
    setAutoplayBlocked(false);
  }, []);

  const cycleRate = useCallback(() => {
    setRate((value) => {
      const ladder = [0.5, 0.75, 1, 1.25, 1.5, 2];
      const index = ladder.indexOf(value);
      return ladder[(index + 1) % ladder.length];
    });
  }, []);

  const setPlaybackRate = useCallback((value: number) => setRate(value), []);
  const toggleCinema = useCallback(() => setCinema((value) => !value), []);
  const toggleStats = useCallback(() => setShowStats((value) => !value), []);
  const toggleSubtitles = useCallback(() => setSubtitles((value) => !value), []);
  const toggleLoopOne = useCallback(() => setLoopOne((value) => !value), []);

  /* ---------------------------------------------------------------- *
   *  Simulated URL resolution (the Auto-Next engine)
   * ---------------------------------------------------------------- */
  const resolveTimers = useRef<number[]>([]);

  const clearResolveTimers = useCallback(() => {
    resolveTimers.current.forEach((id) => window.clearTimeout(id));
    resolveTimers.current = [];
  }, []);

  const runResolution = useCallback(
    (target: MediaItem, mode: 'auto' | 'manual') => {
      clearResolveTimers();
      const steps = resolveTrace(
        target.sourceUrl,
        target.kind === 'youtube' ? 'youtube' : 'mpv-core',
      );
      setResolvePhase({ target, steps, activeStep: 0, mode });

      steps.forEach((_, index) => {
        resolveTimers.current.push(
          window.setTimeout(
            () => setResolvePhase((phase) => (phase ? { ...phase, activeStep: index } : phase)),
            index * RESOLVE_STEP_MS,
          ),
        );
      });

      resolveTimers.current.push(
        window.setTimeout(
          () => {
            wasPlayingRef.current = true;
            const advanced = onAdvance();
            if (!advanced) onError?.('Queue finished — nothing left to auto-play.');
            setResolvePhase(null);
          },
          steps.length * RESOLVE_STEP_MS + 240,
        ),
      );
    },
    [clearResolveTimers, onAdvance, onError],
  );

  const skipNext = useCallback(() => {
    if (!next) {
      onError?.('Nothing queued up next.');
      return;
    }
    setAutoNextArmed(false);
    setAutoNextSeconds(null);
    runResolution(next, 'manual');
  }, [next, onError, runResolution]);

  const skipPrevious = useCallback(() => {
    const video = videoRef.current;
    if (video && video.currentTime > 3) {
      seek(0);
      return;
    }
    onPrevious();
  }, [onPrevious, seek]);

  const cancelAutoNext = useCallback(() => {
    setAutoNextArmed(false);
    setAutoNextSeconds(null);
  }, []);

  const replay = useCallback(() => {
    setEnded(false);
    seek(0);
    void attemptPlay();
  }, [attemptPlay, seek]);

  useEffect(() => () => clearResolveTimers(), [clearResolveTimers]);

  /* ---------------------------------------------------------------- *
   *  <video> event handlers
   * ---------------------------------------------------------------- */
  const handlers = useMemo(
    () => ({
      onLoadedMetadata: (event: SyntheticEvent<HTMLVideoElement>) => {
        const video = event.currentTarget;
        if (Number.isFinite(video.duration) && video.duration > 0) setDuration(video.duration);
        video.volume = volume;
        video.muted = muted;
        video.playbackRate = rate;
      },
      onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => {
        const video = event.currentTarget;
        setCurrentTime(video.currentTime);
        if (video.buffered.length > 0) {
          setBuffered(video.buffered.end(video.buffered.length - 1));
        }
        const remaining = (video.duration || duration) - video.currentTime;
        const shouldArm =
          autoNextRef.current && Boolean(next) && remaining <= AUTO_NEXT_WINDOW && remaining > 0.15;
        setAutoNextArmed((armed) => (armed === shouldArm ? armed : shouldArm));
        setAutoNextSeconds((seconds) => {
          if (!shouldArm) return seconds === null ? null : null;
          const value = Math.max(1, Math.ceil(remaining));
          return seconds === value ? seconds : value;
        });
      },
      onWaiting: () => setWaiting(true),
      onPlaying: () => {
        setWaiting(false);
        setPlaying(true);
        wasPlayingRef.current = true;
      },
      onPause: () => setPlaying(false),
      onError: () => {
        setError('Playback failed — the mock source could not be decoded.');
        setWaiting(false);
      },
      onEnded: () => {
        setAutoNextArmed(false);
        setAutoNextSeconds(null);
        if (loopOne) {
          replay();
          return;
        }
        if (autoNextRef.current && next) {
          onAutoNextScheduled?.(next);
          runResolution(next, 'auto');
          return;
        }
        setEnded(true);
        setPlaying(false);
        if (repeat === 'all') {
          wasPlayingRef.current = true;
          onAdvance();
        }
      },
    }),
    [
      duration,
      loopOne,
      muted,
      next,
      onAdvance,
      onAutoNextScheduled,
      rate,
      repeat,
      replay,
      runResolution,
      volume,
    ],
  );

  /* ---------------------------------------------------------------- *
   *  Side effects that mirror state onto the element
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted || volume === 0;
  }, [volume, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
  }, [rate]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return {
    videoRef,
    stageRef,
    state: {
      playing,
      waiting,
      currentTime,
      duration,
      buffered,
      volume,
      muted,
      rate,
      cinema,
      showStats,
      subtitles,
      loopOne,
      error,
      progress,
      autoNextArmed,
      autoNextSeconds,
      autoNextEnabled,
      resolvePhase,
      autoplayBlocked,
      ended,
    },
    actions: {
      play,
      pause,
      toggle,
      seek,
      seekBy,
      setVolume,
      toggleMute,
      unmute,
      cycleRate,
      setPlaybackRate,
      toggleCinema,
      toggleStats,
      toggleSubtitles,
      toggleLoopOne,
      skipNext,
      skipPrevious,
      cancelAutoNext,
      replay,
      setAutoNextEnabled,
      setError,
    },
    handlers,
  };
}

export type PlayerController = ReturnType<typeof usePlayer>;
