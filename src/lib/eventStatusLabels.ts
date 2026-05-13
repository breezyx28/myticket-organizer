import type { EventStatus } from '@/types/domain';

/** Human-readable labels aligned with `docs/frontend-handoff-organizer-event-editor-api.md`. */
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  rejected: 'Rejected',
  published: 'Published',
  sold_out: 'Sold out',
  in_progress: 'In progress',
  ended: 'Ended',
  cancelled: 'Cancelled',
  archived: 'Archived',
};
