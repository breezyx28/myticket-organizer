import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

export function PasswordInput({
  className,
  hasError,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(
          'w-full pr-11',
          hasError ? 'border-coral focus:border-coral focus:ring-coral/15' : '',
          className
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-40 transition hover:bg-ink-5 hover:text-ink"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={18} strokeWidth={2} aria-hidden /> : <Eye size={18} strokeWidth={2} aria-hidden />}
      </button>
    </div>
  );
}
