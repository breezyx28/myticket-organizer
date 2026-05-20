import { useCallback, useEffect, useState } from 'react';

export const EVENT_EDITOR_TAB_IDS = [
  'basics',
  'media',
  'layout',
  'seats',
  'tickets',
  'more',
] as const;

export type EventEditorTabId = (typeof EVENT_EDITOR_TAB_IDS)[number];

const STORAGE_PREFIX = 'organizer_event_editor_section_v1_';
const DEFAULT_TAB: EventEditorTabId = 'basics';

export function eventEditorSectionStorageKey(eventId: string) {
  return `${STORAGE_PREFIX}${eventId}`;
}

export function parseStoredEventEditorTab(raw: string | null): EventEditorTabId {
  if (!raw) return DEFAULT_TAB;
  return EVENT_EDITOR_TAB_IDS.includes(raw as EventEditorTabId) ? (raw as EventEditorTabId) : DEFAULT_TAB;
}

export function readStoredEventEditorTab(eventId: string): EventEditorTabId {
  try {
    return parseStoredEventEditorTab(sessionStorage.getItem(eventEditorSectionStorageKey(eventId)));
  } catch {
    return DEFAULT_TAB;
  }
}

export function writeStoredEventEditorTab(eventId: string, tab: EventEditorTabId) {
  try {
    sessionStorage.setItem(eventEditorSectionStorageKey(eventId), tab);
  } catch {
    /* private mode / quota */
  }
}

export function usePersistedEventEditorTab(eventId: string | undefined) {
  const [activeTab, setActiveTabState] = useState<EventEditorTabId>(DEFAULT_TAB);

  useEffect(() => {
    if (!eventId || eventId === 'new') {
      setActiveTabState(DEFAULT_TAB);
      return;
    }
    setActiveTabState(readStoredEventEditorTab(eventId));
  }, [eventId]);

  const setActiveTab = useCallback(
    (tab: EventEditorTabId) => {
      setActiveTabState(tab);
      if (eventId && eventId !== 'new') {
        writeStoredEventEditorTab(eventId, tab);
      }
    },
    [eventId]
  );

  return { activeTab, setActiveTab };
}
