# Organizer Dashboard API — Endpoints & Response Schemas

**Base URL:** `https://<host>/api/v1/organizer`  
**Route file:** `routes/api_organizer.php`  
**Global prefix / name:** `api/v1/organizer` · `api.v1.organizer.*`

Unless noted, protected routes use:

- `Authorization: Bearer <token>`
- Sanctum ability **`app:organizer`**
- Valid **`user_sessions`** row for app `organizer_dashboard` (see `EnsureTokenAppScope`)

---

## Shared response shapes

### Success — JSON object / wrapper

| Pattern | HTTP | Body |
|--------|------|------|
| `{ data: … }` | 200 / 201 | Single resource or nested payload |
| `{ message: "…" }` | 200 | Deletes / simple confirmations |
| Top-level model / array | 200 | Some finance endpoints return **raw** JSON (no `data` key) |
| Laravel **paginator** | 200 | Top-level keys: `data`, `current_page`, `per_page`, `total`, `first_page_url`, … |

### Failure — typical HTTP codes

| Code | When |
|------|------|
| **401** | Missing/invalid bearer token (`auth:sanctum`), `abort_if(! $user, 401)`, login failures where coded as 401 |
| **403** | Wrong token app scope / invalid session (`EnsureTokenAppScope`), `abort_unless($profile, 403, …)` on finance when organizer profile missing, login when **role not allowed** for `organizer_dashboard` |
| **404** | `firstOrFail` / `findOrFail` (wrong id or not owned by organizer) |
| **422** | Laravel **validation** (`message` + `errors`), invalid credentials on login, invalid 2FA, business rules via `abort_unless(..., 422, '...')` (e.g. delete event only `draft`/`rejected`) |
| **429** | Throttle (`auth-login`, `organizer-api`) |
| **500** | Uncaught exceptions / rare `abort(500, …)` in middleware |

