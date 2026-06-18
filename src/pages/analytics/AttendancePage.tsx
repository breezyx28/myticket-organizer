import { getAttendanceAnalytics, type AttendanceAnalyticsPayload } from '@/services/analyticsService';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { formatDateTime } from '@/lib/locale/format';

export function AttendancePage() {
  const { t } = useTranslation('analytics');
  const { language } = useLocale();
  const [data, setData] = useState<AttendanceAnalyticsPayload | null>(null);
  const [eventId, setEventId] = useState('');

  const reload = useCallback(async (selected = eventId) => {
    const res = await getAttendanceAnalytics({ eventId: selected || undefined });
    setData(res.data);
  }, [eventId]);

  useEffect(() => {
    const tId = window.setTimeout(() => {
      void reload('');
    }, 0);
    return () => window.clearTimeout(tId);
  }, [reload]);

  const rate = data ? Math.round(data.summary.attendance_rate * 10) / 10 : 0;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('attendance.eyebrow')}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('attendance.title')}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">{t('attendance.description')}</p>
      </div>
      <div className="rounded-2xl border border-ink-10 bg-white p-4">
        <label className="text-[12px] font-semibold text-ink-60">
          {t('attendance.filter.label')}
          <select
            value={eventId}
            onChange={(e) => {
              const next = e.target.value;
              setEventId(next);
              void reload(next);
            }}
            className="mt-1 w-full max-w-md rounded-xl border border-ink-10 px-3 py-2 text-[13px]"
          >
            <option value="">{t('attendance.filter.allEvents')}</option>
            {data?.filters.events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <p className="text-[12px] font-semibold text-ink-60">{t('attendance.kpi.sold')}</p>
          <p className="mt-2 font-mono text-3xl font-bold">{data?.summary.sold ?? '—'}</p>
        </div>
        <div className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <p className="text-[12px] font-semibold text-ink-60">{t('attendance.kpi.successfulScans')}</p>
          <p className="mt-2 font-mono text-3xl font-bold">{data?.summary.scans_ok ?? '—'}</p>
        </div>
        <div className="rounded-3xl border border-ink-10 bg-lemon/30 p-6 shadow-card-sm">
          <p className="text-[12px] font-semibold text-ink-60">{t('attendance.kpi.attendanceRate')}</p>
          <p className="mt-2 font-mono text-3xl font-bold">{data ? `${rate}%` : '—'}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">{t('attendance.noShows.title')}</h2>
        <p className="mt-2 font-mono text-4xl font-bold text-coral">{data?.summary.no_show_estimate ?? '—'}</p>
        <p className="mt-2 text-[13px] text-ink-60">{t('attendance.noShows.subtitle')}</p>
      </section>

      <section className="rounded-3xl border border-ink-10 bg-ink p-6 text-white shadow-card-lg">
        <h2 className="text-lg font-extrabold">{t('attendance.recentLogs.title')}</h2>
        <ul className="mt-4 space-y-2 text-[13px]">
          {data?.recent_logs.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-2xl bg-white/10 px-4 py-3">
              <span className="font-mono">{l.ticket_ref}</span>
              <span className="uppercase text-lemon">{l.result}</span>
              <span className="text-white/70">{formatDateTime(l.at, language)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
