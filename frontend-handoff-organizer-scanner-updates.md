# Organizer scanner updates — handoff

**Date:** 2026-05-20  
**API base:** `https://<host>/api/v1/organizer`  
**Related:** [`ORGANIZER_API_ENDPOINTS.md`](ORGANIZER_API_ENDPOINTS.md) (full organizer reference), [`SCANNER_API_ENDPOINTS.md`](SCANNER_API_ENDPOINTS.md) (scanner app)

This document covers **only the new/changed organizer scanner behavior**. Older endpoints (`GET /scanners`, single assign, unassign, revoke device, scan logs) are unchanged unless noted.

---

## Summary of changes

| Feature | Endpoint | What changed |
|---------|----------|----------------|
| Create scanner + login + email | `POST /scanners` | Auto-creates `users` (role `scanner`), links account, emails password |
| Remove scanner | `DELETE /scanners/{id}` | **New** — soft-delete, revoke assignments & devices |
| Multiple scanners per gate | `POST /events/{id}/scanner-assignments` | **New** — assign many scanner accounts to one event |
| Credential email | (on create) | **New** — styled HTML email with login URL |

**Scanner app login** uses **`users.email`** + **`users.password_hash`** (same as `POST /api/v1/scanner/auth/login`). Password is no longer stored only on `scanner_accounts`.

---

## Environment

```env
FRONTEND_SCANNER_URL=https://your-scanner-app.example.com
MAIL_MAILER=smtp
MAIL_FROM_ADDRESS=noreply@example.com
# … other MAIL_* settings
```

`FRONTEND_SCANNER_URL` is used in the credential email “Open scanner app” button (`config/scanners.php`).

---

## 1. Create scanner — `POST /scanners`

**Auth:** Organizer bearer token (`app:organizer`)

**Content-Type:** `application/json`

### Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Staff display name (max 160) |
| `email` | string | Yes | Login email; unique per organizer profile |
| `password` | string | No | Min 8 chars; if omitted, server generates one and **emails** it |
| `user_id` | integer | No | Link existing user (email must match); password still updated & emailed |
| `event_ids` | integer[] | No | Assign to these events on create |
| `gate_label` | string | No | Label shown in email (e.g. `North Gate`, `Main Entrance`) |

### Example

```http
POST /api/v1/organizer/scanners
Authorization: Bearer <organizer_token>
Content-Type: application/json

{
  "name": "Gate A — Ahmed",
  "email": "ahmed.gate@example.com",
  "event_ids": [18],
  "gate_label": "North Entrance"
}
```

### Response `201`

```json
{
  "data": {
    "id": 5,
    "code": "SCN-XXXXXXXXXX",
    "organizer_profile_id": 1,
    "user_id": 42,
    "name": "Gate A — Ahmed",
    "email": "ahmed.gate@example.com",
    "is_active": true,
    "assignments": [ … ],
    "devices": []
  },
  "credentials_emailed": true,
  "assignments": [
    {
      "id": 12,
      "scanner_account_id": 5,
      "event_id": 18,
      "assigned_at": "2026-05-20T12:00:00.000000Z",
      "revoked_at": null
    }
  ]
}
```

**Important for UI:**

- Do **not** expect `password` in the response.
- Show copy like: “Login details were sent to {email}.”
- Staff signs in at the scanner app with that email and the password from the email.

### Errors `422`

- `A scanner with this email already exists for your organization.`
- `This email is already linked to another scanner account.`
- `This email belongs to a user that cannot be converted to a scanner.`
- Validation errors (invalid email, short password, etc.)

---

## 2. Remove scanner — `DELETE /scanners/{id}`

**Auth:** Organizer bearer token

### Request

No body.

```http
DELETE /api/v1/organizer/scanners/5
Authorization: Bearer <organizer_token>
```

### Response `200`

```json
{
  "message": "Scanner account removed."
}
```

**Server behavior:**

- Soft-deletes `scanner_accounts` row
- Sets `revoked_at` on all active event assignments
- Revokes all active scanner devices  
- Does **not** delete the `users` row (staff may exist elsewhere)

