import i18n from '@/i18n';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export function tNs(ns: string, key: string, options?: Record<string, unknown>): string {
  return (i18n.t as TranslateFn)(key, { ns, ...options });
}
