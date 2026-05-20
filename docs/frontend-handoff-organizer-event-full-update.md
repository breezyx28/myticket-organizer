# Frontend handoff: organizer full event update + seat linking

Unified **create/update** for the Event Details editor, including **coordinates**, all editor-safe event fields, and optional **seating** in one `PATCH`. Seats are always stored with `event_id` (FK); responses now expose that link clearly.

**Base:** `/api/v1/organizer`  
**Auth:** organizer dashboard token  

**See also:** [organizer event editor API](frontend-handoff-organizer-event-editor-api.md), [seat multi-select](frontend-handoff-organizer-seat-multi-select.md)

---

## 1. `PATCH /api/v1/organizer/events/{id}` — full scalar fields

Send only changed keys (delta PATCH). **Status** is still **not** accepted here — use `POST …/submit`, `…/cancel`, `…/archive`.

| Field | Validation | Notes |
|--------|------------|--------|
| `title` | sometimes, string ≤255 | required on `POST` create |
| `excerpt` | sometimes, nullable, ≤500 | |
| `description`, `organizer_notes` | sometimes, nullable, string | |
| `cover_image_url`, `video_url` | sometimes, nullable, url string ≤500 | or use cover/gallery upload routes |
| `venue_id` | sometimes, nullable, exists on **your** organizer venues | |
| `venue_name`, `venue_address` | sometimes, nullable | |
| `region_id`, `city_id`, `city` | sometimes, nullable | reference pickers |
| **`latitude`** | sometimes, nullable, -90…90 | |
| **`longitude`** | sometimes, nullable, -180…180 | |
| `starts_at`, `ends_at` | sometimes, date | ends after starts on create |
| `timezone` | sometimes, nullable, ≤64 | |
| `layout_type` | sometimes, `grid` \| `section` \| `free` | |
| `rows_count`, `cols_count` | sometimes, 0–100 | zeroed when `layout_type` is `free` |
| `row_gap`, `col_gap`, `row_gaps`, `col_gaps` | sometimes | |
| `capacity`, `price_min`, `price_max` | sometimes, nullable, numeric | |
| `purchase_limit_per_user`, `age_restriction` | sometimes, nullable, int | |
| `is_multi_day`, `multi_day_single_ticket` | sometimes, boolean | |
| `entry_mode` | sometimes, `one_time` \| `multi_scan` | |
| `show_talents`, `show_vendors`, `counts_for_overlap` | sometimes, boolean | |
| `category_id` | sometimes, nullable, exists | |

**Excluded:** `status`, `is_featured`, ticket counters, ratings, `code`, `organizer_id`.

---

## 2. Unified `seating` block (same request)

Optional object on **PATCH** (and **POST** create):

```json
{
  "latitude": 24.7136,
  "longitude": 46.6753,
  "layout_type": "grid",
  "rows_count": 8,
  "cols_count": 12,
  "seating": {
    "regenerate": true,
    "layout_type": "grid",
    "rows": 8,
    "cols": 12,
    "replace": true,
    "ticket_type_id": 5,
    "section": "VIP",
    "seat_updates": {
      "seat_ids": [101, 102, 103],
      "ticket_type_id": 5,
      "price_override": 199.5
    }
  }
}
```

| Key | Purpose |
|-----|---------|
| `seating.regenerate` | When `true`, runs seat map generation (same as `POST …/seats/bulk`) |
| `seating.replace` | Delete existing seats first (422 if any `booked` / `held`) |
| `seating.layout_type`, `rows`, `cols`, … | Passed to bulk create; updates `events.layout_type`, `rows_count`, `cols_count` |
| `seating.seat_updates` | Bulk assign ticket type / price to `seat_ids` (skips sold/held) |

**PATCH response** when `seating` is sent:

```json
{
  "data": { "...event with relations...", "seats": [ { "id": 1, "event_id": 18, ... } ] },
  "seating": {
    "regenerated": 96,
    "seat_updates": { "updated": 3, "skipped": [], "data": [ ... ] }
  }
}
```

---

## 3. `GET /api/v1/organizer/events/{id}`

Now includes **`seats`** (ordered by row/col) plus `ticketTypes`, `gallery`, etc.

Each seat row includes **`event_id`** — always equal to the parent event id.

---

## 4. Dedicated seat routes (still supported)

### Generate map

```http
POST /api/v1/organizer/events/{eventId}/seats/bulk
```

**201 response:**

```json
{
  "created": 96,
  "data": {
    "event_id": 18,
    "layout_type": "grid",
    "rows_count": 8,
    "cols_count": 12,
    "seat_count": 96,
    "seats": [ { "id": 1, "event_id": 18, "label": "A1", ... } ]
  }
}
```

`data.seats` is capped at **500** rows; use `GET …/seats` for full list on larger venues.

### Bulk price / ticket type

```http
PATCH /api/v1/organizer/events/{eventId}/seats/bulk-update
{ "seat_ids": [1,2,3], "ticket_type_id": 5, "price_override": 99 }
```

### Single seat

```http
PATCH /api/v1/organizer/events/{eventId}/seats/{seatId}
```

---

## 5. Recommended editor save flow

1. **Autosave / Save** — `PATCH` scalars (title, coords, layout_type, rows_count, cols_count, …).
2. **Regenerate map** (when grid size or layout mode changes) — same `PATCH` with `seating.regenerate` + `replace: true`, or `POST …/seats/bulk`.
3. **Multi-select bulk** — `PATCH` with `seating.seat_updates` or `PATCH …/seats/bulk-update`.
4. **Reload** — `GET …/events/{id}`; read `data.seats` and confirm every `event_id` matches event id.

---

## 6. QA checklist

1. PATCH `latitude` / `longitude` → GET returns same values.
2. PATCH `seating.regenerate` → `data.seats[].event_id === event.id`.
3. POST `…/seats/bulk` → `data.event_id` and seats array present.
4. `seating.seat_updates` on sold seat → listed in `skipped`, others update.
5. Status changes still only via submit/cancel/archive routes.

---

## 7. Backend reference

| File | Role |
|------|------|
| `app/Domains/Events/Support/OrganizerEventEditorRules.php` | Validation |
| `app/Domains/Events/Services/OrganizerEventEditorService.php` | Orchestration |
| `app/Domains/Seating/Services/SeatBulkUpdateService.php` | Bulk seat updates |
| `app/Http/Controllers/Api/V1/Organizer/Events/OrganizerEventController.php` | store / show / update |
| `tests/Feature/Organizer/OrganizerEventFullUpdateTest.php` | Feature tests |
