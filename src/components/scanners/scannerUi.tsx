import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Shared layout tokens for scanner route — style only. */
export const scannerInputClass =
  'mt-1.5 h-10 w-full rounded-xl border border-ink-10 bg-white px-3 text-[14px] text-ink outline-none transition focus:border-ink-30 focus:ring-2 focus:ring-ink/10';

export function scannerInputErrorClass(hasError: boolean) {
  return cn(scannerInputClass, hasError && 'border-coral focus:border-coral focus:ring-coral/15');
}

export function ScannerPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-60">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ScannerMetricStrip({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function ScannerMetricCard({
  label,
  value,
  accent = 'bg-ink-5/50',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-ink-10 px-4 py-3.5', accent)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">{label}</p>
      <p className="mt-1 font-mono text-[22px] font-bold leading-none tracking-tight text-ink">{value}</p>
    </div>
  );
}

export function ScannerFocusBanner({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo/25 bg-indigo/8 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[14px] leading-snug text-ink">{children}</p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ScannerMainPanel({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-10 bg-white shadow-card-sm">{children}</div>
  );
}

export function ScannerTabNav<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-ink-10 px-4 sm:px-6"
      role="tablist"
      aria-label="Scanner sections"
    >
      {tabs.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(
              'relative shrink-0 px-4 py-3.5 text-[13px] font-bold transition',
              isActive ? 'text-ink' : 'text-ink-50 hover:text-ink-70'
            )}
          >
            {label}
            {isActive ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-ink" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ScannerPanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5 sm:p-6 lg:p-8', className)}>{children}</div>;
}

export function ScannerPanelToolbar({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-ink-10 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-60">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ScannerEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-20 bg-ink-5/25 px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-50">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ScannerDialogOverlay({ children, onBackdropClick }: { children: ReactNode; onBackdropClick?: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onBackdropClick}
      />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-ink-10 bg-white p-6 shadow-card-xl sm:p-8">
        {children}
      </div>
    </div>
  );
}

export function ScannerFormLabel({ children, error }: { children: ReactNode; error?: string }) {
  return (
    <label className="block text-[12px] font-semibold text-ink-60">
      {children}
      {error ? <p className="mt-1 text-[12px] font-medium text-coral">{error}</p> : null}
    </label>
  );
}

export function ScannerStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        active ? 'bg-mint/25 text-ink' : 'bg-ink-10 text-ink-50'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function ScannerAvatar({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-[14px] font-extrabold text-white"
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function ScannerChipList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {items.map((label, i) => (
        <li
          key={`${label}-${i}`}
          className="max-w-full truncate rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-ink ring-1 ring-ink-10"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

export function ScannerSubsectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-50">{children}</h3>
      {count != null ? (
        <span className="rounded-full bg-ink-5 px-2 py-0.5 font-mono text-[11px] font-bold text-ink-60">{count}</span>
      ) : null}
    </div>
  );
}
