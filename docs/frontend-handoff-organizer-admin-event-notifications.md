# Frontend handoff: organizer notifications for admin event actions

When an **admin** approves, rejects, features, or otherwise moderates an event, the API now creates an **in-app notification** for the **organizer user account** tied to that event’s `organizer_profiles` row.

This document is for the **organizer dashboard** (and any shared notification UI). Admin panel behavior is unchanged from the client’s perspective except that organizers will start receiving rows in `notifications`.

**Base paths**

| App | Prefix | Auth |
|-----|--------|------|
| Admin (triggers only) | `/api/v1/admin` | `Authorization: Bearer <admin_token>`, scope `admin_dashboard` |
| Organizer inbox (read today) | `/api/v1/main` | `Authorization: Bearer <main_token>`, scope `main_website` |
| Organizer API | `/api/v1/organizer` | No `/me/notifications` yet — see §5 |

---

## 1. What changed (backend)

No new admin request/response fields. After these admin calls **succeed**, the server writes one notification for the event owner’s `users.id`:

| Admin action | Method & path |
|--------------|----------------|
| Approve | `POST /api/v1/admin/events/{id}/approve` |
| Reject | `POST /api/v1/admin/events/{id}/reject` — body: `{ "reason": "…" }` (required, max 1000 chars) |
| Feature | `POST /api/v1/admin/events/{id}/feature` |
| Unfeature | `POST /api/v1/admin/events/{id}/unfeature` |
| Pin (featured desk) | `POST /api/v1/admin/featured-events/{eventId}/pin` |
| Unpin | `POST /api/v1/admin/featured-events/{eventId}/unpin` |

Organizer-initiated actions (`submit`, `update`, `cancel`, etc.) do **not** create these notifications.

**Delivery:** in-app (`notifications` table) only. Email is **not** sent for these rows (unlike buyer `event_edited` / `event_cancelled` mail).

---

## 2. Notification record shape

Stored like other user notifications. Use **`data.admin_action`** to distinguish admin event updates from other `kind: "general"` messages.

| Field | Value |
|-------|--------|
| `kind` | `"general"` |
| `title` | Fixed per action (see table below) |
| `body` | Human-readable sentence; reject includes admin reason in body text |
| `href` | `"/events/{eventId}"` — **organizer-relative path**; map to your router (e.g. `/organizer/events/{eventId}`) |
| `related_entity_type` | `"event"` |
| `related_entity_id` | Event numeric id |
| `is_read` | `false` until marked read |
| `data` | JSON object — see below |

### `data` object

```json
{
  "admin_action": "approved",
  "event_id": 42,
  "event_code": "EVT-00000042",
  "status": "published",
  "rejection_reason": "Optional; only when admin_action is rejected"
}
```

### `admin_action` values

| `admin_action` | When fired | Example `title` | `data.status` (typical) |
|----------------|------------|-----------------|-------------------------|
| `approved` | Admin approve | Event approved | `published` |
| `rejected` | Admin reject | Event rejected | `rejected` |
| `featured` | Admin feature | Event featured | `published` (or current status) |
| `unfeatured` | Admin unfeature | Event unfeatured | current status |
| `pinned` | Featured desk pin | Event pinned | current status |
| `unpinned` | Featured desk unpin | Event unpinned | current status |

**Reject copy:** `body` and `data.rejection_reason` both carry the reason submitted on `POST .../reject`.

---

## 3. Reading notifications (organizer today)

Notifications are keyed by **`users.id`** (the organizer login), not `organizer_profiles.id`.

### Option A — Main API (works now if you have a main-scoped token)

Same endpoints as the public site account inbox:

```http
GET    /api/v1/main/me/notifications
PATCH  /api/v1/main/me/notifications/{id}/read
POST   /api/v1/main/me/notifications/read-all
GET    /api/v1/main/me/notifications/preferences
PATCH  /api/v1/main/me/notifications/preferences
```

**List response (paginated Laravel shape):**

