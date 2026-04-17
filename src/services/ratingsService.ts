import { loadState } from '@/services/organizerStore';

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

export async function listRatings() {
  await delay();
  return loadState().ratings;
}

export async function listGivenRatings() {
  await delay();
  return loadState().givenRatings ?? [];
}

export async function getRatingsAggregate() {
  await delay();
  const s = loadState();
  const ratings = s.ratings;
  const overallAverage = ratings.length ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;
  const byEventMap = new Map<string, { eventTitle: string; total: number; count: number }>();
  ratings.forEach((r) => {
    const key = r.eventId ?? r.eventTitle;
    const existing = byEventMap.get(key) ?? { eventTitle: r.eventTitle, total: 0, count: 0 };
    existing.total += r.score;
    existing.count += 1;
    byEventMap.set(key, existing);
  });
  const byEvent = Array.from(byEventMap.entries()).map(([eventId, item]) => ({
    eventId,
    eventTitle: item.eventTitle,
    average: item.count ? item.total / item.count : 0,
    count: item.count,
  }));
  return { overallAverage, totalReceived: ratings.length, byEvent };
}