### Validation error (422) — Laravel default

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": ["The field name field is required."]
  }
}
```

### Simple abort message (403 / 404 / 422)

```json
{
  "message": "Human readable reason."
}
```

### Paginator (200) — abbreviated

```json
{
  "current_page": 1,
  "data": [],
  "first_page_url": "…",
  "from": null,
  "last_page": 1,
  "last_page_url": "…",
  "links": [],
  "next_page_url": null,
  "path": "…",
  "per_page": 20,
  "prev_page_url": null,
  "to": null,
  "total": 0
}
```

`data` holds the array of models (serialized columns + casts).

---

## Public (no bearer token)

| Method | Path | Success (HTTP) | Success body |
|--------|------|------------------|----------------|
| GET | `/health` | 200 | `{ "app": "organizer_dashboard", "status": "ok", "version": "v1", "time": "<ISO8601>" }` |
| GET | `/version` | 200 | `{ "app": "organizer_dashboard", "api_version": "v1", "phase": "phase-1-migrations" }` |
| POST | `/auth/login` | 200 | See **Login success** below |
| POST | `/auth/login` | 200 | **2FA challenge:** `{ "challenge_token": "ch_…", "two_factor_required": true }` |
| POST | `/auth/oauth/{provider}/callback` | 200 | Same shape as **Login success** (token + user) |

**Login success (200):**

```json
{
  "token": "<plainTextToken>",
  "refresh_token": null,
  "expires_at": "<ISO8601>",
  "user": {
    "id": 1,
    "email": "organizer@example.com",
    "full_name": "…",
    "role": "organizer"
  }
}
```

**Login failure (422):** `{ "message": "Invalid credentials." }`  
**Login failure (403):** `{ "message": "User role cannot authenticate into this app." }`  
**Login validation:** 422 with `errors` for `LoginRequest` fields.

**OAuth callback failures:** Provider/driver errors may surface as 4xx/5xx with exception message JSON depending on handler.

---

## Authenticated auth (`auth:sanctum` + `app.scope:organizer_dashboard`)

Prefix: `/auth`

| Method | Path | Success (HTTP) | Success body |
|--------|------|----------------|----------------|
| POST | `/auth/logout` | 200 | `{ "message": "Logged out." }` |
| POST | `/auth/refresh` | 200 | `{ "token": "<new plainTextToken>" }` |

**Failures:** 401 if not authenticated; 403 if token/session not valid for organizer app (middleware).

---

## Me — profile, venues, social, previous events (`/me/...`)

All: `auth:sanctum` + `app.scope:organizer_dashboard`.

| Method | Path | Success | Body |
|--------|------|---------|------|
| GET | `/me/profile` | 200 | `{ "data": <OrganizerProfile JSON> }` |
| PATCH | `/me/profile` | 200 | `{ "data": <updated OrganizerProfile> }` — validates `display_name`, `bio`, `contact_phone` (optional/sometimes) |
| GET | `/me/venues` | 200 | `{ "data": [ …OrganizerVenue ] }` |
| POST | `/me/venues` | 201 | `{ "data": <OrganizerVenue> }` — `name` required |
| PATCH | `/me/venues/{id}` | 200 | `{ "data": <OrganizerVenue> }` |
| DELETE | `/me/venues/{id}` | 200 | `{ "message": "Deleted" }` |
| POST | `/me/social-links` | 201 | `{ "data": <OrganizerSocialLink> }` — `platform`, `url` |
| DELETE | `/me/social-links/{id}` | 200 | `{ "message": "Deleted" }` |
| POST | `/me/previous-events` | 201 | `{ "data": <OrganizerPreviousEvent> }` — `title` required |
| DELETE | `/me/previous-events/{id}` | 200 | `{ "message": "Deleted" }` |

**Failures:**

- **401** — no user on `me` / `update` explicit `abort_if(! $user, 401)` (edge).
- **404** — `OrganizerProfile::…->firstOrFail()` when user has **no** organizer profile (GET/PATCH profile, venues, social, previous-events paths using `profileFor`).

---

## Me — finance (`/me/...`)

| Method | Path | Success | Body |
|--------|------|---------|------|
| GET | `/me/bank-accounts` | 200 | **JSON array** of `OrganizerBankAccount` (top-level `[…]`, not wrapped in `data`) |
| POST | `/me/bank-accounts` | 201 | **Raw** `<OrganizerBankAccount>` object at top level |
| PATCH | `/me/bank-accounts/{id}` | 200 | **Raw** updated account object |
| DELETE | `/me/bank-accounts/{id}` | 200 | `{ "message": "Bank account deleted." }` |
| POST | `/me/bank-accounts/{id}/set-default` | 200 | Return value of `PayoutService::setDefaultBankAccount` (service-defined JSON / model) |
| GET | `/me/kyc-documents` | 200 | **JSON array** of `OrganizerKycDocument` |
| POST | `/me/kyc-documents` | 201 | **Raw** `<OrganizerKycDocument>` |
| DELETE | `/me/kyc-documents/{id}` | 200 | `{ "message": "KYC document deleted." }` |
| GET | `/me/payouts` | 200 | Laravel **paginator** of `Payout` |
| GET | `/me/payouts/{id}` | 200 | **Raw** `<Payout>` |
| GET | `/me/payouts/{id}/line-items` | 200 | **JSON array** of line items |
| GET | `/me/finance/summary` | 200 | `{ "gross_total": float, "fees_total": float, "refunds_total": float, "net_total": float, "adjustments_total": float }` |
| GET | `/me/finance/exports` | 200 | `{ "csv": "<CSV string including header>" }` |

**Failures:**

- **403** + `{ "message": "Organizer profile is required." }` when `OrganizerProfile` row missing for user (all finance methods that use `abort_unless($profile, 403, …)`).
- **404** — `findOrFail` on bank account / KYC / payout not belonging to profile.
- **422** — validation on create/update bank account or KYC.

---

## Events (`/events/...`)

Ownership: `Event.organizer_id` must match current user’s `OrganizerProfile.id`. `profileFor` / `ownedEvent` use `firstOrFail` → **404** if no profile or wrong event.

| Method | Path | Success | Body |
|--------|------|---------|------|
| GET | `/events` | 200 | Paginator of `Event` |
| POST | `/events` | 201 | `{ "data": <Event> }` — `title`, `starts_at`, `ends_at` required; `category_id`, `description` optional |
| GET | `/events/{id}` | 200 | `{ "data": <Event with gallery, occurrences, talents, vendors> }` |
| PATCH | `/events/{id}` | 200 | `{ "data": <Event> }` |
| DELETE | `/events/{id}` | 200 | `{ "message": "Deleted" }` — only if status `draft` or `rejected` |
| POST | `/events/{id}/submit` | 200 | `{ "data": <Event> }` |
| POST | `/events/{id}/cancel` | 200 | `{ "data": <Event> }` |
| POST | `/events/{id}/archive` | 200 | `{ "data": <Event> }` |
| POST | `/events/{id}/gallery` | 201 | `{ "data": <EventGallery> }` |
| DELETE | `/events/{id}/gallery/{itemId}` | 200 | `{ "message": "Deleted" }` |
| POST | `/events/{id}/recurrence` | 200 | `{ "data": <recurrence row> }` |
| POST | `/events/{id}/occurrences/regenerate` | 200 | `{ "data": [ …EventOccurrence ] }` |
| POST | `/events/{id}/talents` | 201 | `{ "data": <EventTalent> }` |
| DELETE | `/events/{id}/talents/{linkId}` | 200 | `{ "message": "Deleted" }` |
| POST | `/events/{id}/vendors` | 201 | `{ "data": <EventVendor> }` |
| DELETE | `/events/{id}/vendors/{linkId}` | 200 | `{ "message": "Deleted" }` |
| POST | `/events/{id}/post-media` | 201 | `{ "data": <post media row> }` |

**Failures:**

- **404** — unknown event or not owned.
- **422** — validation; delete when status not `draft`/`rejected` → `{ "message": "Only draft/rejected events can be deleted." }`.
- **422/500** — `EventLifecycleService` may throw or abort on invalid transitions (depends on implementation).

---

## Seating & ticket types (`/events/{id}/...`)

| Method | Path | Success | Body |
|--------|------|---------|------|
| GET | `/events/{id}/ticket-types` | 200 | `{ "data": [ …EventTicketType ] }` |
| POST | `/events/{id}/ticket-types` | 201 | `{ "data": <EventTicketType> }` |
| PATCH | `/events/{id}/ticket-types/{ticketTypeId}` | 200 | `{ "data": <EventTicketType> }` |
| DELETE | `/events/{id}/ticket-types/{ticketTypeId}` | 200 | `{ "message": "Deleted" }` |
| GET | `/events/{id}/seats` | 200 | `{ "data": [ …Seat ] }` |
| POST | `/events/{id}/seats/bulk` | 201 | `{ "created": <int count> }` |
| PATCH | `/events/{id}/seats/{seatId}` | 200 | `{ "data": <Seat> }` |
| DELETE | `/events/{id}/seats/{seatId}` | 200 | `{ "message": "Deleted" }` |

**Failures:** **404** if event not owned or ticket type / seat id wrong; **422** validation; domain services may throw on invalid layout.

---

## Booking (`/events/{id}/...`)

| Method | Path | Success | Body |
|--------|------|---------|------|
| GET | `/events/{id}/orders` | 200 | Paginator of orders for event |
| GET | `/events/{id}/tickets` | 200 | Paginator of `Ticket` for event |
| POST | `/events/{id}/tickets/{ticketId}/comp` | 200 | `{ "data": <Ticket> }` — sets `price_paid` to 0 |
| POST | `/events/{id}/refunds/{refundId}/approve` | 200 | `{ "data": <Refund> }` |
| POST | `/events/{id}/refunds/{refundId}/reject` | 200 | `{ "data": <Refund> }` |

**Failures:**

- **404** — event not owned; refund id not found or refund’s order not for this event (`abort_if` on mismatch).

---

## Scanners (`/scanners/...`)

| Method | Path | Success | Body |
|--------|------|---------|------|
| GET | `/scanners` | 200 | `{ "data": [ …ScannerAccount with assignments, devices ] }` |
| POST | `/scanners` | 201 | `{ "data": <ScannerAccount> }` |
| POST | `/scanners/{id}/assignments` | 201 | `{ "data": <ScannerEventAssignment> }` |
| DELETE | `/scanners/{id}/assignments/{assignmentId}` | 200 | `{ "data": <assignment updated revoked_at> }` |
| POST | `/scanners/{id}/devices/{deviceId}/revoke` | 200 | `{ "data": <device after revoke> }` |

**Failures:** **404** — scanner not owned; assignment/device mismatch; **422** validation.

---

## Events — scan logs & waitlist / notify (second `events` group)

| Method | Path | Success | Body |
|--------|------|---------|------|
| GET | `/events/{id}/scan-logs` | 200 | Paginator of `ScanLog` |
| GET | `/events/{id}/waitlist` | 200 | `{ "count": <int>, "data": [ …WaitlistEntry ] }` |
| POST | `/events/{id}/notify` | 200 | `{ "dispatched": <int> }` — optional body `kind`: `edited` \| `cancelled` (default `edited`) |

**Failures:** **404** — event not owned (`OrganizerProfile` + `findOrFail`).

---

## Engagements (`/engagements/...`)

| Method | Path | Success | Body |
|--------|------|---------|------|
| GET | `/engagements` | 200 | Paginator of `Engagement` where `organizer_user_id` = current user |
| POST | `/engagements` | 201 | `{ "data": <Engagement> }` |
| PATCH | `/engagements/{id}` | 200 | `{ "data": <Engagement> }` |
| POST | `/engagements/{id}/cancel` | 200 | `{ "data": <Engagement> }` |
| POST | `/engagements/{id}/messages` | 201 | `{ "data": <message model> }` |
| GET | `/engagements/{id}/messages` | 200 | `{ "data": [ …messages ] }` |

**Failures:** **401** if no user; **404** engagement not owned; **422** validation / `EngagementService` transition rules.

---

## Notes for OpenAPI / clients

1. **Inconsistent envelopes:** profile/venues use `{ data }`; several finance reads return **bare arrays** or **bare models**; paginators are always top-level Laravel shape.
2. **403 “Organizer profile is required”** only applies to **finance** routes under `/me/…` that query `OrganizerProfile` with `first()` — not to `/me/profile` which uses `firstOrFail` (**404** instead if missing).
3. All `…/{id}` path ids are numeric; invalid id may yield **404** before validation.

---

*Generated from controller implementations under `app/Http/Controllers/Api/V1/Organizer/` and `routes/api_organizer.php`. For exact column lists per model, refer to migrations and Eloquent `$casts`.*
