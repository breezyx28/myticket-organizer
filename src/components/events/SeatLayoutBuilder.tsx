import { Button } from '@/components/ui/Button';
import {
  nextSeatSelection,
  pruneSeatSelection,
  resolveSeatClickModifier,
  seatIdsInRowMajorRange,
} from '@/lib/seatSelection';
import { cn } from '@/lib/utils';
import type { OrganizerEvent, SeatCell, TicketTypeDef } from '@/types/domain';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['events', 'common']);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [overrideRow, setOverrideRow] = useState<number>(1);
  const [overrideRowGap, setOverrideRowGap] = useState<number>(event.rowGap);
  const [overrideCol, setOverrideCol] = useState<number>(1);
  const [overrideColGap, setOverrideColGap] = useState<number>(event.colGap);

  useEffect(() => {
    setSelectedIds((prev) => pruneSeatSelection(prev, event.seats));
  }, [event.seats]);

  const types = event.ticketTypes;
  const selectedList = useMemo(
    () => event.seats.filter((s) => selectedIds.has(s.id)),
    [event.seats, selectedIds]
  );
  const singleSelected = selectedList.length === 1 ? selectedList[0]! : null;

  if (event.layoutType === 'free') {
    return <p className="text-[14px] text-ink-60">{t('seats.freeLayoutNote')}</p>;
  }

  function patchSeats(updater: (seats: SeatCell[]) => SeatCell[]) {
    onChangeSeats(updater(event.seats));
  }

  function setSeat(id: string, patch: Partial<Pick<SeatCell, 'ticketTypeId' | 'price' | 'accessibility'>>) {
    patchSeats((seats) => seats.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleSeatPointerDown(seat: SeatCell, e: React.MouseEvent) {
    if (e.button !== 0) return;
    const modifier = resolveSeatClickModifier(e);
    const rangeIds =
      modifier === 'range' && anchorId
        ? seatIdsInRowMajorRange(event.seats, anchorId, seat.id)
        : [seat.id];

    setSelectedIds((prev) => nextSeatSelection(prev, seat.id, modifier, rangeIds));
    setAnchorId(seat.id);
  }

  function selectAllSeats() {
    const all = new Set(event.seats.map((s) => s.id));
    setSelectedIds(all);
    const first = event.seats[0];
    if (first) setAnchorId(first.id);
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setAnchorId(null);
  }

  function applyBulk(patch: { ticketTypeId?: string; price?: number }) {
    if (selectedIds.size === 0) return;
    patchSeats((seats) =>
      seats.map((s) => {
        if (!selectedIds.has(s.id)) return s;
        const next = { ...s };
        if (patch.ticketTypeId !== undefined) {
          next.ticketTypeId = patch.ticketTypeId;
          if (patch.price === undefined) {
            next.price = types.find((tt) => tt.id === patch.ticketTypeId)?.defaultPrice ?? s.price;
          }
        }
        if (patch.price !== undefined) next.price = patch.price;
        return next;
      })
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-60 transition-colors hover:bg-ink-5 hover:text-ink"
          onClick={() => onApplyTemplate?.(6, 10)}
        >
          {t('seats.templates.small')}
        </button>
        <button
          type="button"
          className="rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-60 transition-colors hover:bg-ink-5 hover:text-ink"
          onClick={() => onApplyTemplate?.(8, 12)}
        >
          {t('seats.templates.medium')}
        </button>
        <button
          type="button"
          className="rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-60 transition-colors hover:bg-ink-5 hover:text-ink"
          onClick={() => onApplyTemplate?.(10, 14)}
        >
          {t('seats.templates.large')}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[12px] font-semibold text-ink-60">
          {t('seats.rows')}
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
          {t('seats.columns')}
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
          {t('seats.rowGap')}
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
            value={event.rowGap}
            onChange={(e) => onChangeSpacing({ rowGap: Number(e.target.value) })}
          />
        </label>
        <label className="text-[12px] font-semibold text-ink-60">
          {t('seats.colGap')}
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
            {t('seats.rowOverrideIndex')}
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
            {t('seats.gap')}
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
            {t('seats.applyRow')}
          </button>
        </div>
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[12px] font-semibold text-ink-60">
            {t('seats.colOverrideIndex')}
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
            {t('seats.gap')}
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
            {t('seats.applyCol')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-ink-60">
          <strong>{t('seats.selectionClick')}</strong> {t('seats.selectionToSelect')} · <strong>{t('seats.selectionCtrlClick')}</strong>{' '}
          {t('seats.selectionToAddRemove')} · <strong>{t('seats.selectionShiftClick')}</strong> {t('seats.selectionForRange')} ·{' '}
          <strong>{t('seats.selectionDoubleClick')}</strong> {t('seats.selectionTogglesAccessibility')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-60 hover:bg-ink-5 hover:text-ink"
            onClick={selectAllSeats}
          >
            {t('seats.selectAll')}
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            className="rounded-full border border-ink-10 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-60 hover:bg-ink-5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            onClick={clearSelection}
          >
            {t('clear', { ns: 'common' })}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-10 bg-white p-4">
        <div
          className="grid w-max gap-1 select-none"
          style={{
            gridTemplateColumns: `repeat(${event.cols}, minmax(0, 1fr))`,
            gap: `${event.colGap / 4}px ${event.rowGap / 4}px`,
          }}
        >
          {event.seats.map((s) => {
            const isSelected = selectedIds.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                title={s.id}
                aria-pressed={isSelected}
                onPointerDown={(e) => handleSeatPointerDown(s, e)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  setSeat(s.id, { accessibility: !s.accessibility });
                }}
                className={cn(
                  'h-8 w-8 rounded-md text-[10px] font-mono font-bold text-ink shadow-card-sm ring-1 ring-ink/10 transition-[outline,transform] duration-100',
                  typeColor(s.ticketTypeId, types),
                  s.accessibility ? 'ring-2 ring-indigo ring-offset-1' : '',
                  isSelected && 'z-10 scale-[1.06] outline outline-2 outline-offset-2 outline-coral'
                )}
              >
                {s.row + 1}:{s.col + 1}
              </button>
            );
          })}
        </div>
      </div>

      {selectedIds.size >= 2 ? (
        <SeatBulkInspector
          count={selectedIds.size}
          types={types}
          onApply={applyBulk}
          onClear={clearSelection}
        />
      ) : (
        <SeatInspector seat={singleSelected} types={types} onApply={(patch) => singleSelected && setSeat(singleSelected.id, patch)} />
      )}
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
  const { t } = useTranslation('events');

  if (!seat) {
    return <p className="text-[13px] text-ink-40">{t('seats.inspectorEmpty')}</p>;
  }
  return (
    <div className="rounded-2xl border border-dashed border-ink-20 bg-ink-5/40 p-4 text-[13px] text-ink-60">
      <p className="font-bold text-ink">{t('seats.inspectorTitle')}</p>
      <p className="mt-1 font-mono text-[12px] text-ink">{seat.id}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-ink-10 bg-white px-3 py-2 text-[13px]"
          value={seat.ticketTypeId}
          onChange={(e) =>
            onApply({
              ticketTypeId: e.target.value,
              price: types.find((tt) => tt.id === e.target.value)?.defaultPrice ?? seat.price,
            })
          }
        >
          {types.map((tt) => (
            <option key={tt.id} value={tt.id}>
              {tt.label}
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

function SeatBulkInspector({
  count,
  types,
  onApply,
  onClear,
}: {
  count: number;
  types: TicketTypeDef[];
  onApply: (patch: { ticketTypeId?: string; price?: number }) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation(['events', 'common']);
  const [applyType, setApplyType] = useState(true);
  const [applyPrice, setApplyPrice] = useState(false);
  const [ticketTypeId, setTicketTypeId] = useState(types[0]?.id ?? '');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (types.length > 0 && !types.some((tt) => tt.id === ticketTypeId)) {
      setTicketTypeId(types[0]!.id);
    }
  }, [types, ticketTypeId]);

  const canApply = (applyType && ticketTypeId) || (applyPrice && price.trim() !== '' && !Number.isNaN(Number(price)));

  return (
    <div className="rounded-2xl border border-coral/25 bg-lemon/15 p-4 text-[13px] text-ink-60 shadow-card-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink">{t('seats.bulkEdit')}</p>
          <p className="mt-0.5 text-[12px] text-ink-60">{t('seats.bulkSelected', { count })}</p>
        </div>
        <button
          type="button"
          className="text-[12px] font-semibold text-ink-60 underline-offset-2 hover:text-ink hover:underline"
          onClick={onClear}
        >
          {t('seats.clearSelection')}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-[12px] font-semibold text-ink">
          <input
            type="checkbox"
            checked={applyType}
            onChange={(e) => setApplyType(e.target.checked)}
            className="h-4 w-4 rounded border-ink-20"
          />
          {t('seats.ticketType')}
        </label>
        <select
          disabled={!applyType}
          className="min-w-[140px] rounded-xl border border-ink-10 bg-white px-3 py-2 text-[13px] disabled:opacity-50"
          value={ticketTypeId}
          onChange={(e) => setTicketTypeId(e.target.value)}
        >
          {types.map((tt) => (
            <option key={tt.id} value={tt.id}>
              {tt.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-[12px] font-semibold text-ink">
          <input
            type="checkbox"
            checked={applyPrice}
            onChange={(e) => setApplyPrice(e.target.checked)}
            className="h-4 w-4 rounded border-ink-20"
          />
          {t('seats.price')}
        </label>
        <input
          type="number"
          min={0}
          disabled={!applyPrice}
          placeholder={t('seats.pricePlaceholder')}
          className="w-28 rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[13px] disabled:opacity-50"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <Button
          variant="dark"
          size="sm"
          disabled={!canApply}
          onClick={() => {
            const patch: { ticketTypeId?: string; price?: number } = {};
            if (applyType && ticketTypeId) patch.ticketTypeId = ticketTypeId;
            if (applyPrice && price.trim() !== '') patch.price = Number(price);
            onApply(patch);
          }}
        >
          {t('seats.applyToSeats', { count })}
        </Button>
      </div>
    </div>
  );
}
