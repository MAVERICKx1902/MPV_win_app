import { Activity, Cpu, Radio } from 'lucide-react';
import type { MediaItem } from '../../types';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Segmented';

interface Props {
  item: MediaItem | undefined;
  autoNextEnabled: boolean;
  autoNextSeconds: number | null;
  downloadsActive: number;
  onToggleStats: () => void;
  statsVisible: boolean;
  className?: string;
}

/** Footer strip: core info on the left, auto-next state in the middle, clock right. */
export function StatusBar({
  item,
  autoNextEnabled,
  autoNextSeconds,
  downloadsActive,
  onToggleStats,
  statsVisible,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex h-7 shrink-0 items-center gap-3 border-t border-white/6 bg-black/25 px-3 text-[10.5px] text-ink-400',
        className,
      )}
    >
      <span className="flex items-center gap-1.5">
        <Cpu className="h-3 w-3 text-teal-400/80" />
        <span className="font-mono tracking-tight">mpv-core 0.39.0 · hwdec=auto-safe</span>
      </span>
      <span className="hidden items-center gap-1.5 lg:flex">
        <span className="h-1 w-1 rounded-full bg-ink-500" />
        <span className="font-mono tracking-tight">
          {item ? `${item.resolution} · ${item.quality} · 23.976 fps` : 'idle'}
        </span>
      </span>

      <span className="mx-auto hidden items-center gap-2 sm:flex">
        {autoNextEnabled ? (
          <Badge tone={autoNextSeconds ? 'accent' : 'teal'}>
            <Radio className="h-2.5 w-2.5" />
            {autoNextSeconds ? `auto-next in ${autoNextSeconds}s` : 'auto-next armed'}
          </Badge>
        ) : (
          <Badge tone="neutral">auto-next off</Badge>
        )}
        {downloadsActive > 0 && (
          <Badge tone="warn">
            {downloadsActive} download{downloadsActive > 1 ? 's' : ''} running
          </Badge>
        )}
      </span>

      <button
        type="button"
        onClick={onToggleStats}
        className={cn(
          'ml-auto inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors',
          statsVisible ? 'bg-white/10 text-ink-100' : 'hover:bg-white/6 hover:text-ink-200',
        )}
      >
        <Activity className="h-3 w-3" />
        stats
      </button>
      <span className="font-mono tracking-tight text-ink-500">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
