import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Command,
  Download,
  Info,
  Keyboard,
  ListVideo,
  Maximize2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  SkipForward,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { LIBRARY, SOURCE_LABEL, artworkBackground } from '../../lib/mockData';
import type { MediaItem } from '../../types';

interface Props {
  onClose: () => void;
  onPlay: (item: MediaItem) => void;
  onAction: (id: string) => void;
}

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: 'playback' | 'library' | 'workspace';
  icon: typeof Play;
  accent?: string;
}

const COMMANDS: PaletteItem[] = [
  { id: 'toggle', label: 'Play / pause', hint: 'Space', group: 'playback', icon: Play },
  { id: 'next', label: 'Play next item', hint: 'N', group: 'playback', icon: SkipForward },
  { id: 'cinema', label: 'Toggle cinema mode', hint: 'F', group: 'playback', icon: Maximize2 },
  { id: 'stats', label: 'Toggle playback statistics', hint: 'S', group: 'playback', icon: Info },
  { id: 'autonext', label: 'Toggle Auto-Next engine', hint: 'Y', group: 'playback', icon: Radio },
  { id: 'downloads', label: 'Open downloader', hint: 'D', group: 'workspace', icon: Download },
  { id: 'queue', label: 'Show queue inspector', hint: 'Q', group: 'workspace', icon: ListVideo },
  { id: 'reset', label: 'Rebuild the queue', hint: '⇧R', group: 'workspace', icon: RotateCcw },
  { id: 'shortcuts', label: 'Keyboard shortcuts', hint: '?', group: 'workspace', icon: Keyboard },
];

/**
 * ⌘K palette: fuzzy filter over commands + library items.
 * Mounted only while open, so `query`/`cursor` start fresh every time.
 */
export function CommandPalette({ onClose, onPlay, onAction }: Props) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus is a DOM side effect — safe to run from an effect.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const libraryItems: PaletteItem[] = LIBRARY.map((item) => ({
      id: `play:${item.id}`,
      label: item.title,
      hint: `${SOURCE_LABEL[item.kind]} · ${item.quality}`,
      group: 'library',
      icon: Play,
      accent: item.accent,
    }));
    const all = [...COMMANDS, ...libraryItems];
    if (!q) return all.slice(0, 9);
    return all
      .filter((item) => `${item.label} ${item.hint ?? ''}`.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query]);

  // Derived: never let the cursor point past the filtered list.
  const activeCursor = cursor < results.length ? cursor : 0;

  const run = (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.id.startsWith('play:')) {
      const target = LIBRARY.find((entry) => entry.id === item.id.slice(5));
      if (target) onPlay(target);
    } else {
      onAction(item.id);
    }
    onClose();
  };

  const grouped = results.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <button
        type="button"
        aria-label="Close palette"
        onClick={onClose}
        className="animate-fade absolute inset-0 cursor-default bg-black/55 backdrop-blur-[3px]"
      />
      <div className="animate-rise relative w-[min(560px,92%)] overflow-hidden rounded-3xl border border-white/12 bg-ink-900/90 shadow-panel backdrop-blur-2xl">
        <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setCursor((value) => (value + 1) % Math.max(results.length, 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setCursor((value) => (value - 1 + results.length) % Math.max(results.length, 1));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                run(results[activeCursor]);
              } else if (event.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Search commands, episodes, links…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink-100 outline-none placeholder:text-ink-500"
          />
          <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </div>

        <div className="scroll-slim max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="py-8 text-center text-[12px] text-ink-500">No matches for “{query}”</p>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-1">
              <p className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-ink-500 uppercase">
                {group}
              </p>
              {items.map((item) => {
                const index = results.indexOf(item);
                const active = index === activeCursor;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => run(item)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                      active ? 'bg-white/10' : 'hover:bg-white/6',
                    )}
                  >
                    {item.accent ? (
                      <span
                        className="grid h-6 w-9 shrink-0 place-items-center rounded-md ring-1 ring-white/10"
                        style={{ background: artworkBackground(item.accent) }}
                      >
                        <Play className="h-2.5 w-2.5 text-white/85" />
                      </span>
                    ) : (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-300">
                        <item.icon className="h-3 w-3" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-100">{item.label}</span>
                    {item.hint && (
                      <span className="shrink-0 font-mono text-[10px] text-ink-500">{item.hint}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-white/8 bg-black/25 px-4 py-2 text-[10px] text-ink-500">
          <span className="flex items-center gap-1">
            <Pause className="h-2.5 w-2.5" /> ↑↓ navigate
          </span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
