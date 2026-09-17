import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

/** macOS style switch (blue pill, white knob). */
export function Toggle({ checked, onChange, label, hint, disabled, className }: ToggleProps) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-center justify-between gap-3',
        disabled && 'pointer-events-none opacity-45',
        className,
      )}
    >
      {(label || hint) && (
        <span className="min-w-0">
          {label && <span className="block text-[12.5px] font-medium text-ink-100">{label}</span>}
          {hint && <span className="mt-0.5 block text-[11px] text-ink-400">{hint}</span>}
        </span>
      )}
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          className={cn(
            'h-[22px] w-[38px] rounded-full border transition-all duration-300 ease-out',
            checked
              ? 'border-accent-300/40 bg-linear-to-b from-accent-400 to-accent-600 shadow-[0_2px_10px_-2px_rgba(109,121,245,0.9)]'
              : 'border-white/10 bg-white/10',
          )}
        />
        <span
          className={cn(
            'absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.55)]',
            'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            checked ? 'translate-x-[16px]' : 'translate-x-0',
          )}
        />
      </span>
    </label>
  );
}
