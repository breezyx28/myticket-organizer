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
