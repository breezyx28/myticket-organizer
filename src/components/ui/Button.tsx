import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary: 'bg-lemon text-ink hover:bg-lemon-dark active:scale-[0.97]',
  secondary: 'bg-coral text-white hover:bg-coral-dark active:scale-[0.97]',
  outline: 'border-2 border-ink bg-white text-ink hover:bg-ink-5 active:scale-[0.97]',
  ghost: 'text-ink hover:bg-ink-5',
  dark: 'bg-ink text-white hover:bg-ink-80 active:scale-[0.97]',
  danger: 'bg-coral text-white hover:bg-coral-dark active:scale-[0.97]',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 text-[12px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px]',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  loading,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all outline-none',
        'focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? '…' : children}
    </button>
  );
}
