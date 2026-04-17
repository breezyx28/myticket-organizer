import type { RecurrencePattern } from '@/types/domain';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RecurrenceManager({
  value,
  onChange,
}: {
  value: RecurrencePattern | null | undefined;
  onChange: (next: RecurrencePattern | null) => void;
}) {
  const v = value ?? { weekdays: [], windowStart: '', windowEnd: '' };

  function toggleDay(d: number) {
    const set = new Set(v.weekdays);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    onChange({ ...v, weekdays: [...set].sort((a, b) => a - b) });
  }

  return (
    <div className="rounded-2xl border border-ink-10 bg-ink-5/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-extrabold text-ink">Recurring schedule</h3>
        <button type="button" className="text-[12px] font-semibold text-coral hover:underline" onClick={() => onChange(null)}>
          Clear recurrence
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {DAYS.map((label, idx) => {
          const on = v.weekdays.includes(idx);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggleDay(idx)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                on ? 'bg-ink text-white' : 'bg-white text-ink-60 ring-1 ring-ink-10'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-[12px] font-semibold text-ink-60">
          Window start
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
            value={v.windowStart}
            onChange={(e) => onChange({ ...v, windowStart: e.target.value })}
          />
        </label>
        <label className="block text-[12px] font-semibold text-ink-60">
          Window end
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
            value={v.windowEnd}
            onChange={(e) => onChange({ ...v, windowEnd: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
