import { describe, expect, it } from 'vitest';
import { organizerUserToProfilePatch } from '@/lib/api/mapProfile';

describe('organizerUserToProfilePatch', () => {
  it('includes typical_event_duration_hours from organization', () => {
    const body = organizerUserToProfilePatch({
      organization: { typicalEventDurationHours: 4, previousEvents: [], categories: [] },
    });
    expect(body.typical_event_duration_hours).toBe(4);
  });

  it('sends null when typical event duration is cleared', () => {
    const body = organizerUserToProfilePatch({
      organization: { typicalEventDurationHours: null, previousEvents: [], categories: [] },
    });
    expect(body.typical_event_duration_hours).toBeNull();
  });
});
