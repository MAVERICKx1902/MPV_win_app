import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'ghost' | 'glass' | 'solid' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  ghost:
    'text-ink-200 hover:text-white hover:bg-white/10 active:bg-white/15 border border-transparent',
  glass:
    'text-ink-100 bg-white/6 hover:bg-white/12 border border-white/10 hover:border-white/20 backdrop-blur-xl',
  solid:
    'text-white bg-linear-to-b from-accent-400 to-accent-600 border border-white/15 shadow-[0_10px_30px_-12px_rgba(109,121,245,0.9)] hover:from-accent-300 hover:to-accent-500',
  danger: 'text-white bg-danger-500/80 hover:bg-danger-500 border border-white/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-[11px] rounded-lg',
  md: 'h-9 gap-2 px-3 text-[12.5px] rounded-xl',
  lg: 'h-11 gap-2.5 px-5 text-sm rounded-2xl',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  active?: boolean;
  round?: boolean;
}

/** The one button used everywhere — keeps radii, heights and focus rings honest. */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  icon,
  active = false,
  round = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium tracking-[-0.01em]',
        'transition-[background-color,border-color,color,transform,opacity] duration-200 ease-out',
        'active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        round && 'aspect-square px-0',
        active && 'border-white/25 bg-white/16 text-white',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** Tooltip wrapper — CSS only, no library. */
export function Tip({
  label,
  children,
  side = 'bottom',
}: {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1',
          'border border-white/10 bg-ink-900/95 text-[11px] font-medium text-ink-100 shadow-panel backdrop-blur-xl',
          'opacity-0 transition-all duration-150 group-hover/tip:opacity-100',
          side === 'bottom' ? 'top-[calc(100%+7px)]' : 'bottom-[calc(100%+7px)]',
        )}
      >
        {label}
      </span>
    </span>
  );
}
