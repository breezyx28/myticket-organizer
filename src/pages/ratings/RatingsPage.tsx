import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { getRatingsAggregate, listGivenRatings, listRatings } from '@/services/ratingsService';
import type { GivenRating, RatingItem } from '@/types/domain';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, Cell, Area, AreaChart, XAxis, YAxis } from 'recharts';
import { Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { formatDate } from '@/lib/locale/format';

export function RatingsPage() {
  const { t } = useTranslation('ratings');
  const { language } = useLocale();
  const chartConfig = useMemo(
    () =>
      ({
        score: {
          label: t('charts.scoreTrend.score'),
          color: '#ff6b4a',
        },
        average: {
          label: t('charts.scoreTrend.runningAvg'),
          color: '#3355ff',
        },
      }) satisfies ChartConfig,
    [t]
  );
  const [items, setItems] = useState<RatingItem[]>([]);
  const [given, setGiven] = useState<GivenRating[]>([]);
  const [aggregate, setAggregate] = useState<Awaited<ReturnType<typeof getRatingsAggregate>> | null>(null);
  const [tab, setTab] = useState<'received' | 'given' | 'byEvent'>('received');
  const [ready, setReady] = useState(false);

  const BAR_PALETTE = ['#ff6b4a', '#4dffc3', '#f5e642', '#3355ff', '#f4a05a', '#c4b5f4'] as const;

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        const [received, givenRatings, aggr] = await Promise.all([listRatings(), listGivenRatings(), getRatingsAggregate()]);
        setItems(received);
        setGiven(givenRatings);
        setAggregate(aggr);
        requestAnimationFrame(() => setReady(true));
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const trendData = useMemo(() => {
    const sorted = [...items].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return sorted.map((r, i) => ({
      label: formatDate(r.at, language, { month: 'short', day: 'numeric' }),
      score: r.score,
      cumulative: sorted.slice(0, i + 1).reduce((s, x) => s + x.score, 0) / (i + 1),
    }));
  }, [items, language]);

  const barData = useMemo(
    () =>
      (aggregate?.byEvent ?? []).map((row) => ({
        name: row.eventTitle.length > 22 ? `${row.eventTitle.slice(0, 22)}…` : row.eventTitle,
        fullTitle: row.eventTitle,
        average: Number(row.average.toFixed(2)),
        count: row.count,
      })),
    [aggregate]
  );

  return (
    <div
      className={cn(
        'space-y-8 transition-all duration-500 ease-out motion-reduce:transition-none',
        ready ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <Card className="border-ink-10 bg-white shadow-card-sm">
        <CardHeader className="border-b border-ink-10 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('page.eyebrow')}</p>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-ink">{t('page.title')}</CardTitle>
          <CardDescription className="max-w-2xl text-[15px] text-ink-60">{t('page.description')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <TabButton active={tab === 'received'} onClick={() => setTab('received')} label={t('tabs.received')} />
            <TabButton active={tab === 'given'} onClick={() => setTab('given')} label={t('tabs.given')} />
            <TabButton active={tab === 'byEvent'} onClick={() => setTab('byEvent')} label={t('tabs.byEvent')} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label={t('stats.overallAverage')} value={aggregate ? aggregate.overallAverage.toFixed(2) : '—'} delay={0} ready={ready} />
        <StatCard label={t('stats.receivedCount')} value={aggregate ? String(aggregate.totalReceived) : '—'} delay={75} ready={ready} />
      </div>

      {tab === 'received' ? (
        <div className="grid gap-6 xl:grid-cols-5">
          <Card
            className={cn(
              'border-ink-10 bg-white shadow-card-sm transition-all duration-500 xl:col-span-2 motion-reduce:transition-none',
              ready ? 'opacity-100' : 'opacity-0'
            )}
            style={{ transitionDelay: ready ? '120ms' : '0ms' }}
          >
            <CardHeader>
              <CardTitle className="text-lg text-ink">{t('charts.scoreTrend.title')}</CardTitle>
              <CardDescription>{t('charts.scoreTrend.description')}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              {trendData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('charts.scoreTrend.noTrend')}</p>
              ) : trendData.every((d) => d.score === 0) ? (
                <p className="text-sm text-muted-foreground">{t('charts.scoreTrend.scoresHidden')}</p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-[4/3] max-h-[280px] w-full sm:aspect-video">
                  <AreaChart data={trendData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ratingsScoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-score)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-score)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" vertical={false} className="stroke-border/60" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" />
                    <YAxis domain={[0, 5.5]} width={32} tickLine={false} axisLine={false} tickMargin={4} className="text-[11px]" />
                    <ChartTooltip cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      name={t('charts.scoreTrend.runningAvg')}
                      stroke="var(--color-average)"
                      strokeWidth={2}
                      fill="none"
                      isAnimationActive
                      animationDuration={900}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name={t('charts.scoreTrend.score')}
                      stroke="var(--color-score)"
                      strokeWidth={2}
                      fill="url(#ratingsScoreFill)"
                      isAnimationActive
                      animationDuration={700}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4 xl:col-span-3">
            {items.map((r, i) => (
              <RatingReceivedCard key={r.id} rating={r} index={i} ready={ready} />
            ))}
            {items.length === 0 ? (
              <Card className="border-dashed border-ink-20 bg-muted/30">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">{t('lists.received.empty')}</CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'given' ? (
        <div className="space-y-3">
          {given.map((g, i) => (
            <GivenRatingCard key={g.id} row={g} index={i} ready={ready} />
          ))}
          {given.length === 0 ? (
            <Card className="border-dashed border-ink-20 bg-muted/30">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">{t('lists.given.empty')}</CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'byEvent' ? (
        <Card className="border-ink-10 bg-white shadow-card-sm">
          <CardHeader>
            <CardTitle className="text-lg text-ink">{t('charts.byEvent.title')}</CardTitle>
            <CardDescription>{t('charts.byEvent.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {barData.length > 0 ? (
              <ChartContainer config={chartConfig} className="aspect-[5/3] w-full max-h-[320px]">
                <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 8" horizontal={false} className="stroke-border/60" />
                  <XAxis type="number" domain={[0, 5.5]} tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    className="text-[10px] font-medium"
                  />
                  <ChartTooltip cursor={{ fill: 'oklch(0.97 0 0 / 0.45)' }} content={<ChartTooltipContent />} />
                  <Bar dataKey="average" name={t('charts.byEvent.averageLabel')} radius={[0, 6, 6, 0]} isAnimationActive animationDuration={800}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : null}
            <ul className="space-y-2 border-t border-ink-10 pt-4">
              {aggregate?.byEvent.map((row) => (
                <li
                  key={row.eventId}
                  className="flex items-center justify-between rounded-xl border border-ink-10 bg-muted/20 px-3 py-2.5 text-sm transition-transform duration-300 hover:scale-[1.01] motion-reduce:transition-none motion-reduce:hover:scale-100"
                >
                  <span className="font-semibold text-ink">{row.eventTitle}</span>
                  <span className="font-mono text-xs text-ink">
                    {row.average.toFixed(2)} <span className="text-ink-40">({row.count})</span>
                  </span>
                </li>
              ))}
              {!aggregate?.byEvent.length ? (
                <li className="text-[13px] text-muted-foreground">{t('charts.byEvent.empty')}</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant={active ? 'dark' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn('rounded-full px-4 transition-transform duration-200 active:scale-[0.98]', active && 'shadow-card-sm')}
    >
      {label}
    </Button>
  );
}

function StatCard({ label, value, delay, ready }: { label: string; value: string; delay: number; ready: boolean }) {
  return (
    <Card
      className={cn(
        'border-ink-10 bg-card transition-all duration-500 motion-reduce:transition-none',
        ready ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
      style={{ transitionDelay: ready ? `${delay}ms` : '0ms' }}
    >
      <CardContent className="pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}

function RatingReceivedCard({ rating: r, index, ready }: { rating: RatingItem; index: number; ready: boolean }) {
  const { t } = useTranslation('ratings');
  const { language } = useLocale();
  const delay = 180 + index * 70;
  return (
    <Card
      className={cn(
        'border-ink-10 bg-white shadow-card-sm transition-all duration-500 motion-reduce:transition-none',
        ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      )}
      style={{ transitionDelay: ready ? `${delay}ms` : '0ms' }}
    >
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-2">
          {r.score > 0 ? (
            <>
              <Star className="fill-amber text-amber motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]" size={22} strokeWidth={2} />
              <span className="font-mono text-2xl font-bold text-ink">{r.score.toFixed(1)}</span>
            </>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('card.engagement')}
            </span>
          )}
          <span className="text-[13px] font-semibold text-ink-60">{r.eventTitle}</span>
        </div>
        <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink">{r.comment}</p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          {t('card.from', { name: r.from })} · {formatDate(r.at, language)}
        </p>
      </CardContent>
    </Card>
  );
}

function GivenRatingCard({ row: g, index, ready }: { row: GivenRating; index: number; ready: boolean }) {
  const { t } = useTranslation('ratings');
  const { language } = useLocale();
  const delay = 100 + index * 80;
  return (
    <Card
      className={cn(
        'border-ink-10 bg-white shadow-card-sm transition-all duration-500 motion-reduce:transition-none',
        ready ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
      )}
      style={{ transitionDelay: ready ? `${delay}ms` : '0ms' }}
    >
      <CardContent className="py-4">
        <p className="text-[13px] font-semibold text-ink">
          {t('card.givenTo', { name: g.to, role: g.role })} · <span className="font-mono">{g.score.toFixed(1)}</span>
        </p>
        <p className="mt-1 text-sm text-ink-60">{g.comment}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {g.eventTitle} · {formatDate(g.at, language)}
        </p>
      </CardContent>
    </Card>
  );
}