**UI:** Remove from list after success; account no longer appears in `GET /scanners` (deleted rows excluded).

---

## 3. Bulk gate assignment — `POST /events/{eventId}/scanner-assignments`

Assign **multiple** scanner accounts to **one** event (one gate / entrance).

**Auth:** Organizer bearer token

### Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scanner_account_ids` | integer[] | Yes | Min 1; all must belong to this organizer |
| `gate_label` | string | No | Optional label for organizer UI only (not stored in DB today) |

### Example

```http
POST /api/v1/organizer/events/18/scanner-assignments
Authorization: Bearer <organizer_token>
Content-Type: application/json

{
  "scanner_account_ids": [3, 5, 7],
  "gate_label": "Main Entrance"
}
```

### Response `201`

```json
{
  "data": [
    {
      "id": 10,
      "scanner_account_id": 3,
      "event_id": 18,
      "assigned_by": 2,
      "assigned_at": "2026-05-20T12:00:00.000000Z",
      "revoked_at": null
    },
    {
      "id": 11,
      "scanner_account_id": 5,
      "event_id": 18,
      "assigned_at": "2026-05-20T12:00:00.000000Z",
      "revoked_at": null
    },
    {
      "id": 12,
      "scanner_account_id": 7,
      "event_id": 18,
      "assigned_at": "2026-05-20T12:00:00.000000Z",
      "revoked_at": null
    }
  ]
}
```

**Notes:**

- Already-assigned scanners are returned without error (idempotent).
- Previously revoked assignments are **reactivated** (`revoked_at` cleared).
- `gate_label` is not persisted; use it only in UI or pass it on **create** to include in the welcome email.

### Errors `422`

- `One or more scanner accounts were not found.`
- `One or more events were not found.` (invalid `eventId`)

---

## 4. Credential email (automatic)

Sent when a scanner is created via `POST /scanners` (queued mail).

**Subject:** `Your MyTicket scanner app login`

**Includes:**

- Organizer name  
- Scanner name  
- Login email  
- Plain-text password (generated or from `password` field)  
- Optional gate / event summary if `event_ids` / `gate_label` were sent on create  
- Button link → `FRONTEND_SCANNER_URL`

**Template files (API repo):**

- `resources/views/emails/layouts/transactional.blade.php`
- `resources/views/emails/scanners/credentials.blade.php`
- `app/Mail/Scanners/ScannerCredentialsMail.php`

---

## Suggested organizer UI flows

### Add gate staff

1. Form: name, email, optional password, optional gate label, optional pre-select event(s).
2. `POST /scanners` with `event_ids` if assigning on create.
3. Toast: “Invitation sent to {email}” when `credentials_emailed === true`.

### Assign multiple devices to one event

1. On event → Gate / Scanners tab: multi-select existing scanner accounts.
2. `POST /events/{eventId}/scanner-assignments` with `scanner_account_ids`.

### Remove staff

1. Confirm dialog.
2. `DELETE /scanners/{id}`.

---

## Unchanged (still valid)

| Method | Path |
|--------|------|
| GET | `/scanners` |
| POST | `/scanners/{id}/assignments` | Single scanner → single event |
| DELETE | `/scanners/{id}/assignments/{assignmentId}` |
| POST | `/scanners/{id}/devices/{deviceId}/revoke` |
| GET | `/events/{id}/scan-logs` |

---

## Scanner app (staff side)

After receiving the email:

1. Open scanner app (`FRONTEND_SCANNER_URL`).
2. `POST /api/v1/scanner/auth/login` with emailed email + password.
3. `GET /api/v1/scanner/me` or `GET /api/v1/scanner/assignments` — must see assigned events.
4. `POST /api/v1/scanner/devices/register` → scan tickets.

See [`SCANNER_API_ENDPOINTS.md`](SCANNER_API_ENDPOINTS.md).

---

## Tests

```bash
php artisan test --filter=OrganizerScannersProvisioning
```
