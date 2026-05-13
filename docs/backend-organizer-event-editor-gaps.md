# Backend gaps: organizer event editor (May 2026)

**Superseded for contract details by:** [`docs/frontend-handoff-organizer-event-editor-api.md`](frontend-handoff-organizer-event-editor-api.md) (authoritative API behavior after May 2026 alignment). This file remains as a **checklist** for integration testing.

This document is for **Laravel / API maintainers**. The organizer SPA **Event editor** (`/events/:id`) was updated to:

- Load **event categories** from `GET /api/v1/main/events/categories` and persist **`category_id`** on `PATCH /api/v1/organizer/events/{id}` (plus optional **`city`** string label).
- Load **Saudi regions / cities** from `GET /api/v1/reference/saudi-regions` and `GET /api/v1/reference/saudi-cities?region_id=` and persist **`region_id`** / **`city_id`** (+ `city` label) on the same PATCH.
- Use **delta PATCH** bodies (only changed fields) instead of sending the entire merged event on every blur.
- Route **lifecycle** only via **dedicated routes**: **`POST …/submit`** (draft/rejected → `pending_approval`), **`POST …/cancel`**, **`POST …/archive`** — **do not** send `status` or nested `ticket_types` on event `PATCH` (not accepted).
- Manage **ticket types** only via **`POST|PATCH|DELETE …/events/{id}/ticket-types`** (canonical keys `name`, `price`, `quantity_limit`).
- Manage **marketing gallery** via **`POST …/events/{id}/gallery`** (multipart **`image`**) and **`DELETE …/events/{id}/gallery/{itemId}`**.

If any behavior below is missing, differs, or validation rejects the payloads the SPA sends, the UI will show errors or data will appear not to save.

---

## 1. `PATCH /api/v1/organizer/events/{id}` — accepted fields

The dashboard sends **snake_case** (via `organizerEventPatchToApiBody`). Confirm the validator / `$fillable` includes at least:

| JSON key | Notes |
|----------|--------|
| `category_id` | `integer` FK to event categories table; nullable to clear if allowed. |
| `region_id` | Integer FK aligned with reference `saudi-regions` ids (same as organizer profile). |
| `city_id` | Integer FK aligned with reference `saudi-cities` ids. |
| `city` | Optional display string; SPA sets it from the selected city name. |

**Not on PATCH:** `status`, nested `ticket_types` — use dedicated routes / ticket-type endpoints (see handoff doc).

**Gap symptoms:** category or geography never persists → keys rejected or stripped. Submit still shows **draft** → submit route failing. Editor shows wrong status strings → serializer / enum alignment.

---

## 2. Status transitions vs dedicated routes

| User intent | SPA behavior |
|-------------|----------------|
| **Submit for review** (draft or rejected) | `POST /api/v1/organizer/events/{id}/submit` → status **`pending_approval`** (not `published` until admin approves). |
| **Archived** | `POST /api/v1/organizer/events/{id}/archive` (from **ended** when guard allows). |
| **Cancelled** | `POST /api/v1/organizer/events/{id}/cancel`. |

The SPA **does not** send `PATCH { "status": … }` on the event resource.

**Gap:** Submit returns 422/500 → lifecycle guard or validation; archive from wrong state → `DomainException`.

---

## 3. Ticket types — request body contract

Endpoints (from `ORGANIZER_API_ENDPOINTS.md`):

- `GET|POST /events/{id}/ticket-types`
- `PATCH|DELETE /events/{id}/ticket-types/{ticketTypeId}`

**Canonical JSON (SPA sends):**

- **POST create:** `name` (string), `price` (numeric ≥0), optional `quantity_limit` (int ≥1 when set).
- **PATCH update:** same keys when changed.

Aliases are merged **server-side** before validation (`label`→`name`, `default_price`→`price` per API).

---

## 4. Event gallery — multipart and response

- **POST** ` /api/v1/organizer/events/{id}/gallery`  
  - **Expected:** `multipart/form-data` with one file field named **`image`** (same convention as organizer profile gallery). If the backend uses another name (`file`, `photo`), document it or accept **`image`** as an alias.
  - **Response:** Prefer `{ "data": <Event> }` or `{ "data": { "id", "url", … } }` so the client can refresh gallery via `GET /events/{id}`.

- **DELETE** `/api/v1/organizer/events/{id}/gallery/{itemId}`  
  - `itemId` must be the **primary key** returned on GET for each gallery row (not only the URL string).

**Gap:** Wrong field name → 422 or empty save. DELETE with URL as id → 404.

---

## 5. `GET /api/v1/organizer/events/{id}` — response shape for editor

For the editor to stay in sync without guessing:

- Include **`category_id`** and nested or denormalized **`category`** `{ "name", … }` if helpful.
- Include **`region_id`**, **`city_id`**, and **`city`** (label).
- Include **`gallery`** (or `gallery_urls`) as an array of objects with stable **`id`** and public **`url`** (absolute `https://…` preferred).
- Include **`ticket_types`** with stable numeric **`id`** for each row after create.

---

## 6. Quick QA checklist (Postman)

1. `GET /api/v1/main/events/categories` → 200 JSON `data[]` with `id`, `name`.
2. `PATCH /organizer/events/{id}` with `{ "category_id": <int> }` → next `GET` echoes `category_id` / category label.
3. `PATCH` with `{ "region_id": <int>, "city_id": <int>, "city": "Riyadh" }` → persisted.
4. Draft event: `POST …/submit` → status **`pending_approval`** (admin path publishes).
5. `POST …/gallery` with multipart `image=@photo.jpg` → `GET` shows new gallery item with `id`.
6. `DELETE …/gallery/{id}` → item removed.
7. `POST …/ticket-types` with minimal body → 201 + numeric `id`; `PATCH`/`DELETE` on that id succeed.

---

*Align implementation with `routes/api_organizer.php`, `Event` / `EventTicketType` / `EventGallery` models, and `ORGANIZER_API_ENDPOINTS.md`.*
