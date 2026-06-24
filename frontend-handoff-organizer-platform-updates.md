# Frontend handoff: Organizer platform updates

**Date:** 2026-06-22  
**Audience:** Organizer dashboard SPA  
**API base:** `https://<host>/api/v1/organizer`  
**Auth:** Sanctum token with `app:organizer`  
**Related:** [`frontend-handoff-organizer-event-editor-api.md`](frontend-handoff-organizer-event-editor-api.md), [`frontend-handoff-organizer-event-full-update.md`](frontend-handoff-organizer-event-full-update.md), [`frontend-handoff-api-localization.md`](frontend-handoff-api-localization.md)

---

## Summary

| Area | What changed | Frontend action |
|------|----------------|-----------------|
| Ticket sales window | New fields on event editor | Add sales start/end UI on PATCH |
| Field aliases | `windowStart` / `windowEnd` accepted | Map existing form fields to API |
| Buyer enforcement | Guests blocked outside sales window | No organizer change; main site handles errors |
| Notifications | Localized inbox | `Accept-Language` on `/notifications` |
| Localization | Validation/errors in AR/EN | Locale header on all organizer API calls |

---

## 1. Ticket sales window (new)

Separate **when tickets can be sold** from **when the event runs**.

| Concept | API fields | Example |
|---------|------------|---------|
| Event live period | `starts_at`, `ends_at` | Show starts Jul 1 18:00 |
| Ticket sales window | `ticket_sales_starts_at`, `ticket_sales_ends_at` | Sales Jun 21 – Jun 29 |

**Migration required on API host:** `php artisan migrate` (adds columns to `events`).

### PATCH event

**Endpoint:** `PATCH /api/v1/organizer/events/{id}`

**Canonical JSON:**

```json
{
  "ticket_sales_starts_at": "2026-06-21",
  "ticket_sales_ends_at": "2026-06-29"
}
```

**Aliases (same request):**

| Alias | Maps to |
|-------|---------|
| `windowStart` | `ticket_sales_starts_at` |
| `windowEnd` | `ticket_sales_ends_at` |
| `window_start` | `ticket_sales_starts_at` |
| `window_end` | `ticket_sales_ends_at` |

Validation:

- Both dates must be sent together (`required_with`).
- `ticket_sales_ends_at` must be after `ticket_sales_starts_at`.
- ISO date or datetime strings accepted.

**GET event response** includes the same fields on `data`:

```json
{
  "data": {
    "starts_at": "2026-07-01T18:00:00.000000Z",
    "ends_at": "2026-07-01T22:00:00.000000Z",
    "ticket_sales_starts_at": "2026-06-21T00:00:00.000000Z",
    "ticket_sales_ends_at": "2026-06-29T00:00:00.000000Z"
  }
}
```

### UI guidance

1. Add a **“Ticket sales period”** section distinct from **“Event date & time”**.
2. Pre-sales: sales window can start **before** `starts_at`.
3. If sales end date omitted server-side, API falls back to `ends_at` for purchase cutoff — still set both in the editor for clarity.
4. Organizers/admins bypass purchase guards (for testing); guests on main site are enforced.

### Not the recurrence endpoint

`weekdays` + window fields on **`POST …/events/{id}/recurrence`** are for **recurring occurrence generation**, not ticket sales. Use event PATCH for sales windows.

---

## 2. Guest-facing errors (for support copy)

When buyers hit limits on main site:

| Message (EN) | When |
|--------------|------|
| Ticket sales have not started yet for this event. | Before `ticket_sales_starts_at` |
| Ticket sales have ended for this event. | After `ticket_sales_ends_at` (or `ends_at` fallback) |
| Ticket sales are not available for this event. | Status not `published` / `sold_out` |

Arabic equivalents returned with `Accept-Language: ar`.

---

## 3. Notifications

**Base:** `/api/v1/organizer/notifications` (organizer token)

| Method | Path |
|--------|------|
| `GET` | `/notifications` |
| `PATCH` | `/notifications/{id}/read` |
| `POST` | `/notifications/read-all` |

Send `Accept-Language` — organizer event notifications (`approved`, `rejected`, `featured`, etc.) re-localize from keys in `data`.

Realtime: `private-user.{userId}` / `notification.created` — refetch inbox on locale change if needed.

---

## 4. Localization

```http
Accept-Language: ar
```

Applies to: venue PATCH validation, event editor validation, upload errors, notification inbox.

Public reference (no organizer token):

- `GET /api/v1/reference/saudi-regions`
- `GET /api/v1/reference/saudi-cities?region_id=`

---

## QA checklist

- [ ] Event editor saves `windowStart` / `windowEnd` and GET returns `ticket_sales_*`
- [ ] Sales window shown separately from event start/end in UI
- [ ] Main site buyer blocked outside window (manual test with guest account)
- [ ] Organizer notifications respect Arabic UI
