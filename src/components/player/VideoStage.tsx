import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Info,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  SkipForward,
  Volume2,
  Zap,
} from 'lucide-react';
import { ControlBar } from './ControlBar';
import { Badge } from '../ui/Segmented';
import { IconButton, Tip } from '../ui/IconButton';
import { cn, formatTime } from '../../lib/utils';
import { SOURCE_LABEL, artworkBackground } from '../../lib/mockData';
import type { MediaItem, RepeatMode } from '../../types';
import type { PlayerController } from '../../hooks/usePlayer';

interface Props {
  item: MediaItem | undefined;
  next: MediaItem | undefined;
  nextReason: string;
  player: PlayerController;
  repeat: RepeatMode;
  shuffle: boolean;
  cinema: boolean;
  onRequestNext: () => void;
  canSkipNext: boolean;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleFullscreen: () => void;
  onOpenQueue: () => void;
  onOpenDownloads: () => void;
  onOpenInfo: () => void;
}

const IDLE_HIDE_MS = 2600;

export function VideoStage({
  item,
  next,
  nextReason,
  player,
  repeat,
  shuffle,
  cinema,
  onRequestNext,
  canSkipNext,
  onCycleRepeat,
  onToggleShuffle,
  onToggleFullscreen,
  onOpenQueue,
  onOpenDownloads,
  onOpenInfo,
}: Props) {
  const { videoRef, stageRef, state, actions, handlers } = player;
  const [uiVisible, setUiVisible] = useState(true);
  const [dismissedAutoNext, setDismissedAutoNext] = useState<string | null>(null);
  const hideTimer = useRef<number | null>(null);

  /* ---------- auto-hide chrome ---------- */
  const bumpUi = useCallback(() => {
    setUiVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setUiVisible(false);
    }, IDLE_HIDE_MS);
  }, [videoRef]);

  // Arm the idle timer whenever the loaded item changes; the chrome itself is
  // derived from `uiVisible || !playing`, so no extra state is needed.
  useEffect(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setUiVisible(false);
    }, IDLE_HIDE_MS);
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [item?.id, videoRef]);

  const chromeVisible = uiVisible || !state.playing || state.autoNextArmed;
  const showAutoNextCard = state.autoNextArmed && dismissedAutoNext !== item?.id && Boolean(next);

  const toggleFullscreen = () => {
    const node = stageRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (state.cinema) {
      onToggleFullscreen();
      return;
    }
    node.requestFullscreen?.().catch(() => onToggleFullscreen());
  };

  return (
    <section
      ref={stageRef}
      onMouseMove={bumpUi}
      onMouseLeave={() => state.playing && setUiVisible(false)}
      className={cn(
        'group/stage relative isolate w-full overflow-hidden bg-black',
        cinema ? 'aspect-auto h-full flex-1 rounded-none' : 'aspect-video rounded-[18px] sm:rounded-[20px]',
        'ring-1 ring-white/10 shadow-[0_30px_80px_-40px_rgba(0,0,0,1)]',
      )}
    >
      {/* ---- the actual element ---- */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        src={item?.src}
        poster={item?.poster}
        playsInline
        preload="metadata"
        autoPlay
        onClick={actions.toggle}
        onDoubleClick={toggleFullscreen}
        {...handlers}
      />

      {/* ---- subtle vignette / letterbox polish ---- */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,transparent_45%,rgba(0,0,0,0.55)_100%)]" />

      {/* ---- top overlay ---- */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 transition-opacity duration-300 sm:p-5',
          'bg-linear-to-b from-black/70 via-black/25 to-transparent',
          chromeVisible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={item?.kind === 'youtube' ? 'danger' : item?.kind === 'live' ? 'teal' : 'accent'}>
              {item ? SOURCE_LABEL[item.kind] : 'Idle'}
            </Badge>
            {item?.tags.slice(0, 3).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white drop-shadow-lg sm:text-lg">
            {item?.title ?? 'Nothing loaded'}
          </h2>
          <p className="truncate text-[11.5px] text-white/60 sm:text-[12.5px]">{item?.subtitle}</p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span className="rounded-lg border border-white/10 bg-black/45 px-2 py-1 font-mono text-[10.5px] text-white/70 backdrop-blur-xl">
            {item?.resolution ?? '—'}
          </span>
          <span className="rounded-lg border border-white/10 bg-black/45 px-2 py-1 font-mono text-[10.5px] text-white/70 backdrop-blur-xl">
            {item?.quality ?? '—'}
          </span>
          {state.autoNextEnabled && next && (
            <span className="flex items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/12 px-2 py-1 text-[10.5px] font-semibold text-teal-300 backdrop-blur-xl">
              <Zap className="h-3 w-3" /> AUTO
            </span>
          )}
        </div>
      </div>

      {/* ---- autoplay-blocked nudge ---- */}
      {state.autoplayBlocked && (
        <button
          type="button"
          onClick={actions.unmute}
          className="animate-rise absolute top-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3.5 py-1.5 text-[11.5px] text-white backdrop-blur-2xl transition-colors hover:bg-black/85 sm:top-20"
        >
          <Volume2 className="h-3.5 w-3.5" />
          Autoplay started muted — click to unmute
        </button>
      )}

      {/* ---- center affordances ---- */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {state.waiting && !state.error && (
          <span className="relative grid h-16 w-16 place-items-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-white/40" />
            <Loader2 className="h-6 w-6 animate-spin text-white/85" />
            <span className="absolute -bottom-1 font-mono text-[10px] whitespace-nowrap text-white/45">
              cache 0.4Mb/s
            </span>
          </span>
        )}
        {!state.playing && !state.waiting && !state.error && !state.resolvePhase && (
          <button
            type="button"
            onClick={actions.toggle}
            aria-label="Play"
            className={cn(
              'pointer-events-auto grid h-[72px] w-[72px] place-items-center rounded-full border border-white/25 text-white',
              'bg-white/12 backdrop-blur-2xl transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95',
            )}
          >
            <Play className="ml-1 h-7 w-7" />
          </button>
        )}
      </div>

      {/* ---- subtitle sample (mocked CC track) ---- */}
      {state.subtitles && state.playing && !showAutoNextCard && (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-24 flex justify-center transition-opacity duration-300 sm:bottom-28',
            chromeVisible ? 'opacity-100' : 'opacity-70',
          )}
        >
          <span className="rounded-md bg-black/65 px-2.5 py-1 text-center text-[12.5px] leading-snug text-white/90 backdrop-blur-sm">
            [mock cc] the signal is coming through clean tonight…
          </span>
        </div>
      )}

      {/* ---- ended overlay ---- */}
      {state.ended && !state.resolvePhase && (
        <div className="animate-fade absolute inset-0 z-20 grid place-items-center bg-black/70 backdrop-blur-md">
          <div className="w-[min(340px,90%)] rounded-3xl border border-white/10 bg-ink-900/85 p-6 text-center shadow-panel">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-ink-400 uppercase">playback finished</p>
            <h3 className="mt-2 text-[15px] font-semibold text-ink-100">{item?.title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
              {next
                ? `Auto-Next is off. ${next.title} is waiting in the queue.`
                : 'That was the last item in the queue.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <IconButton variant="glass" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={actions.replay}>
                Watch again
              </IconButton>
              {next && (
                <IconButton
                  variant="solid"
                  icon={<SkipForward className="h-3.5 w-3.5" />}
                  onClick={actions.skipNext}
                >
                  Play {next.episodeNumber ? `Episode ${String(next.episodeNumber).padStart(2, '0')}` : 'next'}
                </IconButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- error overlay ---- */}
      {state.error && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/75 backdrop-blur-md">
          <div className="w-[min(360px,90%)] rounded-3xl border border-danger-400/25 bg-ink-900/90 p-6 text-center">
            <ShieldAlert className="mx-auto h-7 w-7 text-danger-400" />
            <h3 className="mt-3 text-[14px] font-semibold text-ink-100">Playback error</h3>
            <p className="mt-1 text-[12px] text-ink-400">{state.error}</p>
            <div className="mt-4 flex justify-center gap-2">
              <IconButton variant="glass" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => actions.setError(null)}>
                Dismiss
              </IconButton>
              <IconButton variant="solid" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={actions.replay}>
                Retry
              </IconButton>
            </div>
          </div>
        </div>
      )}

      {/* ---- resolving (auto-next) overlay ---- */}
      {state.resolvePhase && (
        <div className="animate-fade absolute inset-0 z-30 grid place-items-center bg-ink-950/80 backdrop-blur-xl">
          <div className="w-[min(440px,90%)] overflow-hidden rounded-3xl border border-white/10 bg-ink-900/80 shadow-panel">
            <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
              <span
                className="h-9 w-14 shrink-0 rounded-lg ring-1 ring-white/10"
                style={{ background: artworkBackground(state.resolvePhase.target.accent) }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-ink-400 uppercase">
                  {state.resolvePhase.mode === 'auto' ? 'auto-next · resolving url' : 'manual skip · resolving url'}
                </p>
                <p className="truncate text-[13px] font-semibold text-ink-100">{state.resolvePhase.target.title}</p>
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-accent-300" />
            </div>
            <ul className="space-y-2 px-4 py-3.5">
              {state.resolvePhase.steps.map((step, index) => {
                const done = index < state.resolvePhase!.activeStep;
                const active = index === state.resolvePhase!.activeStep;
                return (
                  <li key={step} className="flex items-center gap-2.5 font-mono text-[11.5px]">
                    <span
                      className={cn(
                        'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                        done
                          ? 'border-teal-400/40 bg-teal-400/15 text-teal-300'
                          : active
                            ? 'border-accent-400/50 bg-accent-400/15 text-accent-300'
                            : 'border-white/10 text-ink-500',
                      )}
                    >
                      {done ? <Check className="h-2.5 w-2.5" /> : active ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
                    </span>
                    <span className={cn('truncate', done ? 'text-ink-400' : active ? 'text-ink-100' : 'text-ink-500')}>
                      {step}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="h-0.5 w-full overflow-hidden bg-white/8">
              <div
                className="h-full bg-linear-to-r from-accent-400 to-teal-400 transition-[width] duration-300 ease-out"
                style={{
                  width: `${((state.resolvePhase.activeStep + 1) / state.resolvePhase.steps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- up-next card ---- */}
      {showAutoNextCard && next && !state.resolvePhase && (
        <div className="animate-slide-in absolute right-3 bottom-28 z-20 w-[min(330px,calc(100%-1.5rem))] sm:right-5 sm:bottom-32">
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-ink-950/72 shadow-panel backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-teal-300 uppercase">
                <Zap className="h-3 w-3" /> {nextReason}
              </span>
              {state.autoNextSeconds !== null && (
                <span className="relative grid h-5 w-5 place-items-center">
                  <svg viewBox="0 0 24 24" className="absolute h-5 w-5 -rotate-90">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="#38e8d0"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 10}
                      strokeDashoffset={2 * Math.PI * 10 * (1 - state.autoNextSeconds / 5)}
                      className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="font-mono text-[9px] font-bold text-white">{state.autoNextSeconds}</span>
                </span>
              )}
            </div>
            <div className="flex gap-3 p-3">
              <span
                className="grid h-14 w-24 shrink-0 place-items-center rounded-xl ring-1 ring-white/10"
                style={{ background: artworkBackground(next.accent) }}
              >
                <Play className="h-4 w-4 text-white/85" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-ink-100">{next.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-400">{next.subtitle}</p>
                <p className="mt-1 font-mono text-[10px] text-ink-500">
                  {formatTime(next.duration)} · {next.quality}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2">
              <IconButton
                size="sm"
                variant="solid"
                icon={<Play className="h-3 w-3" />}
                onClick={() => {
                  setDismissedAutoNext(item?.id ?? null);
                  actions.skipNext();
                }}
              >
                Play now
              </IconButton>
              <IconButton size="sm" variant="ghost" onClick={() => setDismissedAutoNext(item?.id ?? null)}>
                Cancel
              </IconButton>
              <button
                type="button"
                onClick={actions.toggle}
                className="ml-auto flex items-center gap-1 text-[10.5px] text-ink-400 transition-colors hover:text-ink-200"
              >
                <Pause className="h-3 w-3" /> pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- mpv-style stats overlay ---- */}
      {state.showStats && (
        <div className="pointer-events-none absolute top-16 left-4 z-20 w-[236px] rounded-xl border border-white/10 bg-black/72 p-3 font-mono text-[10.5px] leading-[1.55] text-teal-300/90 backdrop-blur-xl sm:top-20">
          <p className="mb-1 text-white/60"># playback statistics</p>
          <p>file    {item?.src?.split('/').pop() ?? '—'}</p>
          <p>video   h264 (High) 1280×720 23.976</p>
          <p>audio   aac 48.0kHz stereo [internal]</p>
          <p>v-a sync  +0.000s   dropped 0/132</p>
          <p>cache   1.4s / 8.0MiB  hwdec: auto-safe</p>
          <p>ahead   {state.buffered.toFixed(1)}s  speed {state.rate.toFixed(2)}×</p>
          <p className="mt-1 text-white/50">[o] osd  [I] info  [D] downloads</p>
        </div>
      )}

      {/* ---- download hint chip ---- */}
      {item && (
        <div
          className={cn(
            'absolute top-16 right-4 z-10 hidden flex-col items-end gap-2 transition-opacity duration-300 lg:flex',
            chromeVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Tip label="Mock yt-dlp download" side="bottom">
            <IconButton
              size="sm"
              variant="glass"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={onOpenDownloads}
              aria-label="Download this item"
            />
          </Tip>
          <Tip label="Media information" side="bottom">
            <IconButton
              size="sm"
              variant="glass"
              icon={<Info className="h-3.5 w-3.5" />}
              onClick={onOpenInfo}
              aria-label="Media information"
            />
          </Tip>
        </div>
      )}

      {/* ---- footer controls, in-flow so they never cover the video ---- */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 p-3 transition-all duration-300 sm:p-4',
          chromeVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-linear-to-t from-black/80 via-black/35 to-transparent" />
        <ControlBar
          className="relative"
          state={{ ...state, shuffle }}
          item={item}
          repeat={repeat}
          hasNext={canSkipNext}
          onToggle={actions.toggle}
          onSeek={actions.seek}
          onSeekBy={actions.seekBy}
          onNext={onRequestNext}
          onPrevious={actions.skipPrevious}
          onVolume={actions.setVolume}
          onToggleMute={actions.toggleMute}
          onCycleRate={actions.cycleRate}
          onSetRate={actions.setPlaybackRate}
          onCycleRepeat={onCycleRepeat}
          onToggleShuffle={onToggleShuffle}
          onToggleSubtitles={actions.toggleSubtitles}
          onToggleStats={actions.toggleStats}
          onToggleCinema={actions.toggleCinema}
          onToggleLoopOne={actions.toggleLoopOne}
          onOpenQueue={onOpenQueue}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>

    </section>
  );
}
