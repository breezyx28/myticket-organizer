# Chat API — per-frontend reference

**Date:** 2026-06-13  
**Audience:** Main, organizer, talent, and vendor React SPAs  
**Realtime wiring:** [`frontend-realtime-integration-guide.md`](frontend-realtime-integration-guide.md)  
**Backend overview:** [`frontend-handoff-reverb-realtime-and-unified-chat.md`](frontend-handoff-reverb-realtime-and-unified-chat.md)

---

## Summary

| App | Production site | API prefix | Chat API | Token ability |
|-----|-----------------|------------|----------|---------------|
| **Main** | `https://myticket.kat-jr.com` | `/api/v1/main` | Full inbox + messaging | `app:main` |
| **Talent** | `https://myticket-talent.kat-jr.com` | `/api/v1/main` | Inbox + reply (no create) | `app:main` |
| **Vendor** | `https://myticket-vendor.kat-jr.com` | `/api/v1/main` | Inbox + reply (no create) | `app:main` |
| **Organizer** | `https://myticket-organizer.kat-jr.com` | `/api/v1/organizer` | Full inbox + **start threads** | `app:organizer` |
| **Admin** | `https://myticket-admin.kat-jr.com` | — | **No chat API** | — |
| **Scanner** | `https://myticket-scanner.kat-jr.com` | — | **No chat API** | — |

**API base:** `https://myticket-api.kat-jr.com`

All chat endpoints require:

```
Authorization: Bearer <sanctum_token>
Accept: application/json
Content-Type: application/json   # for POST/PATCH bodies
```

---

## 1. Concepts

### Unified conversations

Hiring chat is modeled as **conversations**. Each new organizer outreach creates:

1. An **engagement** (`pending` → `accepted` / `declined` / `closed`)
2. A linked **conversation** (`context_type: "engagement"`, `context_id: <engagement_id>`)

Both organizer and talent/vendor are **participants**. Use the conversations API for inbox UI and message threads. Legacy `/me/engagements` routes still work but new UI should prefer conversations.

### Conversation types

| `type` | Meaning |
|--------|---------|
| `marketplace` | Hiring thread (organizer ↔ talent or vendor) |

### Conversation status

| `status` | Meaning |
|----------|---------|
| `open` | Active thread (`pending` or `accepted` engagement) |
| `closed` | Engagement declined, cancelled, or closed |

### Participant roles

| `role` | Who |
|--------|-----|
| `organizer` | Event organizer who started the thread |
| `talent` | Talent profile owner |
| `vendor` | Vendor profile owner |

### Realtime (optional but recommended)

After sending or receiving via REST, listen for `.message.sent` on:

- `private-conversation.{conversationId}` (when viewing a thread)
- `private-user.{userId}` (inbox badge / toast)

Payload matches the **message object** in §4. Always reconcile with `GET .../messages` — WebSocket is a hint.

---

## 2. Endpoint matrix

Paths below are relative to each app’s prefix.

| Method | Path | Main / talent / vendor | Organizer |
|--------|------|------------------------|-----------|
| GET | `/me/conversations/unread-count` | Yes | Yes |
| GET | `/me/conversations` | Yes | Yes |
| POST | `/me/conversations` | Yes* | Yes |
| GET | `/me/conversations/{id}` | Yes | Yes |
| GET | `/me/conversations/{id}/messages` | Yes | Yes |
| POST | `/me/conversations/{id}/messages` | Yes | Yes |
| POST | `/me/conversations/{id}/read` | Yes | Yes |

\*Main website can call `POST /me/conversations` when the logged-in user is an organizer (same body as organizer app). Talent/vendor should **not** start threads.

### Full URLs

| App | Prefix |
|-----|--------|
| Main / talent / vendor | `https://myticket-api.kat-jr.com/api/v1/main` |
| Organizer | `https://myticket-api.kat-jr.com/api/v1/organizer` |

**Examples**

- Main inbox: `GET https://myticket-api.kat-jr.com/api/v1/main/me/conversations`
- Organizer send: `POST https://myticket-api.kat-jr.com/api/v1/organizer/me/conversations/7/messages`

---

## 3. Shared response shapes

