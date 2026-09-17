import { Clock3, Play, Plus } from 'lucide-react';
import { Badge } from '../ui/Segmented';
import { cn, formatTime } from '../../lib/utils';
import { SOURCE_LABEL, artworkBackground } from '../../lib/mockData';
import type { MediaItem } from '../../types';

interface Props {
  items: MediaItem[];
  currentId?: string;
  onPlay: (item: MediaItem) => void;
  onOpenUrl: () => void;
  className?: string;
}

/** Horizontally scrolling "up next from your library" shelf. */
export function LibraryRail({ items, currentId, onPlay, onOpenUrl, className }: Props) {
  return (
    <div className={cn('shrink-0', className)}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <h3 className="text-[10.5px] font-semibold tracking-[0.16em] text-ink-400 uppercase">library</h3>
        <span className="font-mono text-[10px] text-ink-600">{items.length} items</span>
        <button
          type="button"
          onClick={onOpenUrl}
          className="ml-auto flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10.5px] text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
        >
          <Plus className="h-3 w-3" /> add url
        </button>
      </div>

      <div className="scroll-slim flex gap-2.5 overflow-x-auto pb-1.5">
        {items.map((item) => {
          const active = item.id === currentId;
          return (
            <button
              key={`${item.id}-rail`}
              type="button"
              onClick={() => onPlay(item)}
              className={cn(
                'group w-[178px] shrink-0 overflow-hidden rounded-2xl border p-0 text-left transition-all duration-200',
                active
                  ? 'border-accent-400/40 bg-accent-500/10'
                  : 'border-white/8 bg-white/3 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/6',
              )}
            >
              <span
                className="relative grid h-[92px] w-full place-items-center"
                style={{ background: artworkBackground(item.accent) }}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/40 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
                  <Play className="ml-[1px] h-3.5 w-3.5 text-white" />
                </span>
                <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-[1px] font-mono text-[9.5px] text-white/80 backdrop-blur-sm">
                  {formatTime(item.duration)}
                </span>
                <span className="absolute top-1.5 left-1.5">
                  <Badge tone={item.kind === 'youtube' ? 'danger' : item.kind === 'live' ? 'teal' : 'accent'}>
                    {SOURCE_LABEL[item.kind]}
                  </Badge>
                </span>
              </span>
              <span className="block px-2.5 py-2">
                <span className="line-clamp-2 block text-[11.5px] leading-snug font-medium text-ink-100">
                  {item.title}
                </span>
                <span className="mt-1 flex items-center gap-1 font-mono text-[9.5px] text-ink-500">
                  <Clock3 className="h-2.5 w-2.5" />
                  {item.quality} · {item.resolution}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Grid variant used by the mobile "Library" tab. */
export function LibraryGrid({ items, currentId, onPlay, className }: Omit<Props, 'onOpenUrl'> & { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {items.map((item) => {
        const active = item.id === currentId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPlay(item)}
            className={cn(
              'overflow-hidden rounded-2xl border text-left transition-all duration-200',
              active ? 'border-accent-400/40 bg-accent-500/10' : 'border-white/8 bg-white/3 active:scale-[0.98]',
            )}
          >
            <span
              className="grid h-24 w-full place-items-center"
              style={{ background: artworkBackground(item.accent) }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/40">
                <Play className="ml-[1px] h-4 w-4 text-white" />
              </span>
            </span>
            <span className="block px-3 py-2.5">
              <span className="line-clamp-2 block text-[12px] leading-snug font-medium text-ink-100">
                {item.title}
              </span>
              <span className="mt-1 block truncate font-mono text-[10px] text-ink-500">
                {SOURCE_LABEL[item.kind]} · {formatTime(item.duration)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
