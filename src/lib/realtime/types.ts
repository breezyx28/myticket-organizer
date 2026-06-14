export type RealtimeEnvelope<T = Record<string, unknown>> = {
  type: string;
  payload: T;
  occurred_at: string;
};

export type NotificationPayload = {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  is_read: boolean;
  created_at: string | null;
};

export type MessagePayload = {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  sender_role: string;
  body: string;
  attachment_url: string | null;
  created_at: string | null;
};

export type ScanLiveStatsPayload = {
  event_id: number;
  stats: {
    ok: number;
    duplicate: number;
    invalid: number;
    expired: number;
    wrong_event: number;
    total: number;
    last_scan_at?: string | null;
    active_scanners?: number;
  };
};

export type ScanBatchPayload = {
  event_id: number;
  count: number;
  items: Record<string, unknown>[];
};