### 3.1 Conversation object

Returned in inbox rows, `show`, and `store` responses (`data` wrapper on single resources).

```json
{
  "id": 7,
  "type": "marketplace",
  "subject": "Wedding singer",
  "status": "open",
  "context_type": "engagement",
  "context_id": 15,
  "metadata": {
    "target_type": "talent",
    "target_id": 12,
    "brief": "Need a singer for June 20",
    "event_id": 5
  },
  "last_message_at": "2026-06-13T14:30:00+00:00",
  "created_at": "2026-06-13T12:00:00+00:00",
  "updated_at": "2026-06-13T14:30:00+00:00",
  "participants": [
    {
      "id": 10,
      "user_id": 3,
      "role": "organizer",
      "last_read_at": "2026-06-13T14:00:00+00:00",
      "notifications_muted": false,
      "user": {
        "id": 3,
        "full_name": "Jane Organizer",
        "email": "jane@example.com"
      }
    },
    {
      "id": 11,
      "user_id": 42,
      "role": "talent",
      "last_read_at": null,
      "notifications_muted": false,
      "user": {
        "id": 42,
        "full_name": "Alex Talent",
        "email": "alex@example.com"
      }
    }
  ],
  "unread": true
}
```

| Field | Notes |
|-------|-------|
| `subject` | Same as engagement `topic` |
| `context_type` / `context_id` | Link to engagement when hiring-related |
| `metadata.target_type` | `talent` or `vendor` |
| `metadata.target_id` | **Profile** id (`talent_profiles.id` or `vendor_profiles.id`), not user id |
| `metadata.event_id` | Optional related event |
| `unread` | `true` if another participant sent messages after viewer’s `last_read_at` |

### 3.2 Message object

```json
{
  "id": 44,
  "conversation_id": 7,
  "sender_user_id": 3,
  "sender_role": "organizer",
  "body": "What is your rate for 2 hours?",
  "attachment_url": null,
  "read_at": null,
  "created_at": "2026-06-13T14:30:00+00:00"
}
```

| Field | Notes |
|-------|-------|
| `sender_role` | `organizer`, `talent`, or `vendor` |
| `attachment_url` | Optional URL from upload flow (max 500 chars) |
| `read_at` | Set when recipient calls mark-read |

### 3.3 Paginated inbox

`GET /me/conversations` returns Laravel pagination:

```json
{
  "current_page": 1,
  "data": [
    { }
  ],
  "first_page_url": "https://myticket-api.kat-jr.com/api/v1/main/me/conversations?page=1",
  "from": 1,
  "last_page": 1,
  "last_page_url": "https://myticket-api.kat-jr.com/api/v1/main/me/conversations?page=1",
  "links": [ ],
  "next_page_url": null,
  "path": "https://myticket-api.kat-jr.com/api/v1/main/me/conversations",
  "per_page": 20,
  "prev_page_url": null,
  "to": 1,
  "total": 1
}
```

Each item in `data` is a **conversation object** (§3.1).

### 3.4 Message list

`GET /me/conversations/{id}/messages` returns:

```json
{
  "data": [
    { }
  ]
}
```

Messages are ordered **oldest → newest** in the array (after server-side cursor fetch).

### 3.5 Errors

| Status | When |
|--------|------|
| `401` | Missing or invalid token |
| `403` | Not a participant in the conversation |
| `404` | Unknown conversation / profile id |
| `422` | Validation failed or invalid engagement link |

**Validation `422` example:**

```json
{
  "message": "The body field is required.",
  "errors": {
    "body": ["The body field is required."]
  }
}
```

**Forbidden participant `403`:**

```json
{
  "message": "You are not a participant in this conversation."
}
```

---

## 4. Endpoints (detailed)

### 4.1 Unread badge

```
GET /me/conversations/unread-count
```

**Response `200`**

```json
{
  "unread_count": 3
}
```

Counts conversations where another user sent messages after the viewer’s `last_read_at` (or viewer never read).

---

### 4.2 Inbox

```
GET /me/conversations
```

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | `1` | Page number |
| `per_page` | int | `20` | `1`–`50` |
| `type` | string | — | Filter e.g. `marketplace` |
| `unread_only` | bool | `false` | `1` or `true` for unread threads only |

