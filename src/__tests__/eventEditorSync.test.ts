import { describe, expect, it } from 'vitest';
import {
  applySavedPatchIntent,
  mergeAfterSave,
  mergePersistedDraftWithServer,
  sanitizePersistedDraft,
  updateCommittedAfterSave,
} from '@/lib/eventEditorSync';
import type { OrganizerEvent } from '@/types/domain';

function base(overrides: Partial<OrganizerEvent> = {}): OrganizerEvent {
  return {
    id: '1',
    title: 'A',
    description: '',
    category: 'Music',
    venue: '',
    city: 'Riyadh',
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    status: 'draft',
    layoutType: 'free',
    rows: 0,
    cols: 0,
    rowGap: 8,
    colGap: 8,
    capacity: 0,
    ticketTypes: [],
    seats: [],
    entryMode: 'one_time',
    multiDaySingleTicket: false,
    occurrences: [],
    ticketsSold: 0,
    revenueGross: 0,
    eventGallery: [],
    postEventMedia: [],
    ...overrides,
  };
}

describe('eventEditorSync', () => {
  it('keeps in-flight edits when server returns stale title', () => {
    const baseline = base({ title: 'Old' });
    const draft = base({ title: 'New while saving' });
    const server = base({ title: 'Old' });
    const merged = mergeAfterSave(draft, server, baseline, { title: 'Old' });
    expect(merged.title).toBe('New while saving');
  });

  it('applies server value when user did not change during save', () => {
    const baseline = base({ title: 'Old' });
    const draft = base({ title: 'Old' });
    const server = base({ title: 'Saved' });
    const merged = mergeAfterSave(draft, server, baseline, { title: 'Saved' });
    expect(merged.title).toBe('Saved');
  });

  it('restores persisted draft fields on load', () => {
    const server = base({ title: 'Server', description: 'S-desc' });
    const persisted = base({ title: 'Local title', description: 'S-desc' });
    const merged = mergePersistedDraftWithServer(persisted, server);
    expect(merged.title).toBe('Local title');
    expect(merged.description).toBe('S-desc');
  });

  it('updates committed only for patched keys', () => {
    const committed = base({ title: 'A', venue: 'V1' });
    const server = base({ title: 'B', venue: 'V2' });
    const next = updateCommittedAfterSave(committed, server, { title: 'B' });
    expect(next.title).toBe('B');
    expect(next.venue).toBe('V1');
  });

  it('keeps saved coordinates when server still returns null', () => {
    const baseline = base({ latitude: null, longitude: null });
    const draft = base({ latitude: 24.7, longitude: 46.6 });
    const server = base({ latitude: null, longitude: null });
    const patch = { latitude: 24.7, longitude: 46.6 };
    const merged = mergeAfterSave(draft, server, baseline, patch);
    expect(merged.latitude).toBe(24.7);
    expect(merged.longitude).toBe(46.6);
  });

  it('applySavedPatchIntent preserves schedule when server lags', () => {
    const startsAt = '2026-05-27T11:43:00.000Z';
    const server = base({ startsAt: '2020-01-01T00:00:00.000Z' });
    const draft = base({ startsAt });
    const merged = applySavedPatchIntent(server, server, draft, { startsAt });
    expect(merged.startsAt).toBe(startsAt);
  });

  it('sanitizes invalid persisted schedule from session storage', () => {
    const server = base({
      startsAt: '2026-05-27T11:43:00.000Z',
      endsAt: '2026-05-31T14:48:00.000Z',
    });
    const persisted = base({ startsAt: '', endsAt: 'not-a-date' });
    const safe = sanitizePersistedDraft(persisted, server);
    expect(safe.startsAt).toBe(server.startsAt);
    expect(safe.endsAt).toBe(server.endsAt);
  });
});
