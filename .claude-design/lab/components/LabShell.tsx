import type { ReactNode } from 'react';

type LabShellProps = {
  label: string;
  title: string;
  rationale: string;
  notes: string;
  children: ReactNode;
};

export function LabShell({ label, title, rationale, notes, children }: LabShellProps) {
  return (
    <article className="flex flex-col gap-4">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-coral">Variant {label}</p>
        <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
        <p className="text-[13px] leading-relaxed text-ink-60">{rationale}</p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-card-sm">{children}</div>
      <p className="text-[12px] font-medium text-ink-40">{notes}</p>
    </article>
  );
}