**Response `200`:** Paginated inbox (§3.3).

**Example — talent dashboard unread filter:**

```
GET https://myticket-api.kat-jr.com/api/v1/main/me/conversations?unread_only=1&per_page=20
```

---

### 4.3 Start conversation (organizer only)

Creates engagement + conversation. Use from **organizer app** (or main site when user is organizer).

```
POST /me/conversations
```

**Request body**

```json
{
  "target_type": "talent",
  "target_id": 12,
  "topic": "Wedding singer",
  "brief": "Need a singer for June 20",
  "event_id": 5
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `target_type` | yes | `talent` or `vendor` |
| `target_id` | yes | Integer **profile** id (`talent_profiles.id` or `vendor_profiles.id`) |
| `topic` | no | Max 255 chars — becomes conversation `subject` |
| `brief` | no | Max 2000 chars — stored in `metadata.brief` |
| `event_id` | no | Integer event id |

**Response `201`**

```json
{
  "data": {
    "id": 7,
    "type": "marketplace",
    "subject": "Wedding singer",
    "status": "open",
    "context_type": "engagement",
    "context_id": 15,
    "metadata": {
      "target_type": "talent",
      "target_id": 12,
      "brief": "Need a singer for June 20",
      "event_id": 5
    },
    "participants": [ ],
    "unread": false
  }
}
```

**Side effects**

- Engagement created with `status: "pending"`
- Talent/vendor receives notification (check notifications API)
- No initial message — send separately with §4.6

**Organizer example**

```bash
curl -s -X POST https://myticket-api.kat-jr.com/api/v1/organizer/me/conversations \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "target_type": "talent",
    "target_id": 12,
    "topic": "Festival gig",
    "brief": "Need a singer for 2 hours"
  }'
