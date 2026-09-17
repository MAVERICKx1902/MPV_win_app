import { ChevronDown, ChevronUp, GripVertical, Play, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Segmented';
import { IconButton, Tip } from '../ui/IconButton';
import { cn, formatTime } from '../../lib/utils';
import { SOURCE_LABEL, artworkBackground } from '../../lib/mockData';
import type { MediaItem } from '../../types';

interface Props {
  items: MediaItem[];
  currentId: string | undefined;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  className?: string;
  dense?: boolean;
}

/** The play queue: current item highlighted, inline reorder + remove. */
export function QueueList({ items, currentId, onSelect, onRemove, onMove, className, dense }: Props) {
  if (items.length === 0) {
    return (
      <p className={cn('rounded-2xl border border-dashed border-white/10 py-8 text-center text-[11.5px] text-ink-500', className)}>
        Queue is empty — resolve a URL to add something.
      </p>
    );
  }

  return (
    <ul className={cn('space-y-1.5', className)}>
      {items.map((item, index) => {
        const active = item.id === currentId;
        return (
          <li key={item.id}>
            <div
              className={cn(
                'group flex items-center gap-2.5 rounded-2xl border p-2 transition-all duration-200',
                active
                  ? 'border-accent-400/35 bg-accent-500/10'
                  : 'border-white/6 bg-white/3 hover:border-white/14 hover:bg-white/6',
              )}
            >
              <span className="hidden shrink-0 cursor-grab text-ink-600 group-hover:text-ink-400 sm:block">
                <GripVertical className="h-3.5 w-3.5" />
              </span>

              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="relative grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-xl ring-1 ring-white/10"
                style={{ background: artworkBackground(item.accent) }}
                aria-label={`Play ${item.title}`}
              >
                {active ? (
                  <span className="flex items-end gap-[2px]">
                    {[0, 1, 2].map((bar) => (
                      <span
                        key={bar}
                        className="w-[3px] origin-bottom rounded-full bg-white/90 animate-equalize"
                        style={{ height: 12, animationDelay: `${bar * 0.16}s` }}
                      />
                    ))}
                  </span>
                ) : (
                  <Play className="h-3.5 w-3.5 text-white/85 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>

              <button type="button" onClick={() => onSelect(item.id)} className="min-w-0 flex-1 text-left">
                <p className={cn('truncate text-[12.5px] font-medium', active ? 'text-white' : 'text-ink-100')}>
                  {item.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[10px] text-ink-500">
                  {item.kind === 'series' && item.episodeNumber > 0 && (
                    <span className="text-ink-400">E{String(item.episodeNumber).padStart(2, '0')}</span>
                  )}
                  <span className="truncate">{item.subtitle}</span>
                </p>
              </button>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {!dense && (
                  <Badge tone={item.kind === 'youtube' ? 'danger' : item.kind === 'live' ? 'teal' : 'accent'}>
                    {SOURCE_LABEL[item.kind]}
                  </Badge>
                )}
                <span className="font-mono text-[10px] text-ink-500">{formatTime(item.duration)}</span>
              </div>

              <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Tip label="Move up">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    round
                    disabled={index === 0}
                    onClick={() => onMove(item.id, -1)}
                    aria-label="Move up"
                    icon={<ChevronUp className="h-3 w-3" />}
                  />
                </Tip>
                <Tip label="Move down">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    round
                    disabled={index === items.length - 1}
                    onClick={() => onMove(item.id, 1)}
                    aria-label="Move down"
                    icon={<ChevronDown className="h-3 w-3" />}
                  />
                </Tip>
                <Tip label="Remove">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    round
                    className="hover:text-danger-400"
                    onClick={() => onRemove(item.id)}
                    aria-label="Remove from queue"
                    icon={<Trash2 className="h-3 w-3" />}
                  />
                </Tip>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
