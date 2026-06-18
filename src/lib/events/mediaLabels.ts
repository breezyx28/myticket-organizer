import { tNs } from '@/lib/i18n/translateNs';

export function defaultTicketTypeLabel(id: string): string {
  if (id === 'tt_acc') return tNs('events', 'defaults.ticketAccessibility');
  if (id === 'tt_std') return tNs('events', 'defaults.ticketStandard');
  return id;
}

export function postEventMediaFallbackLabel(): string {
  return tNs('events', 'defaults.mediaFallback');
}

export function postEventMediaKindLabel(kind: 'photo' | 'video'): string {
  return tNs('events', kind === 'photo' ? 'defaults.mediaPhoto' : 'defaults.mediaVideo');
}
