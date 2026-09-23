'use client';
import type { InputHTMLAttributes, ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-panel ${className}`}>{children}</div>;
}

export function Field({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-mist">{label}</span>
      <input
        {...rest}
        className="h-12 w-full rounded-xl border border-line bg-night px-4 text-paper outline-none placeholder:text-rain/60 focus:border-moss"
      />
      {hint && <span className="mt-1 block text-xs text-rain">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-4 py-1 text-left disabled:opacity-50"
    >
      <span className="text-sm text-paper">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${checked ? 'border-moss-deep bg-moss' : 'border-line bg-night'}`}>
        <span className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-paper transition-all ${checked ? 'left-6' : 'left-0.5'}`} />
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
  const btn = 'h-9 w-9 rounded-lg border border-line bg-night text-lg leading-none text-paper disabled:opacity-40';
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-1">
      <div>
        <div className="text-sm text-paper">{label}</div>
        {hint && <div className="text-xs text-rain">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - step))} aria-label={`${label} −`}>
          −
        </button>
        <span className="min-w-12 text-center font-semibold tabular-nums">
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
    <div className="inline-flex rounded-xl border border-line bg-night p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`h-9 rounded-lg px-3 text-sm transition-colors ${o.value === value ? 'bg-panel-2 text-paper' : 'text-rain hover:text-paper'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-transparent ${className}`} />;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose?: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3" onClick={onClose}>
      <div
        className={`animate-rise max-h-[92dvh] w-full overflow-y-auto rounded-2xl border border-line bg-panel p-5 scrollbar-thin ${wide ? 'max-w-3xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="mb-4 flex items-center justify-between gap-3">
            {title && <h2 className="font-display text-xl">{title}</h2>}
            {onClose && (
              <button onClick={onClose} className="h-9 w-9 rounded-lg text-xl text-rain hover:bg-panel-2 hover:text-paper" aria-label="close">
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