```

---

### 4.4 Thread detail

```
GET /me/conversations/{id}
```

**Response `200`**

```json
{
  "data": { }
}
```

Single conversation object (§3.1) including participants.

Use after `.engagement.status_changed` or when opening a thread to refresh `status` / engagement link.

---

### 4.5 Message history

```
GET /me/conversations/{id}/messages
```

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | `50` | `1`–`100` messages per request |
| `before_id` | int | — | Cursor: load messages with `id < before_id` (older page) |

**Response `200`**

```json
{
  "data": [
    {
      "id": 40,
      "conversation_id": 7,
      "sender_user_id": 3,
      "sender_role": "organizer",
      "body": "Hi, are you available June 20?",
      "attachment_url": null,
      "read_at": null,
      "created_at": "2026-06-13T12:05:00+00:00"
    },
    {
      "id": 44,
      "conversation_id": 7,
      "sender_user_id": 42,
      "sender_role": "talent",
      "body": "Yes, what time?",
      "attachment_url": null,
      "read_at": null,
      "created_at": "2026-06-13T14:30:00+00:00"
    }
  ]
}
```

**Pagination pattern:** On scroll-up, pass `before_id` of the oldest loaded message.

```
GET .../me/conversations/7/messages?before_id=40&limit=50
```

---

### 4.6 Send message

```
POST /me/conversations/{id}/messages
```

**Request body**

```json
{
  "body": "What is your rate for 2 hours?",
  "attachment_url": "https://myticket-api.kat-jr.com/storage/uploads/example.pdf"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `body` | yes | Max 5000 chars |
| `attachment_url` | no | Max 500 chars |

**Response `201`**

```json
{
  "data": {
    "id": 45,
    "conversation_id": 7,
    "sender_user_id": 3,
    "sender_role": "organizer",
    "body": "What is your rate for 2 hours?",
    "attachment_url": null,
    "read_at": null,
    "created_at": "2026-06-13T15:00:00+00:00"
  }
}
```

**Side effects**

- Updates `last_message_at` on conversation
- Broadcasts `.message.sent` to conversation channel + all participants’ user channels
- For engagement-linked threads, message is mirrored to legacy `engagement_messages`

**Who can send:** Any participant (organizer, talent, or vendor) in that conversation.

---

### 4.7 Mark as read

```
POST /me/conversations/{id}/read
```

**Request body (optional)**

```json
{
  "up_to_message_id": 44
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `up_to_message_id` | no | Mark messages from others with `id <=` this value as read |

Empty body marks all messages from other participants as read.

**Response `200`**

```json
{
  "message": "Marked as read"
}
```

Call when the user opens a thread or scrolls to latest message. Refresh unread badge via §4.1 or invalidate local state.

---

## 5. Per-app usage

### 5.1 Main website (`myticket.kat-jr.com`)

**Login**

```
POST https://myticket-api.kat-jr.com/api/v1/main/auth/login
```

**Typical flows**

| User | Flow |
|------|------|
| Organizer on main | Start chat from talent/vendor profile → `POST /me/conversations` → navigate to thread |
| Any participant | Inbox → `GET /me/conversations` → open thread → `GET .../messages` → `POST .../read` |
| Messaging | `POST .../messages` + subscribe to `.message.sent` |

**Nav badge:** `GET /me/conversations/unread-count`

---

### 5.2 Talent dashboard (`myticket-talent.kat-jr.com`)

Uses **main API** with talent user token (`app:main`).

| Action | Endpoint |
|--------|----------|
| Inbox | `GET /api/v1/main/me/conversations` |
| Unread badge | `GET /api/v1/main/me/conversations/unread-count` |
| Reply | `POST /api/v1/main/me/conversations/{id}/messages` |
| Mark read | `POST /api/v1/main/me/conversations/{id}/read` |

**Do not** call `POST /me/conversations` from talent UI — organizers start threads.

**Engagement actions** (accept/decline) remain on legacy API:

```
POST https://myticket-api.kat-jr.com/api/v1/main/me/engagements/{id}/accept
POST https://myticket-api.kat-jr.com/api/v1/main/me/engagements/{id}/decline
```

Decline body (optional):

```json
{
  "reason": "Not available that date"
}
```

After accept/decline, refresh thread: `GET /me/conversations/{id}` (`status` may become `closed`).

---

### 5.3 Vendor dashboard (`myticket-vendor.kat-jr.com`)

Same as talent (§5.2) — main API prefix, participant role `vendor`.

```
GET  https://myticket-api.kat-jr.com/api/v1/main/me/conversations
POST https://myticket-api.kat-jr.com/api/v1/main/me/conversations/{id}/messages
```

Engagement accept/decline: same paths as talent.

---

### 5.4 Organizer dashboard (`myticket-organizer.kat-jr.com`)

**Login**

```
POST https://myticket-api.kat-jr.com/api/v1/organizer/auth/login
```

Token ability: `app:organizer`.

| Action | Endpoint |
|--------|----------|
| Start hiring chat | `POST /api/v1/organizer/me/conversations` |
| Inbox | `GET /api/v1/organizer/me/conversations` |
| Send message | `POST /api/v1/organizer/me/conversations/{id}/messages` |
| Cancel engagement | `POST /api/v1/organizer/engagements/{id}/cancel` (legacy) |

**Start from talent/vendor discovery:** pass `target_id` from listing (`talent_profiles.id` / `vendor_profiles.id`).

**Optional:** link to event via `event_id` when starting from an event context.

---

### 5.5 Admin & scanner

No `/me/conversations` routes. Admin gov-ID queue uses separate admin APIs + `.government_id.status_changed` realtime — see [`frontend-realtime-integration-guide.md`](frontend-realtime-integration-guide.md).

---

## 6. UI integration patterns

### 6.1 Inbox screen

```text
1. GET /me/conversations/unread-count          → nav badge
2. GET /me/conversations?per_page=20           → list
3. On .message.sent (user channel)             → refetch unread-count + patch row or refetch list
4. Tap row → navigate to /chat/:id
```

### 6.2 Chat screen

```text
1. GET /me/conversations/{id}                  → header (subject, participants, status)
2. GET /me/conversations/{id}/messages         → initial history
3. POST /me/conversations/{id}/read            → clear unread
4. echo.private('conversation.{id}').listen('.message.sent', append)
5. On send → POST .../messages                   → optimistic UI optional; server returns canonical message
6. On unmount → leave conversation channel
```

### 6.3 Start chat (organizer)

```text
1. User on talent/vendor profile or event page
2. POST /me/conversations { target_type, target_id, topic, brief, event_id? }
3. Navigate to /chat/{data.id}
4. POST /me/conversations/{id}/messages { body: "..." }  → first message
```

### 6.4 Attachments

1. Upload file via app upload API (`POST /api/v1/main/uploads` or organizer equivalent).
2. Pass returned URL as `attachment_url` when sending message.

---

## 7. Legacy engagements API (migration)

Prefer conversations for new UI. These still work and stay in sync via the engagement adapter.

### Main / talent / vendor

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/main/me/engagements` | List engagements where user is target |
| POST | `/api/v1/main/me/engagements` | Create (organizer on main) |
| GET | `/api/v1/main/me/engagements/{id}/messages` | Legacy message list |
| POST | `/api/v1/main/me/engagements/{id}/messages` | Legacy send |
| POST | `/api/v1/main/me/engagements/{id}/accept` | Talent/vendor accept |
| POST | `/api/v1/main/me/engagements/{id}/decline` | Talent/vendor decline |
| POST | `/api/v1/main/me/engagements/{id}/complete` | Close engagement |

**Create on main (legacy)** — supports optional first message:

```json
{
  "target_type": "talent",
  "target_id": 12,
  "topic": "Wedding singer",
  "brief": "Need a singer",
  "initial_message": "Hi, are you free June 20?",
  "event_id": 5
}
```

### Organizer

| Method | Path |
|--------|------|
| GET | `/api/v1/organizer/engagements` |
| POST | `/api/v1/organizer/engagements` |
| POST | `/api/v1/organizer/engagements/{id}/messages` |
| POST | `/api/v1/organizer/engagements/{id}/cancel` |

**Organizer legacy create** requires `brief` (max 500 chars):

```json
{
  "target_type": "vendor",
  "target_id": 8,
  "topic": "Catering",
  "brief": "Buffet for 200 guests",
  "event_id": 5
}
```

---

## 8. Realtime event reference (chat)

Listen with Laravel Echo after login (see realtime guide).

| Echo event | Channel | Payload `type` |
|------------|---------|----------------|
| `.message.sent` | `private-conversation.{id}` | `message.sent` |
| `.message.sent` | `private-user.{userId}` | `message.sent` (inbox toast) |
| `.engagement.status_changed` | `private-user.{userId}` | `engagement.status_changed` |

**`.message.sent` envelope:**

```json
{
  "type": "message.sent",
  "payload": {
    "id": 45,
    "conversation_id": 7,
    "sender_user_id": 3,
    "sender_role": "organizer",
    "body": "What is your rate for 2 hours?",
    "attachment_url": null,
    "read_at": null,
    "created_at": "2026-06-13T15:00:00+00:00"
  },
  "occurred_at": "2026-06-13T15:00:00+00:00"
}
```

---

## 9. Quick test checklist

- [ ] Organizer: `POST .../organizer/me/conversations` → `201` with `data.id`
- [ ] Talent: `GET .../main/me/conversations` → thread appears with `unread: true`
- [ ] Talent: `POST .../main/me/conversations/{id}/messages` → `201`
- [ ] Organizer: receives `.message.sent` without refresh
- [ ] `GET .../unread-count` decreases after `POST .../read`
- [ ] `GET .../messages?before_id=` returns older page
- [ ] Non-participant gets `403` on thread access
- [ ] Invalid body gets `422` with `errors` object

---

## 10. Related docs

| Doc | Contents |
|-----|----------|
| [`frontend-realtime-integration-guide.md`](frontend-realtime-integration-guide.md) | Echo install, env vars, channel auth, test plan |
| [`frontend-handoff-reverb-realtime-and-unified-chat.md`](frontend-handoff-reverb-realtime-and-unified-chat.md) | Architecture, reconcile pattern, deployment |
| [`vendor-api-endpoints.md`](vendor-api-endpoints.md) | Full vendor dashboard API |
| [`frontend-handoff-talent-categories-updates.md`](frontend-handoff-talent-categories-updates.md) | Talent discovery (where “Message” CTA links from) |
