# Backend Handoff: Single Endpoint for Attendance Analytics Page

## Goal

Power the entire `AttendancePage` with **one API endpoint** instead of multiple frontend calls and client-side joins.

Current frontend flow does:
- `GET /api/v1/organizer/events` (for filter dropdown + sold totals)
- `GET /api/v1/organizer/events/{id}/scan-logs` or equivalent scanner logs source
- client-side filtering by `eventId`
- client-side calculations for:
  - sold
  - successful scans
  - attendance rate
  - no-show estimate
  - recent logs list

---

## Proposed Endpoint

`GET /api/v1/organizer/analytics/attendance`

Auth:
- `Authorization: Bearer <organizer_token>`
- Organizer app scope/guard
- Data must be restricted to events owned by authenticated organizer

---

## Query Params

All optional:

- `event_id` (string/integer event id; if omitted => all organizer events)
- `from` (ISO datetime or `YYYY-MM-DD`)
- `to` (ISO datetime or `YYYY-MM-DD`)
- `timezone` (default `Asia/Riyadh`)
- `limit_recent` (default `30`, max `200`)

Behavior:
- When `event_id` is set, aggregate only that event.
- When not set, aggregate across all organizer events in range.

---

## Response Contract

```json
{
  "data": {
    "summary": {
      "sold": 0,
      "scans_ok": 0,
      "scans_duplicate": 0,
      "scans_invalid": 0,
      "attendance_rate": 0,
      "no_show_estimate": 0
    },
    "recent_logs": [
      {
        "id": "log_123",
        "event_id": "15",
        "event_title": "Test Event",
        "scanner_id": "7",
        "scanner_name": "Gate A Scanner",
        "ticket_ref": "TKT-ABC-1001",
        "result": "ok",
        "at": "2026-05-13T10:20:00+03:00"
      }
    ],
    "filters": {
      "events": [
        { "id": "15", "title": "Test Event" },
        { "id": "14", "title": "Untitled event" }
      ]
    }
  },
  "meta": {
    "event_id": "15",
    "from": "2026-05-01",
    "to": "2026-05-31",
    "timezone": "Asia/Riyadh",
    "generated_at": "2026-05-13T10:50:00+03:00"
  }
}
```

---

## Field Definitions and Logic

### `summary.sold`
- Total sold tickets for selected scope.
- Source: event-level sold metric (currently mapped from `tickets_sold`) summed across filtered events.

### `summary.scans_ok`
- Count of scan logs where `result = "ok"` within selected scope/range.

### `summary.scans_duplicate`
- Count where `result = "duplicate"`.

### `summary.scans_invalid`
- Count where `result = "invalid"`.

### `summary.attendance_rate`
- Percentage number (0-100), rounded to one decimal.
- Formula:
  - if `sold > 0`: `(scans_ok / sold) * 100`
  - else: `0`

### `summary.no_show_estimate`
- Formula: `max(sold - scans_ok, 0)`

### `recent_logs[]`
- Sorted descending by `at` (latest first), limited by `limit_recent`.
- Must include fields used by UI today (`ticket_ref`, `result`, `at`) and useful context (`event_title`, scanner metadata).

### `filters.events[]`
- Event list for dropdown filter in the same response so frontend does not call `listEvents` separately.
- Minimal shape: `id`, `title`.

---

## UI Data Coverage (Attendance Page)

This one response must provide data for:

1. **Event filter dropdown**
   - `filters.events[]`
2. **KPI cards**
   - `summary.sold`
   - `summary.scans_ok`
   - `summary.attendance_rate`
3. **No-show card**
   - `summary.no_show_estimate`
4. **Recent scan logs list**
   - `recent_logs[]`

---

## Performance Requirements

- Avoid frontend fanout requests.
- One query path should return complete payload.
- Suggested targets:
  - p50 < 250ms
  - p95 < 800ms
- Add/verify indexes on:
  - `events.organizer_id`
  - scan logs `event_id`
  - scan logs timestamp (`at`/`created_at`)
  - scan logs `result`

---

## Validation and Errors

Validation examples:
- invalid `event_id` not owned by organizer => `403` or `404` (per API policy)
- bad `from/to` => `422`

Error envelope (consistent with organizer API):

```json
{
  "message": "Validation failed.",
  "errors": {
    "from": ["The from date is invalid."]
  }
}
```

Status codes:
- `200` success
- `401` unauthenticated
- `403` forbidden
- `404` unknown event (if using strict lookup)
- `422` invalid params
- `500` server error

---

## Frontend Migration Plan

When backend endpoint is ready:

1. Add RTK query endpoint: `getAttendanceAnalytics`.
2. Replace current page data fetch:
   - remove `listEvents()` call from attendance page load/filter
   - remove `getAttendanceByEvent()` local aggregator usage
3. Render directly from endpoint payload:
   - `data.summary`
   - `data.recent_logs`
   - `data.filters.events`

---

## Acceptance Checklist

- [ ] Attendance page uses one backend API request per load/filter change.
- [ ] No additional events/log calls needed for that page.
- [ ] `sold`, `scans_ok`, `attendance_rate`, `no_show_estimate` are server-calculated.
- [ ] Recent logs and event filter options returned in same payload.
- [ ] Organizer isolation verified.
