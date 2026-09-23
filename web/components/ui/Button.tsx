'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { audio } from '@/services/audio';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'lamp';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-moss text-paper hover:bg-moss-deep border border-moss-deep',
  secondary: 'bg-panel-2 text-paper hover:bg-line border border-line',
  ghost: 'bg-transparent text-mist hover:text-paper hover:bg-panel-2 border border-transparent',
  danger: 'bg-laterite text-paper hover:brightness-110 border border-laterite',
  lamp: 'bg-lamp text-ink hover:brightness-105 border border-lamp font-semibold',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-base rounded-xl',
  lg: 'h-14 px-6 text-lg rounded-xl',
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
      onClick={(e) => {
        audio.play('click');
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed select-none ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
}
