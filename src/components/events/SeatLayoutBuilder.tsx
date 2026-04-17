import type { OrganizerEvent, SeatCell, TicketTypeDef } from '@/types/domain';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

export function SeatLayoutBuilder({
  event,
  onChangeSeats,
  onChangeSpacing,
  onApplyTemplate,
}: {
  event: OrganizerEvent;
  onChangeSeats: (seats: SeatCell[]) => void;
  onChangeSpacing: (patch: Partial<Pick<OrganizerEvent, 'rowGap' | 'colGap' | 'rowGaps' | 'colGaps'>>) => void;
  onApplyTemplate?: (rows: number, cols: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrideRow, setOverrideRow] = useState<number>(1);
  const [overrideRowGap, setOverrideRowGap] = useState<number>(event.rowGap);
  const [overrideCol, setOverrideCol] = useState<number>(1);
  const [overrideColGap, setOverrideColGap] = useState<number>(event.colGap);
  const selected = useMemo(() => event.seats.find((s) => s.id === selectedId) ?? null, [event.seats, selectedId]);

  if (event.layoutType === 'free') {
    return <p className="text-[14px] text-ink-60">Free layout uses capacity + ticket type quantity limits (no seat map).</p>;
  }

  const types = event.ticketTypes;

  function setSeat(id: string, patch: Partial<Pick<SeatCell, 'ticketTypeId' | 'price' | 'accessibility'>>) {
    onChangeSeats(event.seats.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-60 hover:bg-ink-5"
          onClick={() => onApplyTemplate?.(6, 10)}
        >
          Template: Small (6x10)
        </button>
        <button
          type="button"
          className="rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-60 hover:bg-ink-5"
          onClick={() => onApplyTemplate?.(8, 12)}
        >
          Template: Medium (8x12)
        </button>
        <button
          type="button"
          className="rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-60 hover:bg-ink-5"
          onClick={() => onApplyTemplate?.(10, 14)}
        >
          Template: Large (10x14)
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[12px] font-semibold text-ink-60">
          Rows
          <input
            type="number"
            min={1}
            max={24}
            className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
            value={event.rows}
            readOnly
          />
        </label>
        <label className="text-[12px] font-semibold text-ink-60">
          Columns
          <input
            type="number"
            min={1}
            max={32}
            className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
            value={event.cols}
            readOnly
          />
        </label>
        <label className="text-[12px] font-semibold text-ink-60">
          Row gap (px)
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
            value={event.rowGap}
            onChange={(e) => onChangeSpacing({ rowGap: Number(e.target.value) })}
          />
        </label>
        <label className="text-[12px] font-semibold text-ink-60">
          Column gap (px)
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
            value={event.colGap}
            onChange={(e) => onChangeSpacing({ colGap: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="grid gap-3 rounded-2xl border border-ink-10 bg-white p-3 sm:grid-cols-2">
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[12px] font-semibold text-ink-60">
            Row override index
            <input
              type="number"
              min={1}
              max={Math.max(1, event.rows)}
              value={overrideRow}
              onChange={(e) => setOverrideRow(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-ink-10 px-2 py-2 font-mono text-[12px]"
            />
          </label>
          <label className="min-w-0 flex-1 text-[12px] font-semibold text-ink-60">
            Gap
            <input
              type="number"
              min={0}
              value={overrideRowGap}
              onChange={(e) => setOverrideRowGap(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-ink-10 px-2 py-2 font-mono text-[12px]"
            />
          </label>
          <button
            type="button"
            className="rounded-full bg-ink px-3 py-2 text-[11px] font-semibold text-white"
            onClick={() =>
              onChangeSpacing({
                rowGaps: { ...(event.rowGaps ?? {}), [Math.max(1, overrideRow) - 1]: Math.max(0, overrideRowGap) },
              })
            }
          >
            Apply row
          </button>
        </div>
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[12px] font-semibold text-ink-60">
            Column override index
            <input
              type="number"
              min={1}
              max={Math.max(1, event.cols)}
              value={overrideCol}
              onChange={(e) => setOverrideCol(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-ink-10 px-2 py-2 font-mono text-[12px]"
            />
          </label>
          <label className="min-w-0 flex-1 text-[12px] font-semibold text-ink-60">
            Gap
            <input
              type="number"
              min={0}
              value={overrideColGap}
              onChange={(e) => setOverrideColGap(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-ink-10 px-2 py-2 font-mono text-[12px]"
            />
          </label>
          <button
            type="button"
            className="rounded-full bg-ink px-3 py-2 text-[11px] font-semibold text-white"
            onClick={() =>
              onChangeSpacing({
                colGaps: { ...(event.colGaps ?? {}), [Math.max(1, overrideCol) - 1]: Math.max(0, overrideColGap) },
              })
            }
          >
            Apply col
          </button>
        </div>
      </div>
      <p className="text-[12px] text-ink-60">
        <strong>Click</strong> a seat to select it. <strong>Double-click</strong> toggles accessibility. Set per-seat type &amp; price in the inspector.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-ink-10 bg-white p-4">
        <div
          className="grid w-max gap-1"
          style={{
            gridTemplateColumns: `repeat(${event.cols}, minmax(0, 1fr))`,
            gap: `${event.colGap / 4}px ${event.rowGap / 4}px`,
          }}
        >
          {event.seats.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.id}
              onClick={() => setSelectedId(s.id)}
              onDoubleClick={(e) => {
                e.preventDefault();
                setSeat(s.id, { accessibility: !s.accessibility });
              }}
              className={cn(
                'h-8 w-8 rounded-md text-[10px] font-mono font-bold text-ink shadow-card-sm ring-1 ring-ink/10',
                typeColor(s.ticketTypeId, types),
                s.accessibility ? 'ring-2 ring-indigo ring-offset-1' : '',
                selectedId === s.id ? 'outline outline-2 outline-offset-2 outline-coral' : ''
              )}
            >
              {s.row + 1}:{s.col + 1}
            </button>
          ))}
        </div>
      </div>
      <SeatInspector seat={selected} types={types} onApply={(patch) => selected && setSeat(selected.id, patch)} />
    </div>
  );
}

function typeColor(typeId: string, types: TicketTypeDef[]) {
  const idx = types.findIndex((t) => t.id === typeId);
  const palette = ['bg-sky/50', 'bg-lime/50', 'bg-lemon/60', 'bg-mint/40', 'bg-lavender/40'];
  return palette[idx % palette.length] ?? 'bg-ink-5';
}

function SeatInspector({
  seat,
  types,
  onApply,
}: {
  seat: SeatCell | null;
  types: TicketTypeDef[];
  onApply: (patch: Partial<Pick<SeatCell, 'ticketTypeId' | 'price'>>) => void;
}) {
  if (!seat) {
    return <p className="text-[13px] text-ink-40">Select a seat to edit ticket type and price.</p>;
  }
  return (
    <div className="rounded-2xl border border-dashed border-ink-20 bg-ink-5/40 p-4 text-[13px] text-ink-60">
      <p className="font-bold text-ink">Seat inspector</p>
      <p className="mt-1 font-mono text-[12px] text-ink">{seat.id}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-ink-10 bg-white px-3 py-2 text-[13px]"
          value={seat.ticketTypeId}
          onChange={(e) =>
            onApply({
              ticketTypeId: e.target.value,
              price: types.find((t) => t.id === e.target.value)?.defaultPrice ?? seat.price,
            })
          }
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="w-28 rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[13px]"
          value={seat.price}
          onChange={(e) => onApply({ price: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
