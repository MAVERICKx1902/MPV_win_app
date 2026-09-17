import { Download, ListVideo, PlayCircle, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MobileTab } from '../../types';

interface Props {
  tab: MobileTab;
  onTab: (tab: MobileTab) => void;
  downloadCount: number;
  queueCount: number;
  className?: string;
}

const TABS: { id: MobileTab; label: string; icon: typeof PlayCircle }[] = [
  { id: 'player', label: 'Player', icon: PlayCircle },
  { id: 'library', label: 'Library', icon: LayoutGrid },
  { id: 'queue', label: 'Queue', icon: ListVideo },
  { id: 'downloads', label: 'Grab', icon: Download },
];

/**
 * Bottom tab bar. Only exists below `lg` — this is the same component tree the
 * Android build will use, kept thumb-reachable and safe-area aware.
 */
export function MobileNav({ tab, onTab, downloadCount, queueCount, className }: Props) {
  return (
    <nav
      className={cn(
        'flex shrink-0 items-stretch gap-1 border-t border-white/8 bg-black/40 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden',
        className,
      )}
    >
      {TABS.map((entry) => {
        const active = entry.id === tab;
        const badge = entry.id === 'downloads' ? downloadCount : entry.id === 'queue' ? queueCount : 0;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onTab(entry.id)}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors',
              active ? 'text-accent-300' : 'text-ink-400 active:text-ink-200',
            )}
          >
            <span className="relative">
              <entry.icon className="h-[18px] w-[18px]" />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-teal-400 px-1 text-[9px] font-bold text-ink-950">
                  {badge}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium tracking-tight">{entry.label}</span>
            {active && <span className="absolute -top-1.5 h-[3px] w-8 rounded-full bg-accent-400" />}
          </button>
        );
      })}
    </nav>
  );
}
