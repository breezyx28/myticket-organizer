import { describe, expect, it, beforeEach } from 'vitest';
import {
  eventEditorSectionStorageKey,
  parseStoredEventEditorTab,
  readStoredEventEditorTab,
  writeStoredEventEditorTab,
} from '@/hooks/usePersistedEventEditorTab';

describe('usePersistedEventEditorTab storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('uses per-event storage key', () => {
    expect(eventEditorSectionStorageKey('18')).toBe('organizer_event_editor_section_v1_18');
  });

  it('falls back to basics for invalid stored id', () => {
    expect(parseStoredEventEditorTab('invalid')).toBe('basics');
    expect(parseStoredEventEditorTab(null)).toBe('basics');
  });

  it('persists and reads tab per event', () => {
    writeStoredEventEditorTab('18', 'seats');
    writeStoredEventEditorTab('99', 'tickets');
    expect(readStoredEventEditorTab('18')).toBe('seats');
    expect(readStoredEventEditorTab('99')).toBe('tickets');
  });
});
