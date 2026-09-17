import { cn } from '../../lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/** macOS segmented control. */
export function Segmented<T extends string>({ value, options, onChange, size = 'md', className }: Props<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-white/8 bg-black/30 p-0.5 backdrop-blur-xl',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[9px] font-medium transition-all duration-200',
              size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7.5 px-3 text-[12px]',
              active
                ? 'bg-white/14 text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_4px_14px_-8px_rgba(0,0,0,0.9)]'
                : 'text-ink-300 hover:text-ink-100',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small status pill. */
export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'neutral' | 'accent' | 'teal' | 'warn' | 'danger';
}) {
  const tones = {
    neutral: 'border-white/10 bg-white/6 text-ink-200',
    accent: 'border-accent-400/30 bg-accent-500/15 text-accent-300',
    teal: 'border-teal-400/30 bg-teal-400/12 text-teal-300',
    warn: 'border-warn-400/30 bg-warn-400/12 text-warn-400',
    danger: 'border-danger-400/30 bg-danger-500/15 text-danger-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-[2px] text-[10px] font-semibold tracking-[0.06em] uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
