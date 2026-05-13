# Frontend handoff: organizer profile API (May 2026)

This note summarizes **backend changes** for the organizer dashboard **Organization / profile** tab: social links, document, gallery, and `GET /me/profile` shape. Base path: `https://<host>/api/v1/organizer`. All routes below require **`Authorization: Bearer <token>`** with **`app:organizer`** and a valid organizer session (unchanged).

---

## 1. `GET /me/profile`

**Response:** `{ "data": { … } }` where `data` is the organizer profile row plus:

| Field | Type | Notes |
|--------|------|--------|
| **`social_links`** | `array` | Each item: **`id`** (number), **`platform`** (string enum), **`url`** (string). Sorted by `platform`. Use **`id`** for `DELETE /me/social-links/{id}` before replacing a link. |
| **`previous_events`** | `array` | Past events for this profile (unchanged shape from Eloquent). |
| **`logo_url`** | `string \| null` | Always **absolute** `https://…` when the stored value is a path on the `public` disk. |
| **`document_url`** | `string \| null` | Same absolute URL rules as logo. |
| **`gallery_urls`** | `string[]` | List of **absolute** URLs (disk paths resolved the same way as logo). |
| **`gallery`** | `string[]` | **Alias** of `gallery_urls` (same array reference in JSON — identical values). |

**Migration:** Run `php artisan migrate` on the API so column **`gallery_urls`** (JSON) exists on `organizer_profiles`.

---

## 2. `PATCH /me/profile`

Optional JSON body fields (in addition to existing ones):

| Field | Type | Notes |
|--------|------|--------|
| **`document_url`** | `string \| null` | Max 500 chars. External `https://…` or a path returned by uploads. Replacing/removing a server-stored `organizer-documents/…` file deletes the old file from disk. |
| **`gallery_urls`** | `string[] \| null` | Max **50** entries; each string max **800** chars. Send **`null`** or **`[]`** to clear the gallery; **owned** `organizer-gallery/…` files that disappear from the list are deleted from disk. URLs pointing at this API’s `/storage/…` are normalized to relative paths for storage. |

Existing fields unchanged: `display_name`, `bio`, `contact_phone`, `logo_url`, `region_id`, `city_id`, etc.

---

## 3. `POST /me/profile/document`

- **Content-Type:** `multipart/form-data`
- **Field name:** **`document`** (single file)
- **Rules:** max **12288 KiB** (~12 MB); mime types: **`pdf`**, **`doc`**, **`docx`**, **`jpeg`**, **`jpg`**, **`png`**, **`webp`**
- **Success:** **200** `{ "data": <full profile> }` — same envelope as `GET /me/profile` after save; read **`data.document_url`** (absolute).

Replaces the previous profile document if it was stored under `organizer-documents/` on the public disk.

---

## 4. `POST /me/profile/gallery`

- **Content-Type:** `multipart/form-data`
- **Field name:** **`image`** (one image per request)
- **Rules:** `image`, max **6144 KiB** (~6 MB)
- **Success:** **200** `{ "data": <full profile> }` — new file is **appended** to `gallery_urls`; **`data.gallery_urls`** / **`data.gallery`** list absolute URLs.

---

## 5. `POST /me/social-links`

- **Content-Type:** `application/json`
- **Body:** `{ "platform": "<enum>", "url": "https://…" }`
- **Platforms accepted:** `website`, `instagram`, `twitter`, `tiktok`, `facebook`, `youtube`, `snapchat`, `other`
- **`platform: "x"`** is accepted and stored as **`twitter`** (DB enum).
- **Upsert behavior:** one row per `(organizer_profile, platform)`. Re-posting the same `platform` **updates** `url` and returns **200** with the row; first insert returns **201**.

You can rely on **POST only** (no delete) for “save” if you always send the final URL per platform; the SPA’s DELETE-then-POST flow still works.

---

## 6. Public reference (regions / cities)

If the dashboard loads geography outside `/main`:

- `GET /api/v1/reference/saudi-regions`
- `GET /api/v1/reference/saudi-cities` (optional `?region_id=`)

No auth required.

---

## 7. Checklist for QA

1. Migrate production DB (adds `gallery_urls`).
2. `GET /me/profile` → `social_links[].id` present; `gallery_urls` is an array (may be empty).
3. `POST …/profile/document` with a small PDF → `document_url` absolute in `data`.
4. Two `POST …/profile/gallery` calls → `gallery_urls` length increases by 2.
5. `PATCH …/profile` with `{ "gallery_urls": [] }` → gallery empty; disk files under `organizer-gallery/` for this profile removed when removed from list.
6. `POST …/social-links` twice with same `platform` → second response **200**, no duplicate row, `GET` shows one link per platform.

---

*Handoff generated for organizer SPA consumers; canonical tables & middleware remain in `docs/ORGANIZER_API_ENDPOINTS.md`.*
