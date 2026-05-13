# Frontend handoff: organizer event editor ↔ API (May 2026)

This document answers **`docs/backend-organizer-event-editor-gaps.md`**: what the organizer SPA should call, what the API **actually** does today (after the May 2026 alignment pass), and where behavior still differs from an intuitive “draft → published” flow.

**Base path:** `https://<host>/api/v1/organizer`  
**Auth:** `Authorization: Bearer <token>` with `app:organizer` + valid organizer session (unchanged).

---

## 1. Critical: “Publish” vs backend lifecycle

| SPA assumption (gaps doc) | API reality |
|---------------------------|-------------|
| `POST …/events/{id}/submit` turns **draft → published** | `POST …/events/{id}/submit` sets status to **`pending_approval`** and `submitted_at` (see `EventLifecycleService::submit`). |
| Organizer immediately sees **`published`** | **`published`** is reached only after an **admin approval** path (`EventLifecycleService::approve` — not exposed on organizer routes in the default setup). |

**Enum values** on `events.status` (DB):  
`draft` → `pending_approval` → `published` | `rejected`  
→ `sold_out` → `in_progress` → `ended` → `archived`  
→ `cancelled` (from several states)

**Allowed transitions** are enforced in code by `App\Domains\Events\States\EventStatus::canTransitionTo()` (see `EventTransitionGuard`). Invalid transitions throw `DomainException` (often surfaced as **500** unless wrapped — treat as “not allowed”).

### What the SPA should do

1. After **Publish**, expect **`pending_approval`**, not `published`, unless product changes the backend to auto-publish for organizers.
2. UI copy: use **“Submit for review”** / **“Pending approval”** unless admins are removed from the loop and `submit()` is changed to go straight to `published`.
3. **Cancel** and **archive** still use dedicated routes (below).

---

## 2. `GET /api/v1/organizer/events/{id}` — editor payload

**Response:** `{ "data": <Event> }`

The controller **eager-loads** (for the editor):

- `gallery` — each row includes:
  - `id` (PK for `DELETE …/gallery/{itemId}`)
  - `image_url` — stored value (relative path for uploads under `event-gallery/`, or legacy absolute URL)
  - **`url`** — appended field: **absolute** `https://…` suitable for `<img src>` (same rules as `public` disk URL helper)
  - `kind`, `caption`, `position`, `created_at`
- `ticketTypes` — each row has numeric **`id`** (use for `PATCH|DELETE …/ticket-types/{ticketTypeId}`)
- `category` — nested category model when `category_id` is set (includes `id`, `name`, etc., per `EventCategory` columns)
- `occurrences`, `talents`, `vendors` (unchanged)

**Geography fields on `Event`:**

- `region_id`, `city_id` — integers, FKs to `saudi_regions` / `saudi_cities`
- **`city`** — optional **string label** (denormalized for display; persisted via `PATCH` / `store`). Requires DB migration adding column `events.city` (see `2026_05_12_000002_add_city_label_to_events_table.php`).

**Reference data** (for pickers):

- Categories: `GET /api/v1/main/events/categories` (public main API)
- Regions / cities: `GET /api/v1/reference/saudi-regions`, `GET /api/v1/reference/saudi-cities?region_id=`

---

## 3. `PATCH /api/v1/organizer/events/{id}` — accepted fields (delta OK)

Validated **snake_case** fields (only send keys that changed):

| Field | Validation | Notes |
|--------|------------|--------|
| `title` | sometimes, string, max 255 | |
| `excerpt` | sometimes, nullable, string, max 500 | |
| `description` | sometimes, nullable, string | |
| `starts_at` / `ends_at` | sometimes, date | |
| **`category_id`** | sometimes, nullable, integer, **exists:event_categories,id** | |
| **`region_id`** | sometimes, nullable, integer, **exists:saudi_regions,id** | |
| **`city_id`** | sometimes, nullable, integer, **exists:saudi_cities,id** | |
| **`city`** | sometimes, nullable, string, max 160 | Display name from picker (e.g. `"Riyadh"`). |
| `price_min` / `price_max` | sometimes, nullable, numeric | |

**Not accepted on PATCH** (still):

- **`status`** — do **not** rely on free-form `PATCH { status }` for lifecycle. Use the dedicated routes in §4.
- **`ticket_types`** nested array — **not** implemented; use **`POST|PATCH|DELETE …/events/{id}/ticket-types`** (§5).

---

## 4. Status — dedicated routes (use these)

| Intent | Method & path | Resulting status (when allowed) |
|--------|----------------|----------------------------------|
| Submit / “publish” from organizer | `POST /api/v1/organizer/events/{id}/submit` | **`pending_approval`** |
| Cancel | `POST /api/v1/organizer/events/{id}/cancel` | **`cancelled`** (+ `cancelled_at`, `cancelled_by`) |
| Archive | `POST /api/v1/organizer/events/{id}/archive` | **`archived`** (only from **`ended`** per `EventStatus`) |

