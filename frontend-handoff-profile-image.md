# Backend handoff: organizer profile image URL

## Summary

The organizer dashboard uploads profile photos via **`POST /api/v1/organizer/me/profile-image`** (multipart field `image`). The frontend expects to read the stored photo URL from **`GET /api/v1/organizer/me/profile`**, but the current profile payload does not include any profile-image field.

This is a **backend gap**. Upload may succeed while the dashboard cannot persist or reload the photo after refresh.

## Current frontend contract

### Upload — `POST /api/v1/organizer/me/profile-image`

- **Auth:** Bearer organizer token
- **Body:** `multipart/form-data`, field name `image`
- **Expected success (201):** JSON envelope with at least one absolute URL:

```json
{
  "data": {
    "profile_image_url": "https://myticket-api.kat-jr.com/storage/users/profile-images/3/abc.jpg",
    "avatar_url": "https://myticket-api.kat-jr.com/storage/users/profile-images/3/abc.jpg"
  }
}
```

Accepted aliases (frontend parser): `profile_image_url`, `profileImageUrl`, `avatar_url`, `avatarUrl`, `image_url`, nested `user.avatar_url`, nested `profile_image.url`.

If no URL is returned, the frontend shows: *"Profile image upload succeeded but no URL was returned."*

### Read — `GET /api/v1/organizer/me/profile`

The frontend maps the user photo from the organizer profile resource using the same keys as above.

**Observed response (missing photo):**

```json
{
  "data": {
    "id": 1,
    "display_name": "Mohamed Ahmed",
    "logo_url": "https://…/organizer-logos/….png",
    "…": "…"
  }
}
```

There is `logo_url` (business logo) but **no** `profile_image_url` / `avatar_url` for the personal account photo.

### Clear — `PATCH /api/v1/organizer/me/profile`

To remove the photo, the frontend sends:

```json
{ "avatar_url": null }
```

## Required backend change

1. **Persist** the uploaded image path on the organizer profile (or linked user) when `POST /me/profile-image` succeeds.
2. **Include** the public URL on `GET /me/profile` (and ideally on `PATCH /me/profile` responses), e.g.:

```json
{
  "data": {
    "id": 1,
    "display_name": "Mohamed Ahmed",
    "logo_url": "https://…/organizer-logos/….png",
    "profile_image_url": "https://…/users/profile-images/3/abc.jpg",
    "avatar_url": "https://…/users/profile-images/3/abc.jpg"
  }
}
```

Prefer **`profile_image_url`** as the canonical field; **`avatar_url`** is supported as an alias for compatibility.

3. **Do not confuse** `logo_url` (business branding) with `profile_image_url` / `avatar_url` (personal account photo).

## Frontend workaround (until fixed)

Until `GET /me/profile` returns the URL, the dashboard:

- Keeps the URL returned from the upload response in client state
- Caches it in `sessionStorage` keyed by organizer id so reloads within the same browser session still show the photo
- Merges cached URL when save/reload would otherwise clear it

This is **not** a substitute for the API returning the field — other devices/sessions will not see the photo.

## QA checklist

- [ ] `POST /me/profile-image` returns `profile_image_url` (or `avatar_url`)
- [ ] `GET /me/profile` includes the same URL after upload
- [ ] `PATCH /me/profile` with `avatar_url: null` clears the photo
- [ ] `logo_url` and profile image URL are independent fields
