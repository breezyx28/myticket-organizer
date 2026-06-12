# Organizer chat realtime — backend verification checklist

**Date:** 2026-06-13  
**Audience:** Backend + frontend (organizer app)  
**Context:** Organizer Engagements thread should receive `.message.sent` over Reverb and show optimistic sends in the UI.

The organizer frontend now:

1. Connects Laravel Echo on login (`RealtimeProvider` → `connectEcho`).
2. Subscribes to `private-user.{userId}` for inbox hints (`.message.sent`, notifications, engagement status).
3. Subscribes to `private-conversation.{conversationId}` while a thread is open.
4. Forwards inbox socket events into the open thread via an in-app message bus (fallback if conversation channel auth fails).
5. Sends messages with **optimistic UI** (message appears immediately; errors show beside the bubble with Retry).

If realtime still does not work after a frontend rebuild, verify the items below on the API.

---

## 1. Reverb must be running

| Check | Expected |
|-------|----------|
| `BROADCAST_CONNECTION` | `reverb` (not `log` or `null`) |
| Reverb process | `supervisorctl status myticket-api-reverb` → RUNNING |
| Browser WebSocket | DevTools → Network → WS → `wss://myticket-api.kat-jr.com/app/{REVERB_APP_KEY}` connects |

After `.env` changes:

```bash
php artisan config:clear && php artisan config:cache
sudo supervisorctl restart myticket-api-reverb
```

---

## 2. Broadcasting auth for organizer tokens

Organizer SPA authenticates channels with:

```http
POST https://myticket-api.kat-jr.com/broadcasting/auth
Authorization: Bearer {organizer_sanctum_token}
Content-Type: application/json

{"socket_id":"…","channel_name":"private-user.{id}"}
```

| Check | Expected |
|-------|----------|
| Organizer login ability | Token includes `app:organizer` |
| `/broadcasting/auth` | **200** with auth signature (not 401/403) |
| CORS | `https://myticket-organizer.kat-jr.com` allowed for API + broadcasting routes |
| `FRONTEND_ORGANIZER_URL` | Set in API `.env` |

Common failures:

- **403 on `private-user.{id}`** — channel policy does not recognize organizer user id.
- **403 on `private-conversation.{id}`** — organizer is not registered as a conversation participant in the channel authorization callback.

---

## 3. Events emitted when a message is created

When `POST /api/v1/organizer/me/conversations/{id}/messages` succeeds, the API should broadcast **`MessageSent`** (or equivalent) to:

| Channel | Event name (Echo listener) |
|---------|----------------------------|
| `private-conversation.{conversationId}` | `.message.sent` |
| `private-user.{organizerUserId}` | `.message.sent` |
| `private-user.{talentOrVendorUserId}` | `.message.sent` |

Payload shape expected by the organizer app:

```json
{
  "type": "message.sent",
  "payload": {
    "id": 123,
    "conversation_id": 42,
    "sender_user_id": 10,
    "sender_role": "organizer",
    "body": "Hello",
    "attachment_url": null,
    "created_at": "2026-06-13T12:00:00Z"
  },
  "occurred_at": "2026-06-13T12:00:00Z"
}
```

If the backend sends a **flat** payload (no `payload` wrapper), the frontend must be updated to match — currently it expects the envelope above (see `src/lib/realtime/types.ts`).

---

## 4. Organizer frontend env (build-time)

Each production build needs:

```env
VITE_API_URL=https://myticket-api.kat-jr.com
VITE_REVERB_APP_KEY=fysuwmddunkddyla1das
VITE_REVERB_HOST=myticket-api.kat-jr.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Missing `VITE_REVERB_*` → Echo never connects; REST send still works but no live receive.

---

## 5. Manual test script

1. **Organizer A** — open `/engagements/{conversationId}`, confirm WS connected in DevTools.
2. **Talent/vendor B** — send `POST /api/v1/main/me/conversations/{id}/messages` (or use talent/vendor app).
3. **Organizer A** — message appears **without refresh** (conversation channel or user channel).
4. **Organizer A** — type and Enter → message shows instantly; on API error, red bubble + “Retry”.
5. Logout organizer → Echo disconnects.

---

## 6. Known frontend fixes applied (2026-06-13)

| Issue | Fix |
|-------|-----|
| Conversation socket never subscribed | Child thread mounted before Echo connected; added `whenEchoReady()` queue |
| Incoming only on REST | User-channel `.message.sent` now forwarded to open thread via message bus |
| Send felt laggy | Optimistic append on Enter/Send; error beside bubble like WhatsApp |

---

## 7. If still broken — capture for backend ticket

Please provide:

1. Response status/body of `POST /broadcasting/auth` for `private-conversation.{id}`.
2. Whether Reverb logs show broadcast when a message is POSTed.
3. Sample actual WebSocket frame for `.message.sent` (redact tokens).
4. `routes/channels.php` rules for `conversation.{id}` and `user.{id}`.

Reference: [`frontend-realtime-integration-guide.md`](frontend-realtime-integration-guide.md)
