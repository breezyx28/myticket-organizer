import { tNs } from '@/lib/i18n/translateNs';

const EVENT_FIELD_LABEL_KEYS: Record<string, string> = {
  title: 'editor.fields.title',
  description: 'editor.fields.description',
  category: 'editor.fields.category',
  categoryId: 'editor.fields.category',
  venue: 'editor.fields.venue',
  city: 'editor.fields.city',
  regionId: 'editor.fields.region',
  cityId: 'editor.fields.city',
  startsAt: 'editor.fields.starts',
  endsAt: 'editor.fields.ends',
  layoutType: 'editor.fields.layoutType',
  rows: 'editor.fields.rowsRegenSeats',
  cols: 'editor.fields.columns',
  rowGap: 'editor.fields.rows',
  colGap: 'editor.fields.columns',
  capacity: 'editor.fields.maxCapacity',
  entryMode: 'editor.fields.entryMode',
  purchaseLimitPerUser: 'editor.fields.purchaseLimit',
  multiDaySingleTicket: 'editor.fields.multiDayTicketing',
  latitude: 'editor.fields.venue',
  longitude: 'editor.fields.venue',
};

const VALIDATION_FIELD_KEYS: Record<string, string> = {
  email: 'validationFields.email',
  password: 'validationFields.password',
  password_confirmation: 'validationFields.passwordConfirmation',
  name: 'validationFields.name',
  phone: 'validationFields.phone',
  username: 'validationFields.username',
  display_name: 'validationFields.displayName',
  business_name: 'validationFields.businessName',
  stage_name: 'validationFields.stageName',
  slug: 'validationFields.slug',
  otp: 'validationFields.otp',
  token: 'validationFields.token',
  image: 'validationFields.image',
  file: 'validationFields.file',
  logo: 'validationFields.logo',
  cover_image: 'validationFields.coverImage',
};

type TranslateFn = (key: string, options?: { ns?: string }) => string;

function humanizeFieldKey(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatApiFieldKey(field: string, t?: TranslateFn): string {
  const eventsKey = EVENT_FIELD_LABEL_KEYS[field];
  if (eventsKey) {
    return t ? t(eventsKey, { ns: 'events' }) : tNs('events', eventsKey);
  }
  const validationKey = VALIDATION_FIELD_KEYS[field];
  if (validationKey) {
    return t ? t(validationKey, { ns: 'errors' }) : tNs('errors', validationKey);
  }
  return humanizeFieldKey(field);
}

export function publishImpactFieldLabel(field: string, t: TranslateFn): string {
  return formatApiFieldKey(field, t);
}
