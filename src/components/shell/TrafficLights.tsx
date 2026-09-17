import { cn } from '../../lib/utils';

interface Props {
  onClose: () => void;
  onMinimize: () => void;
  onZoom: () => void;
  zoomed: boolean;
  className?: string;
}

/**
 * macOS window controls. The glyphs only appear on hover, exactly like the
 * real thing. In the Tauri 2.0 build these map onto
 * `getCurrentWindow().close() / .minimize() / .toggleMaximize()`.
 */
export function TrafficLights({ onClose, onMinimize, onZoom, zoomed, className }: Props) {
  const dots = [
    {
      id: 'close',
      className: 'bg-[#ff5f57] hover:bg-[#ff6b62] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.22)]',
      onClick: onClose,
      label: 'Close (⌘W)',
      glyph: (
        <svg viewBox="0 0 10 10" className="h-[6px] w-[6px] opacity-0 group-hover/lights:opacity-70">
          <path d="M1.6 1.6 L8.4 8.4 M8.4 1.6 L1.6 8.4" stroke="#5c0d09" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'minimize',
      className: 'bg-[#febc2e] hover:bg-[#ffc746] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)]',
      onClick: onMinimize,
      label: 'Minimise',
      glyph: (
        <svg viewBox="0 0 10 10" className="h-[6px] w-[6px] opacity-0 group-hover/lights:opacity-70">
          <path d="M1.7 5 L8.3 5" stroke="#5a3c04" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'zoom',
      className: 'bg-[#28c840] hover:bg-[#39d951] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)]',
      onClick: onZoom,
      label: zoomed ? 'Exit cinema (F)' : 'Cinema mode (F)',
      glyph: (
        <svg viewBox="0 0 10 10" className="h-[6px] w-[6px] opacity-0 group-hover/lights:opacity-70">
          {zoomed ? (
            <path d="M2 6.6 L6.4 2.2 M3.4 2.2 L6.4 2.2 L6.4 5.2 M7.6 3.4 L3.2 7.8" stroke="#0a3b12" strokeWidth="1.2" strokeLinecap="round" />
          ) : (
            <path d="M2 6.6 L3.6 8.2 M3.4 2.2 L6.4 2.2 L6.4 5.2" stroke="#0a3b12" strokeWidth="1.3" strokeLinecap="round" />
          )}
        </svg>
      ),
    },
  ];

  return (
    <div className={cn('group/lights flex items-center gap-2', className)}>
      {dots.map((dot) => (
        <button
          key={dot.id}
          type="button"
          aria-label={dot.label}
          title={dot.label}
          onClick={dot.onClick}
          className={cn(
            'grid h-3 w-3 place-items-center rounded-full transition-transform duration-150 active:scale-90',
            dot.className,
          )}
        >
          {dot.glyph}
        </button>
      ))}
    </div>
  );
}
