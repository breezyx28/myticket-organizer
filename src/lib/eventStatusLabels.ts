import type { EventStatus } from '@/types/domain';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';

export function useEventStatusLabel(status: EventStatus): string {
  const { t } = useTranslation('events');
  return t(`status.${status}`);
}

export function getEventStatusLabel(status: EventStatus): string {
  return i18n.t(`status.${status}`, { ns: 'events' });
}
