import { useRef, useState } from 'react';
import {
  Captions,
  CaptionsOff,
  Gauge,
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { IconButton, Tip } from '../ui/IconButton';
import { Slider } from '../ui/Slider';
import { cn, formatTime } from '../../lib/utils';
import type { MediaItem, RepeatMode } from '../../types';

export interface PlaybackState {
  playing: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  subtitles: boolean;
  loopOne: boolean;
  cinema: boolean;
  showStats: boolean;
  shuffle: boolean;
}

interface Props {
  state: PlaybackState;
  item: MediaItem | undefined;
  repeat: RepeatMode;
  hasNext: boolean;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onSeekBy: (delta: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolume: (value: number) => void;
  onToggleMute: () => void;
  onCycleRate: () => void;
  onSetRate: (rate: number) => void;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleSubtitles: () => void;
  onToggleStats: () => void;
  onToggleCinema: () => void;
  onToggleLoopOne: () => void;
  onOpenQueue: () => void;
  onToggleFullscreen: () => void;
  className?: string;
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function ControlBar({
  state,
  item,
  repeat,
  hasNext,
  onToggle,
  onSeek,
  onSeekBy,
  onNext,
  onPrevious,
  onVolume,
  onToggleMute,
  onCycleRate,
  onSetRate,
  onCycleRepeat,
  onToggleShuffle,
  onToggleSubtitles,
  onToggleStats,
  onToggleCinema,
  onToggleLoopOne,
  onOpenQueue,
  onToggleFullscreen,
  className,
}: Props) {
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const rateTimer = useRef<number | null>(null);

  const displayTime = scrubbing ?? state.currentTime;
  const VolumeIcon = state.muted || state.volume === 0 ? VolumeX : state.volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = state.loopOne || repeat === 'one' ? Repeat1 : Repeat;
  const repeatActive = state.loopOne || repeat !== 'off';

  return (
    <div
      className={cn(
        'pointer-events-auto relative flex flex-col gap-2 rounded-2xl border border-white/10 px-3 pt-2.5 pb-2.5',
        'bg-ink-950/55 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl',
        className,
      )}
    >
      {/* ---- timeline ---- */}
      <div className="flex items-center gap-3">
        <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-200">
          {formatTime(displayTime)}
        </span>
        <Slider
          ariaLabel="Seek"
          className="flex-1"
          min={0}
          max={state.duration || item?.duration || 1}
          step={0.05}
          value={displayTime}
          trailing={state.buffered}
          onScrubStart={() => setScrubbing(state.currentTime)}
          onScrubEnd={() => setScrubbing(null)}
          onChange={(value) => {
            setScrubbing(value);
            onSeek(value);
          }}
        />
        <span className="w-11 shrink-0 font-mono text-[11px] tabular-nums text-ink-400">
          -{formatTime(Math.max(0, (state.duration || 0) - displayTime))}
        </span>
      </div>

      {/* ---- buttons ---- */}
      <div className="flex items-center gap-1">
        <Tip label="Previous (P)" side="top">
          <IconButton size="sm" variant="ghost" onClick={onPrevious} aria-label="Previous" icon={<SkipBack className="h-4 w-4" />} round />
        </Tip>
        <Tip label="Back 10s (←)" side="top">
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => onSeekBy(-10)}
            aria-label="Back 10 seconds"
            round
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          />
        </Tip>
        <button
          type="button"
          onClick={onToggle}
          aria-label={state.playing ? 'Pause' : 'Play'}
          className={cn(
            'mx-0.5 grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white',
            'bg-linear-to-b from-white/22 to-white/8 backdrop-blur-xl transition-transform active:scale-95',
            'hover:from-white/30 hover:to-white/14',
          )}
        >
          {state.playing ? <Pause className="h-4 w-4" /> : <Play className="ml-[1px] h-4 w-4" />}
        </button>
        <Tip label="Forward 10s (→)" side="top">
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => onSeekBy(10)}
            aria-label="Forward 10 seconds"
            round
            icon={<RotateCcw className="h-3.5 w-3.5 -scale-x-100" />}
          />
        </Tip>
        <Tip label={`Next (N)${hasNext ? '' : ' — queue empty'}`} side="top">
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next"
            icon={<SkipForward className="h-4 w-4" />}
            round
          />
        </Tip>

        <div className="mx-1 h-5 w-px bg-white/10" />

        <div className="group/vol flex items-center">
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onToggleMute}
            aria-label="Mute"
            round
            icon={<VolumeIcon className="h-4 w-4" />}
          />
          <Slider
            ariaLabel="Volume"
            aria-valuetext={`${Math.round(state.volume * 100)} percent`}
            className="w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover/vol:w-20 group-hover/vol:opacity-100 group-focus-within/vol:w-20 group-focus-within/vol:opacity-100 sm:w-20 sm:opacity-100"
            min={0}
            max={1}
            step={0.02}
            value={state.muted ? 0 : state.volume}
            onChange={onVolume}
          />
        </div>

        <div className="mx-auto hidden items-center gap-1 md:flex">
          <IconButton
            size="sm"
            variant="ghost"
            active={state.cinema}
            onClick={onToggleCinema}
            aria-label="Cinema mode"
            round
            icon={state.cinema ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          />
          <IconButton
            size="sm"
            variant="ghost"
            active={state.subtitles}
            onClick={onToggleSubtitles}
            aria-label="Subtitles"
            round
            icon={state.subtitles ? <Captions className="h-3.5 w-3.5" /> : <CaptionsOff className="h-3.5 w-3.5" />}
          />
          <IconButton
            size="sm"
            variant="ghost"
            active={state.shuffle}
            onClick={onToggleShuffle}
            aria-label="Shuffle"
            round
            icon={<Shuffle className="h-3.5 w-3.5" />}
          />
          <IconButton
            size="sm"
            variant="ghost"
            active={repeatActive}
            onClick={onCycleRepeat}
            aria-label="Repeat mode"
            round
            icon={<RepeatIcon className="h-3.5 w-3.5" />}
            className="relative"
          />
          <IconButton
            size="sm"
            variant="ghost"
            active={state.loopOne}
            onClick={onToggleLoopOne}
            aria-label="Loop current item"
            round
            icon={<span className="font-mono text-[10px] font-bold">1×</span>}
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <div
            className="relative"
            onMouseLeave={() => {
              if (rateTimer.current) window.clearTimeout(rateTimer.current);
              rateTimer.current = window.setTimeout(() => setRateOpen(false), 220);
            }}
            onMouseEnter={() => {
              if (rateTimer.current) window.clearTimeout(rateTimer.current);
              setRateOpen(true);
            }}
          >
            {rateOpen && (
              <div className="animate-rise absolute bottom-[calc(100%+8px)] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-ink-900/92 p-1 shadow-panel backdrop-blur-2xl">
                {RATES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      onSetRate(value);
                      setRateOpen(false);
                    }}
                    className={cn(
                      'rounded-lg px-2 py-1 font-mono text-[10.5px] transition-colors',
                      state.rate === value ? 'bg-white/16 text-white' : 'text-ink-300 hover:bg-white/8 hover:text-ink-100',
                    )}
                  >
                    {value}×
                  </button>
                ))}
              </div>
            )}
            <IconButton
              size="sm"
              variant="ghost"
              onClick={onCycleRate}
              aria-label="Playback speed"
              className="w-11 font-mono text-[10.5px]"
              icon={<Gauge className="h-3.5 w-3.5" />}
            >
              {state.rate}×
            </IconButton>
          </div>

          <IconButton
            size="sm"
            variant="ghost"
            active={state.showStats}
            onClick={onToggleStats}
            aria-label="Statistics"
            round
            className="hidden sm:inline-flex"
            icon={
              <span className="grid grid-cols-2 gap-[2px]">
                <span className="h-[3px] w-[3px] rounded-full bg-current" />
                <span className="h-[3px] w-[3px] rounded-full bg-current opacity-50" />
                <span className="h-[3px] w-[3px] rounded-full bg-current opacity-50" />
                <span className="h-[3px] w-[3px] rounded-full bg-current" />
              </span>
            }
          />
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onOpenQueue}
            aria-label="Queue"
            round
            icon={<ListVideo className="h-3.5 w-3.5" />}
          />
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onToggleFullscreen}
            aria-label="Fullscreen"
            round
            icon={<Maximize className="h-3.5 w-3.5" />}
          />
        </div>
      </div>
    </div>
  );
}
