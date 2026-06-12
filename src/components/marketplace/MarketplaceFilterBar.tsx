import type { MarketplaceCategoryOption } from '@/types/domain';
import type { SaudiCityOption, SaudiRegionOption } from '@/store/api/referenceApi';
import { cn } from '@/lib/utils';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export type MarketplaceFilterValues = {
  search: string;
  categoryId: string;
  regionId: string;
  cityId: string;
};

export const EMPTY_MARKETPLACE_FILTERS: MarketplaceFilterValues = {
  search: '',
  categoryId: '',
  regionId: '',
  cityId: '',
};

export function MarketplaceFilterBar({
  categoryLabel,
  categories,
  regions,
  cities,
  values,
  onChange,
  onReset,
}: {
  categoryLabel: string;
  categories: MarketplaceCategoryOption[];
  regions: SaudiRegionOption[];
  cities: SaudiCityOption[];
  values: MarketplaceFilterValues;
  onChange: (next: MarketplaceFilterValues) => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchDraft, setSearchDraft] = useState(values.search);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    setSearchDraft(values.search);
  }, [values.search]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      onChange({ ...valuesRef.current, search: searchDraft });
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchDraft, onChange]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (values.search.trim()) n += 1;
    if (values.categoryId) n += 1;
    if (values.regionId) n += 1;
    if (values.cityId) n += 1;
    return n;
  }, [values]);

  const selectClass =
    'h-10 w-full rounded-xl border border-ink-10 bg-white px-3 text-[13px] text-ink outline-none transition focus:border-ink-30 focus:ring-2 focus:ring-ink/10 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40"
            strokeWidth={2}
            aria-hidden
          />
          <input
            className="h-10 w-full rounded-xl border border-ink-10 bg-white pl-10 pr-3 text-[14px] text-ink outline-none transition focus:border-ink-30 focus:ring-2 focus:ring-ink/10"
            placeholder="Search by name or specialty…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition active:scale-[0.98]',
            expanded || activeCount > 0
              ? 'border-ink bg-ink text-white'
              : 'border-ink-10 bg-white text-ink-60 hover:bg-ink-5 hover:text-ink'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
          Refine
          {activeCount > 0 ? (
            <span className="rounded-full bg-coral px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {expanded ? (
        <div className="rounded-2xl border border-ink-10 bg-ink-5/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-50">Advanced filters</p>
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-coral transition hover:underline active:scale-[0.98]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Clear all
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink-60">{categoryLabel}</span>
              <select
                className={selectClass}
                value={values.categoryId}
                onChange={(e) => onChange({ ...values, categoryId: e.target.value })}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink-60">Region</span>
              <select
                className={selectClass}
                value={values.regionId}
                onChange={(e) =>
                  onChange({ ...values, regionId: e.target.value, cityId: '' })
                }
              >
                <option value="">All regions</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink-60">City</span>
              <select
                className={selectClass}
                disabled={!values.regionId}
                value={values.cityId}
                onChange={(e) => onChange({ ...values, cityId: e.target.value })}
              >
                <option value="">{values.regionId ? 'All cities in region' : 'Select a region first'}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
