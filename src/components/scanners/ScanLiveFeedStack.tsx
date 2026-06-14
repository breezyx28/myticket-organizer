import { useEffect, useRef } from 'react';
import type { ScanLiveRow } from '@/types/domain';
import { ScanLiveFeedItem } from '@/components/scanners/ScanLiveFeedItem';
import { ScannerEmptyState } from '@/components/scanners/scannerUi';

export function ScanLiveFeedStack({
  rows,
  eventTitle,
  activeScanners,
}: {
  rows: ScanLiveRow[];
  eventTitle: string;
  activeScanners?: number;
}) {
  const prevCountRef = useRef(rows.length);
  const newCount = Math.max(0, rows.length - prevCountRef.current);

  useEffect(() => {
    prevCountRef.current = rows.length;
  }, [rows.length]);

  if (rows.length === 0) {
    return (
      <ScannerEmptyState
        title="Waiting for scans"
        description={
          activeScanners === 0
            ? 'No scanners are assigned to this event yet. Assign gate staff, then scans will appear here in real time.'
            : 'Scans from assigned gate devices will stream here as tickets are checked in.'
        }
      />
    );
  }

  return (
    <ul className="max-h-[min(52dvh,420px)] space-y-2.5 overflow-y-auto pr-1">
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
