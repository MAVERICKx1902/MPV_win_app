import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Command,
  Download,
  Info,
  Keyboard,
  Loader2,
  Maximize2,
  Minimize2,
  Radio,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Badge, Segmented } from '../ui/Segmented';
import { IconButton, Tip } from '../ui/IconButton';
import { TrafficLights } from './TrafficLights';
import { SOURCE_LABEL } from '../../lib/mockData';
import { cn } from '../../lib/utils';
import type { MediaItem, RightPanelTab } from '../../types';

interface Props {
  item: MediaItem | undefined;
  resolvingUrl: string | null;
  downloadsActive: number;
  autoNextEnabled: boolean;
  cinema: boolean;
  statsVisible: boolean;
  rightTab: RightPanelTab;
  onClose: () => void;
  onMinimize: () => void;
  onZoom: () => void;
  onToggleAutoNext: (value: boolean) => void;
  onToggleStats: () => void;
  onToggleCinema: () => void;
  onOpenDownloads: () => void;
  onOpenPalette: () => void;
  onRightTab: (tab: RightPanelTab) => void;
  onResetQueue: () => void;
  onToast: (title: string, message?: string) => void;
}

const MENU_ITEMS = [
  { id: 'info', label: 'Media information', hint: 'I', icon: Info },
  { id: 'shortcuts', label: 'Keyboard shortcuts', hint: '?', icon: Keyboard },
  { id: 'stats', label: 'Playback statistics', hint: 'S', icon: BarChart3 },
  { id: 'reset', label: 'Rebuild queue', hint: '⇧R', icon: RotateCcw },
] as const;

export function TitleBar({
  item,
  resolvingUrl,
  downloadsActive,
  autoNextEnabled,
  cinema,
  statsVisible,
  rightTab,
  onClose,
  onMinimize,
  onZoom,
  onToggleAutoNext,
  onToggleStats,
  onToggleCinema,
  onOpenDownloads,
  onOpenPalette,
  onRightTab,
  onResetQueue,
  onToast,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const handleMenu = (id: (typeof MENU_ITEMS)[number]['id']) => {
    setMenuOpen(false);
    if (id === 'reset') {
      onResetQueue();
      onToast('Queue rebuilt', 'Three episodes of The Midnight Signal queued up.');
      return;
    }
    if (id === 'stats') {
      onToggleStats();
      return;
    }
    if (id === 'info') {
      onRightTab('info');
      return;
    }
    onToast('Keyboard shortcuts', 'Space play · ←/→ seek · ↑/↓ volume · N next · F cinema · D downloads');
  };

  return (
    <header className="drag-region relative z-30 flex h-12 shrink-0 items-center gap-3 border-b border-white/6 bg-black/20 px-3 sm:px-4">
      <TrafficLights onClose={onClose} onMinimize={onMinimize} onZoom={onZoom} zoomed={cinema} />

      <div className="mx-1 hidden h-5 w-px bg-white/8 sm:block" />

      <div className="no-drag flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-start">
        {resolvingUrl ? (
          <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-300" />
            <span className="truncate font-mono">resolving {resolvingUrl}…</span>
          </span>
        ) : (
          <>
            {item && (
              <Badge
                tone={item.kind === 'youtube' ? 'danger' : item.kind === 'live' ? 'teal' : 'accent'}
                className="hidden sm:inline-flex"
              >
                {SOURCE_LABEL[item.kind]}
              </Badge>
            )}
            <h1 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink-100">
              {item?.title ?? 'MPV Studio'}
            </h1>
            {item && (
              <span className="hidden truncate text-[12px] text-ink-400 xl:inline">
                — {item.subtitle}
              </span>
            )}
          </>
        )}
      </div>

      <div className="no-drag flex items-center gap-1.5">
        <Tip label="Command palette (⌘K)">
          <IconButton
            size="sm"
            variant="glass"
            icon={<Command className="h-3.5 w-3.5" />}
            onClick={onOpenPalette}
            aria-label="Open command palette"
          />
        </Tip>

        <Tip label="Auto-Next (Y)">
          <IconButton
            size="sm"
            variant="glass"
            active={autoNextEnabled}
            onClick={() => onToggleAutoNext(!autoNextEnabled)}
            icon={<Radio className="h-3.5 w-3.5" />}
            aria-label="Toggle auto-next"
          />
        </Tip>

        <Tip label="Downloader (D)">
          <IconButton
            size="sm"
            variant="glass"
            onClick={onOpenDownloads}
            aria-label="Open downloader"
            className="relative"
            icon={<Download className="h-3.5 w-3.5" />}
          >
            {downloadsActive > 0 && (
              <>
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-teal-400 px-1 text-[9px] font-bold text-ink-950">
                  {downloadsActive}
                </span>
                <span className="absolute inset-0 rounded-xl ring-1 ring-teal-400/40" />
              </>
            )}
          </IconButton>
        </Tip>

        <Tip label={cinema ? 'Exit cinema (F)' : 'Cinema mode (F)'}>
          <IconButton
            size="sm"
            variant="glass"
            active={cinema}
            onClick={onToggleCinema}
            aria-label="Toggle cinema mode"
            icon={cinema ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            className="hidden sm:inline-flex"
          />
        </Tip>

        <div className="relative" ref={menuRef}>
          <IconButton
            size="sm"
            variant="glass"
            active={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="More"
            icon={<ChevronDown className="h-3.5 w-3.5" />}
          />
          {menuOpen && (
            <div className="animate-rise absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/92 p-1.5 shadow-panel backdrop-blur-2xl">
              <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
                <Sparkles className="h-3 w-3" /> workspace
              </div>
              {MENU_ITEMS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleMenu(entry.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-[12.5px] text-ink-100 transition-colors hover:bg-white/8',
                    entry.id === 'stats' && statsVisible && 'bg-white/8',
                  )}
                >
                  <entry.icon className="h-3.5 w-3.5 text-ink-300" />
                  <span className="flex-1">{entry.label}</span>
                  <span className="font-mono text-[10px] text-ink-500">{entry.hint}</span>
                </button>
              ))}
              <div className="my-1 h-px bg-white/8" />
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[11px] text-ink-400">Inspector tab</span>
                <Segmented
                  size="sm"
                  value={rightTab}
                  onChange={(value) => onRightTab(value)}
                  options={[
                    { value: 'queue', label: 'Queue' },
                    { value: 'downloads', label: 'DLs' },
                    { value: 'info', label: 'Info' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** Floating macOS-style notification banners. */
export function ToastStack({
  toasts,
  onDismiss,
  className,
}: {
  toasts: { id: string; tone: 'info' | 'success' | 'warn' | 'danger'; title: string; message?: string }[];
  onDismiss: (id: string) => void;
  className?: string;
}) {
  const tones = {
    info: 'border-accent-400/30 text-accent-300',
    success: 'border-teal-400/30 text-teal-300',
    warn: 'border-warn-400/30 text-warn-400',
    danger: 'border-danger-400/30 text-danger-400',
  };
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-50 flex w-[min(320px,calc(100%-2rem))] flex-col gap-2',
        className,
      )}
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={cn(
            'animate-slide-in pointer-events-auto rounded-2xl border bg-ink-900/88 px-3.5 py-3 text-left shadow-panel backdrop-blur-2xl',
            'transition-transform hover:scale-[1.01]',
            tones[toast.tone],
          )}
        >
          <span className="block text-[12.5px] font-semibold text-ink-100">{toast.title}</span>
          {toast.message && (
            <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-300">{toast.message}</span>
          )}
        </button>
      ))}
    </div>
  );
}
