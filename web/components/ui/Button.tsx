'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { audio } from '@/services/audio';

/**
 * The game's one button. Chunky, tactile (a darker lip that compresses on press),
 * Baloo display type. Pick the variant by importance:
 *   gold      — the single most important action on a screen (Start match, Play)
 *   primary   — normal positive actions (Join, Save, Create)
 *   secondary — everything else
 *   danger    — leave / destructive
 *   ghost     — low-emphasis text actions
 */
type Variant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger' | 'teal' | 'lamp';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'tactile bg-moss text-paper border-2 border-moss-deep',
  gold: 'tactile bg-lamp text-ink border-2 border-gold-deep',
  lamp: 'tactile bg-lamp text-ink border-2 border-gold-deep',
  teal: 'tactile bg-canal text-paper border-2 border-canal-deep',
  secondary: 'tactile bg-panel-2 text-paper border-2 border-line border-b-ink',
  danger: 'tactile bg-laterite text-paper border-2 border-laterite-deep',
  ghost: 'bg-transparent text-mist hover:text-paper hover:bg-panel-2/70 border-2 border-transparent transition-colors disabled:opacity-45',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'min-h-12 px-4 text-base rounded-2xl gap-2',
  lg: 'min-h-14 px-6 text-lg rounded-2xl gap-2.5 uppercase tracking-wide',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, full, className = '', children, disabled, onClick, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        audio.play('click');
        onClick?.(e);
      }}
      className={`inline-flex select-none items-center justify-center py-1.5 font-display font-bold leading-tight ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
}

/** Round icon-only button (back, close, settings…). Always has an accessible label. */
export function IconButton({
  label,
  onClick,
  children,
  size = 'md',
  tone = 'secondary',
  className = '',
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'secondary' | 'gold' | 'danger';
  className?: string;
  disabled?: boolean;
}) {
  const sizes = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-14 w-14' }[size];
  const tones = {
    secondary: 'bg-panel-2 text-paper border-line border-b-ink hover:text-lamp',
    gold: 'bg-lamp text-ink border-gold-deep',
    danger: 'bg-laterite text-paper border-laterite-deep',
  }[tone];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => {
        audio.play('click');
        onClick();
      }}
      className={`tactile inline-flex shrink-0 items-center justify-center rounded-full border-2 ${sizes} ${tones} ${className}`}
    >
      {children}
    </button>
  );
}
