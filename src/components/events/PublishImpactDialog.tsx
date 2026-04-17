import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export function PublishImpactDialog({
  open,
  changes,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  changes: { field: string; old: string; new: string }[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-ink-10 bg-white p-6 shadow-card-xl">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber/25 text-amber">
            <AlertTriangle size={22} strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-ink">Strong alert — ticket holders affected</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-60">
              Tickets have already been sold. Saving will queue <strong>email + in-app</strong> notifications listing each changed field (old vs new).
              Significant date/time/location changes may require <strong>organizer-led refunds</strong> (demo).
            </p>
          </div>
        </div>
        <ul className="mt-5 max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-ink-10 bg-ink-5/50 p-3 text-[13px]">
          {changes.map((c, i) => (
            <li key={`${c.field}-${i}`} className="rounded-xl bg-white px-3 py-2 shadow-card-sm">
              <p className="font-bold text-ink">{c.field}</p>
              <p className="text-ink-60">
                <span className="line-through">{c.old}</span>
                <span className="mx-1 text-ink-40">→</span>
                <span className="font-semibold text-ink">{c.new}</span>
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="sm:min-w-[120px]" onClick={onCancel}>
            Back
          </Button>
          <Button type="button" variant="dark" className="sm:min-w-[160px]" onClick={onConfirm}>
            Save &amp; notify (demo)
          </Button>
        </div>
      </div>
    </div>
  );
}
