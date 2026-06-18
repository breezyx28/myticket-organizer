import { useEffect, useRef } from 'react';
import type { ScanLiveRow } from '@/types/domain';
import { ScanLiveFeedItem } from '@/components/scanners/ScanLiveFeedItem';
import { ScannerEmptyState } from '@/components/scanners/scannerUi';
import { useTranslation } from 'react-i18next';

export function ScanLiveFeedStack({
  rows,
  eventTitle,
}: {
  rows: ScanLiveRow[];
  eventTitle: string;
  activeScanners?: number;
}) {
  const { t } = useTranslation('scanners');
  const prevCountRef = useRef(rows.length);
  const newCount = Math.max(0, rows.length - prevCountRef.current);

  useEffect(() => {
    prevCountRef.current = rows.length;
  }, [rows.length]);

  if (rows.length === 0) {
    return <ScannerEmptyState title={t('live.empty')} description={t('live.subtitle')} />;
  }

  return (
    <ul className="max-h-[min(52dvh,420px)] space-y-2.5 overflow-y-auto pe-1">
      {rows.map((row, index) => (
        <ScanLiveFeedItem
          key={row.id}
          row={row}
          eventTitle={eventTitle}
          enterDelayMs={index < newCount ? index * 60 : 0}
        />
      ))}
    </ul>
  );
}
