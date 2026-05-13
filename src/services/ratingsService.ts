import { readString, toIdString } from '@/lib/api/json';
import { organizerApi } from '@/store/api/organizerApi';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';
import type { GivenRating, OrganizerRatingAggregate, RatingItem } from '@/types/domain';
import type { LaravelPaginatorUnknown } from '@/schemas/organizer/responses/shared';

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/** Engagements replace mock ratings — no star scores in the organizer API; UI shows thread-style copy. */
function mapEngagementToRatingItem(row: unknown, index: number): RatingItem {
  const o = asRecord(row) ?? {};
  const title = readString(o, 'title', 'subject', 'topic');
  const status = readString(o, 'status', 'state');
  const body = readString(o, 'body', 'description', 'notes', 'message');
  const comment = [title, status, body].filter(Boolean).join(' · ') || 'Engagement';
  return {
    id: toIdString(o.id) || `eng-${index}`,
    from: readString(o, 'counterparty_name', 'talent_name', 'vendor_name', 'from', 'with_user_name') || 'Partner',
    score: 0,
    comment,
    eventTitle: readString(o, 'event_title', 'eventTitle') || '—',
    eventId: readString(o, 'event_id', 'eventId') || undefined,
    at: readString(o, 'updated_at', 'created_at') || new Date().toISOString(),
  };
}

export async function listRatings() {
  await delay();
  try {
    const page = await apiUnwrap<LaravelPaginatorUnknown>(apiDispatch(organizerApi.endpoints.listEngagements.initiate()));
    return page.data.map((row: unknown, i: number) => mapEngagementToRatingItem(row, i));
  } catch {
    return [] as RatingItem[];
  }
}

export async function listGivenRatings() {
  await delay();
  return [] as GivenRating[];
}

export async function getRatingsAggregate(): Promise<OrganizerRatingAggregate> {
  await delay();
  const ratings = await listRatings();
  return {
    overallAverage: 0,
    totalReceived: ratings.length,
    byEvent: [],
  };
}
