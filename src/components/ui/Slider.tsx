import { cn } from '../../lib/utils';

interface Props {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  ariaLabel: string;
  /** Rendered to the right of the track. */
  trailing?: number;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

/**
 * Range input dressed up as a macOS slider. Keeps native semantics (keyboard,
 * a11y) while the visuals are fully custom.
 */
export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  className,
  ariaLabel,
  trailing,
  onScrubStart,
  onScrubEnd,
}: Props) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const trailPct =
    trailing === undefined ? 0 : Math.max(0, Math.min(100, ((trailing - min) / (max - min)) * 100));

  return (
    <div className={cn('group/slider relative flex h-5 items-center', className)}>
      <div className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/12">
        {trailing !== undefined && (
          <div className="absolute inset-y-0 left-0 bg-white/18" style={{ width: `${trailPct}%` }} />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-accent-400 to-teal-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white opacity-0 shadow-[0_1px_4px_rgba(0,0,0,0.6)] transition-opacity duration-150 group-hover/slider:opacity-100"
        style={{ left: `${pct}%` }}
      />
      <input
        type="range"
        aria-label={ariaLabel}
        className="relative h-5 w-full cursor-pointer appearance-none bg-transparent"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={onScrubStart}
        onPointerUp={onScrubEnd}
      />
    </div>
  );
}