**Examples of transitions the guard allows** (not exhaustive):

- `draft` → `pending_approval` (submit) or `cancelled`
- `rejected` → `pending_approval` (resubmit) or `cancelled`
- `published` → `sold_out`, `in_progress`, `cancelled`
- `ended` → `archived` only

If the SPA needs **`sold_out` / `in_progress` / `ended`** without dedicated endpoints, that still requires a **backend product decision** (new organizer endpoints or controlled `PATCH status` with validation). Not shipped in this pass.

---

## 5. Ticket types — canonical keys + SPA aliases

**Endpoints**

- `GET /api/v1/organizer/events/{id}/ticket-types`
- `POST /api/v1/organizer/events/{id}/ticket-types`
- `PATCH /api/v1/organizer/events/{id}/ticket-types/{ticketTypeId}`
- `DELETE /api/v1/organizer/events/{id}/ticket-types/{ticketTypeId}`

**Canonical JSON (validated)**

| Key | POST | PATCH |
|-----|------|-------|
| `name` | required, string ≤120 | sometimes |
| `description` | optional | sometimes |
| `price` | required, numeric ≥0 | sometimes |
| `quantity_limit` | optional int ≥1 | sometimes |
| `sort_position` | optional int ≥0 | sometimes |
| `is_active` | optional bool | sometimes |

**Aliases accepted** (merged server-side before validation):

- `default_price` → `price` (if `price` absent)
- `label` → `name` (if `name` absent)
- `title` → `name` (if `name` absent)

So the SPA may keep sending its superset; the API maps common aliases to the canonical keys.

---

## 6. Event gallery — multipart + JSON (dual mode)

**`POST /api/v1/organizer/events/{id}/gallery`**

| Mode | Body | Behavior |
|------|------|----------|
| **Multipart (SPA default)** | field **`image`** (one file, image, max ~6 MB); optional `caption`, `position` | File stored on **`public`** disk under **`event-gallery/`**; DB `image_url` holds the **relative** path; `GET` exposes **`url`** absolute. |
| **JSON (legacy)** | `kind`, `image_url` (URL), optional `caption`, `position` | Unchanged behavior for integrations that already upload elsewhere. |

**Success response:** **201** `{ "data": <Event> }` — full event with `gallery`, `category`, `ticketTypes`, `occurrences`, `talents`, `vendors` loaded (refresh editor from `data`).

**`DELETE /api/v1/organizer/events/{id}/gallery/{itemId}`**

- `itemId` = numeric **`id`** from `gallery[]`.
- If the row’s `image_url` is a relative path under **`event-gallery/`**, the file is **deleted from disk** before the row is removed.

---

## 7. Migrations to run (ops)

1. `2026_05_12_000002_add_city_label_to_events_table` — adds nullable **`events.city`** (string label).

Ensure **`php artisan storage:link`** and writable **`storage/app/public`** so `event-gallery` uploads and `url` resolution work in production.

---

## 8. QA checklist (aligned with implementation)

1. `GET /api/v1/main/events/categories` → categories with `id` / names.
2. `PATCH /organizer/events/{id}` with `{ "category_id": N }` → next `GET` shows `category_id` and nested `category`.
3. `PATCH` with `{ "region_id": R, "city_id": C, "city": "Riyadh" }` → persisted (after migration).
4. Draft event: `POST …/submit` → status **`pending_approval`** (not `published` unless product/backend changes).
5. `POST …/gallery` with multipart **`image`** → `GET` shows new gallery row with **`id`** and **`url`** absolute.
6. `DELETE …/gallery/{id}` → row removed; disk file removed when under `event-gallery/`.
7. `POST …/ticket-types` with `{ "label": "VIP", "default_price": 99 }` → **201** and numeric `id`; `PATCH`/`DELETE` on that id work.

---

## 9. Files touched (backend reference)

| Area | File(s) |
|------|---------|
| Event editor controller | `app/Http/Controllers/Api/V1/Organizer/Events/OrganizerEventController.php` |
| Ticket type aliases | `app/Http/Controllers/Api/V1/Organizer/Seating/OrganizerSeatingController.php` |
| Gallery URL accessor | `app/Models/EventGallery.php` |
| Create payload + change-log fixes | `app/Domains/Events/Services/EventLifecycleService.php` |
| City column | `database/migrations/2026_05_12_000002_add_city_label_to_events_table.php` |

---

*For route names and broader organizer API tables, see `docs/ORGANIZER_API_ENDPOINTS.md`. For the original gap list, see `docs/backend-organizer-event-editor-gaps.md`.*
