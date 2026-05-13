# Backend gaps: organizer profile — social links, document, gallery

This document is for **Laravel / API maintainers**. The organizer SPA (`/profile`) was updated to:

1. **Persist social links** only via `DELETE` + `POST` on `/me/social-links` (per [ORGANIZER_API_ENDPOINTS.md](../ORGANIZER_API_ENDPOINTS.md)), after the user clicks **Save profile**.
2. **Upload** organization documents and gallery images via **multipart POST** routes (same pattern as existing `POST /me/profile/logo`).
3. **PATCH** `document_url` and `gallery_urls` on `PATCH /me/profile` so the canonical profile row matches uploaded assets.

If any of the behaviors below are missing or differ on the server, the dashboard will show errors or data will appear to “not save”.

---

## 1. Social links appear unchanged after save

### Expected client behavior

- On load, the SPA reads `GET /me/profile` (raw) and builds:
  - URLs from `social_links[]` (and falls back to nested `organization.*` fields where applicable).
  - **Link row ids** from `social_links[].id` keyed by `platform` (`website`, `instagram`, `twitter`, `tiktok`).
- On save, for each platform whose URL **changed** from the initial snapshot:
  1. `DELETE /api/v1/organizer/me/social-links/{id}` when a previous id exists.
  2. `POST /api/v1/organizer/me/social-links` with JSON `{ "platform": "<platform>", "url": "<https://...>" }`.

### Common backend causes

| Symptom | Likely cause |
|--------|----------------|
| Second save fails with duplicate / unique | `GET /me/profile` does not return `social_links` (or not with stable `id`), so the client never **DELETE**s the old row before **POST**ing again. |
| 422 on `POST` | Validation keys differ (e.g. expect `link_url` instead of `url`), or `platform` enum does not include `twitter` (only `x`) / case mismatch. |
| 403 / 404 | Organizer profile missing or link id not owned by the authenticated organizer profile. |
| Silent no-op | `POST` returns 200/201 but `GET /me/profile` omits updated `social_links` or still returns old URLs from a different source (cached serializer, wrong relation). |

### Recommended API contract

- **`GET /me/profile`** MUST include `social_links` as an array of objects with at least: `id`, `platform`, `url` (aliases tolerated: `type`/`provider` for platform; `link_url`/`link` for url — the SPA maps several shapes when reading).
- **`POST /me/social-links`** MUST accept JSON `{ "platform": "website" \| "instagram" \| "twitter" \| "tiktok", "url": "<absolute http(s) url>" }` as documented, or document the **exact** request body Laravel validates so the SPA can be aligned.
- If Twitter/X uses only `platform: "x"`, either normalize in the API serializer to `twitter` for reads, or accept both on write.

---

## 2. Organization document & gallery “do nothing” / no URLs

### Previous gap (fixed in SPA)

Earlier builds only set **local placeholders** (`document:filename`, `file:…`) and never called an upload endpoint or sent `document_url` / `gallery` in `PATCH /me/profile`.

### Current SPA behavior

| Action | HTTP call |
|--------|-----------|
| User picks org document | `POST /api/v1/organizer/me/profile/document` — `multipart/form-data` field **`document`** (max 12 MB client-side). |
| User picks gallery image(s) | One request per file: `POST /api/v1/organizer/me/profile/gallery` — field **`image`** (max 6 MB per file client-side). |
| User clicks **Save profile** | `PATCH /api/v1/organizer/me/profile` with JSON including **`document_url`** (string or `null`) and **`gallery_urls`** (array of absolute URLs or `null` when gallery cleared). |

The client parses upload responses defensively for:

- Full profile envelope `{ "data": { … "document_url", "gallery" / "gallery_urls" … } }`, or
- A single resource object containing `url` / `document_url` / new gallery row `url`.

### Backend work required if routes are missing

Implement (names should match or be documented if different):

1. **`POST /api/v1/organizer/me/profile/document`**
   - Input: multipart file under **`document`**.
   - Output: preferably `{ "data": <OrganizerProfile> }` (same as logo) **or** `{ "data": { "document_url": "https://…" } }` so the client can read the public URL.

2. **`POST /api/v1/organizer/me/profile/gallery`**
   - Input: multipart file under **`image`**.
   - Output: preferably full profile **or** `{ "data": { "url": "https://…" } }` / gallery array including the new URL.

3. **`PATCH /api/v1/organizer/me/profile`**
   - Accept **`document_url`** (nullable string) and **`gallery_urls`** (nullable `string[]`) in addition to existing validated fields (`display_name`, `bio`, `contact_phone`, `logo_url`, region/city ids, etc.).
   - If Laravel uses different column names (`organization_document`, `gallery` JSON), either:
     - Add the keys the SPA sends (`document_url`, `gallery_urls`), **or**
     - Document the canonical keys and we will change the SPA mapper.

### CORS / storage

- Returned URLs must be **absolute** `https://…` strings the browser can load for `<img src>`.

---

## 3. Previous events

The dashboard **no longer** edits “previous events” from the Organization tab and **no longer** calls `POST/DELETE /me/previous-events` during profile save. Titles still come from `GET /me/profile` if the API returns `previous_events` / nested organization data.

If product still requires organizers to self-manage previous events, either restore a UI + save path or expose another workflow (e.g. admin-only).

---

## 4. Quick verification checklist (Postman)

1. `GET /me/profile` → confirm `social_links` includes `id` + `platform` + `url` after creating a link manually in DB or via POST.
2. `POST /me/social-links` with body `{ "platform": "instagram", "url": "https://instagram.com/test" }` → 201 and row visible on next GET.
3. `POST /me/profile/document` with multipart `document=@file.pdf` → response includes a **public** `document_url`.
4. `POST /me/profile/gallery` with multipart `image=@photo.jpg` → response includes new image URL or updated gallery list.
5. `PATCH /me/profile` with `{ "document_url": "https://…", "gallery_urls": ["https://…/a.jpg","https://…/b.jpg"] }` → persisted and echoed on GET.

---

*Generated for handoff; align with `routes/api_organizer.php` and actual `OrganizerProfile` fillable / casts.*
