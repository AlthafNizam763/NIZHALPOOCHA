'use client';
import { useEffect, type InputHTMLAttributes, type ReactNode } from 'react';

/** Raised surface. `kasavu` adds the gold saree-border edge used on key panels. */
export function Panel({ children, className = '', kasavu }: { children: ReactNode; className?: string; kasavu?: boolean }) {
  return <div className={`surface rounded-[var(--radius-card)] ${kasavu ? 'kasavu pt-1' : ''} ${className}`}>{children}</div>;
}

/** Section heading inside panels and screens. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="font-display text-lg font-bold leading-tight text-paper">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-mist short:mb-1 short:text-xs">{label}</span>
      <input
        {...rest}
        className="h-12 w-full rounded-2xl border-2 border-line bg-night px-4 short:h-10 short:rounded-xl text-paper outline-none transition-colors placeholder:text-rain/60 focus:border-lamp focus:bg-[#10201a]"
      />
      {hint && <span className="mt-1 block text-xs text-rain">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-4 py-1 text-left disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-semibold text-paper">{label}</span>
        {hint && <span className="block text-xs text-rain">{hint}</span>}
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors ${checked ? 'border-moss-deep bg-moss' : 'border-line bg-night'}`}>
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full shadow-[0_2px_0_rgba(0,0,0,.35)] transition-all ${checked ? 'left-[26px] bg-paper' : 'left-0.5 bg-rain'}`}
        />
      </span>
    </button>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const btn =
    'tactile h-9 w-9 rounded-full border-2 border-line border-b-ink bg-panel-2 text-lg font-bold leading-none text-paper hover:text-lamp';
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 py-1">
      <div>
        <div className="text-sm font-semibold text-paper">{label}</div>
        {hint && <div className="text-xs text-rain">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - step))} aria-label={`${label} −`}>
          −
        </button>
        <span className="min-w-12 text-center font-display text-lg font-bold tabular-nums text-lamp">
          {value}
          {unit}
        </span>
        <button type="button" className={btn} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + step))} aria-label={`${label} +`}>
          +
        </button>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border-2 border-line bg-night p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-xl px-3.5 font-display text-sm font-bold transition-colors ${
            o.value === value ? 'bg-lamp text-ink shadow-[0_2px_0_var(--color-gold-deep)]' : 'text-rain hover:bg-panel-2 hover:text-paper'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Selectable card for single-choice pickers (visibility, map, mode, role…).
 * Selected = gold edge + check. Works as a radio.
 */
export function ChoiceCard({
  selected,
  onClick,
  title,
  description,
  icon,
  disabled,
  className = '',
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition-colors disabled:opacity-50 ${
        selected ? 'border-lamp bg-lamp/10' : 'border-line bg-night/70 hover:border-line-strong hover:bg-panel-2/60'
      } ${className}`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold leading-tight text-paper">{title}</span>
        {description && <span className="mt-0.5 block text-xs leading-snug text-rain">{description}</span>}
      </span>
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-black ${
          selected ? 'border-lamp bg-lamp text-ink' : 'border-line'
        }`}
      >
        {selected ? '✓' : ''}
      </span>
    </button>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'good' | 'danger' | 'info' }) {
  const tones = {
    neutral: 'bg-panel-2 text-mist border-line',
    gold: 'bg-lamp/15 text-lamp border-lamp/40',
    good: 'bg-moss/20 text-leaf border-moss/50',
    danger: 'bg-laterite/15 text-[#f08a6e] border-laterite/50',
    info: 'bg-canal/15 text-[#7fcfd6] border-canal/50',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${tones}`}>{children}</span>;
}

/**
 * Loader: a pair of lamp-lit cat eyes blinking in the dark — the game's
 * signature "waiting" mark. `Spinner` keeps the old name for existing callers.
 */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span role="presentation" className={`inline-flex h-6 w-6 items-center justify-center ${className}`}>
      <svg viewBox="0 0 24 12" className="h-[60%] w-full" aria-hidden>
        <ellipse cx="6" cy="6" rx="4.2" ry="3" fill="var(--color-lamp)" className="loader-eye" style={{ transformBox: 'fill-box' }} />
        <ellipse cx="18" cy="6" rx="4.2" ry="3" fill="var(--color-lamp)" className="loader-eye" style={{ transformBox: 'fill-box' }} />
        <ellipse cx="6" cy="6" rx="0.9" ry="2.4" fill="#09130f" />
        <ellipse cx="18" cy="6" rx="0.9" ry="2.4" fill="#09130f" />
      </svg>
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose?: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030806]/75 p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`surface kasavu animate-screen-in max-h-[92dvh] w-full overflow-y-auto rounded-[var(--radius-card)] p-5 pt-6 scrollbar-thin ${wide ? 'max-w-3xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="mb-4 flex items-center justify-between gap-3">
            {title && <h2 className="headline text-2xl text-paper">{title}</h2>}
            {onClose && (
              <button
                onClick={onClose}
                className="tactile ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-line border-b-ink bg-panel-2 text-xl text-mist hover:text-paper"
                aria-label="close"
              >
                ×
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