```json
{
  "current_page": 1,
  "data": [
    {
      "id": 101,
      "user_id": 7,
      "kind": "general",
      "title": "Event approved",
      "body": "\"Summer Fest\" has been approved and is now published.",
      "href": "/events/42",
      "data": {
        "admin_action": "approved",
        "event_id": 42,
        "event_code": "EVT-00000042",
        "status": "published"
      },
      "related_entity_type": "event",
      "related_entity_id": 42,
      "is_read": false,
      "read_at": null,
      "archived_at": null,
      "created_at": "2026-05-16T12:00:00.000000Z"
    }
  ],
  "unread_count": 3
}
```

Query `?since=<ISO8601>` for incremental polling (same as main app).

**Important:** Organizer dashboard tokens use scope `organizer_dashboard`. Those tokens **cannot** call `/api/v1/main/me/notifications` (403 app scope). Until an organizer-scoped inbox exists, you need either:

- a dedicated organizer notifications API (backend follow-up), or  
- a dual-token / main login path for the same user email (not ideal).

### Option B — Organizer API

**Not implemented yet.** There is no `GET /api/v1/organizer/me/notifications`. Plan organizer bell UI against Option A only if product accepts main token, or block on backend adding organizer routes mirroring main.

---

## 4. UI recommendations

### Bell / list filtering

```ts
function isAdminEventNotification(n: Notification): boolean {
  return n.kind === 'general' && typeof n.data?.admin_action === 'string';
}
```

Group or badge by `data.admin_action` if you want separate icons (check, X, star, pin).

### Navigation on click

Prefer **`data.event_id`** (or `related_entity_id`) over parsing `href`:

```ts
router.push(`/organizer/events/${notification.data.event_id}`);
```

After approve, deep-link to published event detail; after reject, detail/edit so they can fix and resubmit.

### Copy

You can render server `title` + `body` as-is, or map `admin_action` to localized strings and use `body` as subtitle.

### Admin panel

No change required. Admins still use existing moderation endpoints; they do not receive these rows (organizer-only).

Symmetric behavior already exists the other way: when organizers create/update events, admins get `kind: "event_review_required"` (admin inbox / `GET /api/v1/admin/notifications/recent` is platform-wide, not personal).

---

## 5. TypeScript types (suggested)

```ts
export type AdminEventNotificationAction =
  | 'approved'
  | 'rejected'
  | 'featured'
  | 'unfeatured'
  | 'pinned'
  | 'unpinned';

export interface AdminEventNotificationData {
  admin_action: AdminEventNotificationAction;
  event_id: number;
  event_code: string;
  status: string;
  rejection_reason?: string;
}

export interface NotificationRow {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  data: AdminEventNotificationData | Record<string, unknown> | null;
  related_entity_type: string | null;
  related_entity_id: number | null;
  is_read: boolean;
  created_at: string;
}
```

---

## 6. Testing checklist

1. Organizer user with profile; event in `pending_approval`.
2. Admin approves → organizer `GET /api/v1/main/me/notifications` (main token) shows one unread, `data.admin_action === "approved"`.
3. New event → admin rejects with reason → `rejection_reason` in `data`, reason visible in `body`.
4. Published event → admin feature → `admin_action === "featured"`.
5. Organizer token alone: confirm whether your app can read inbox; if not, track organizer `/me/notifications` backend task.

---

## 7. Related backend files

| File | Role |
|------|------|
| `app/Domains/Events/Services/OrganizerAdminEventNotifier.php` | Copy + `dispatchToUser` |
| `app/Http/Controllers/Api/V1/Admin/Events/AdminEventsController.php` | approve / reject / feature / unfeature hooks |
| `app/Domains/Admin/Services/AdminModerationService.php` | pin / unpin hooks |
| `tests/Feature/Notifications/AdminEventOrganizerNotificationsTest.php` | Approve / reject / feature coverage |

---

## 8. Out of scope (current release)

- Email for approve/reject/feature  
- New `kind` enum values (`event_approved`, etc.) — use `general` + `data.admin_action`  
- `GET /api/v1/organizer/me/notifications` — request from backend if organizer-only token is required
