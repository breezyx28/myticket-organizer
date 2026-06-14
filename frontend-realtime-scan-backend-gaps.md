# Organizer scan live feed — backend verification checklist

**Date:** 2026-05-18  
**Audience:** Backend + frontend (organizer app)  
**Handoff:** [`frontend-handoff-realtime-scanning.md`](frontend-handoff-realtime-scanning.md)

The organizer app **Watch live** dialog (Scanner Management → Assignments) expects:

1. `GET /api/v1/organizer/events/{id}/scan-live` bootstrap
2. Reverb channel `private-organizer.event.{eventId}.scans`
3. Events `.scan.batch_recorded` and `.scan.stats_updated`
4. Polling fallback via `GET /api/v1/organizer/events/{id}/scan-logs?since=<iso8601>`

---

## 1. Bootstrap endpoint

```http
GET /api/v1/organizer/events/{eventId}/scan-live
Authorization: Bearer {organizer_token}
```

**Expected 200 (production with Reverb):**

```json
{
  "transport": "reverb",
  "channel": "private-organizer.event.18.scans",
  "auth_endpoint": "https://myticket-api.kat-jr.com/broadcasting/auth",
  "initial_stats": { "ok": 0, "duplicate": 0, "invalid": 0, "expired": 0, "wrong_event": 0, "total": 0 },
  "fallback": { "transport": "polling", "endpoint": "/api/v1/organizer/events/18/scan-logs?since=<iso8601>" }
}
```

| Check | Expected |
|-------|----------|
| `transport` | `reverb` when broadcasting enabled; `polling` otherwise |
| `channel` | Matches `private-organizer.event.{id}.scans` |
| `initial_stats` | Counters seed the dialog header |

If this endpoint returns **404**, the frontend falls back to polling-only mode after showing an error banner.

---

## 2. Channel authorization

```http
POST https://myticket-api.kat-jr.com/broadcasting/auth
Authorization: Bearer {organizer_token}

{"socket_id":"…","channel_name":"private-organizer.event.{eventId}.scans"}
```

| Check | Expected |
|-------|----------|
| Organizer owns event (`events.organizer_id` = active `organizer_profiles` row) | **200** with signature |
| Wrong organizer / event | **403** |
| Token ability | `app:organizer` |

Echo subscribe name (no `private-` prefix): `organizer.event.{eventId}.scans`

**Organizer isolation** (see handoff § Channel authorization):

- Live scan channels are **not** a global feed — scoped by organizer ownership.
- Another organizer must **not** authorize on your event channel even if they know the event ID.
- Scanner echo: `scanner.{scannerAccountId}.scans` — only the linked scanner user for that active account (active organizer profile).
- Realtime publish is skipped when `scanner_accounts.organizer_profile_id` ≠ `events.organizer_id`.
- HTTP `POST /scanner/scans` cross-organizer pairs: `result: wrong_event`, `failure_reason: scanner_not_owned_by_event_organizer`.

Backend: `App\Domains\Scanners\Support\ScanLiveAuthorization`.

---

## 3. Broadcast events on scan

When `POST /api/v1/scanner/scans` succeeds, backend should broadcast:

| Channel | Event | Purpose |
|---------|-------|---------|
| `private-organizer.event.{eventId}.scans` | `.scan.batch_recorded` | Prepend rows to organizer live feed |
| `private-organizer.event.{eventId}.scans` | `.scan.stats_updated` | Update header counters |
| `private-scanner.{accountId}.scans` (optional) | `.scan.recorded` | Scanner app cross-device sync |

**`.scan.batch_recorded` envelope:**

```json
{
  "type": "scan.batch_recorded",
  "payload": {
    "event_id": 18,
    "count": 1,
    "items": [{
      "id": 101,
      "scanner_name": "Gate A",
      "ticket_ref": "TIC-…",
      "result": "ok",
      "scanned_at": "2026-05-20T12:15:35Z"
    }]
  },
  "occurred_at": "2026-05-20T12:15:36Z"
}
```

**Result values:** `ok`, `duplicate`, `invalid`, `expired`, `wrong_event`

**Cross-organizer rejection:** `wrong_event` with `failure_reason: scanner_not_owned_by_event_organizer` when scanner account does not belong to the event organizer.

---

## 4. Polling fallback

```http
GET /api/v1/organizer/events/{eventId}/scan-logs?since=2026-05-20T12:00:00Z
```

- `since` = ISO8601 of newest row already displayed
- Response: Laravel paginator; merge by `id` on client
- Used when `transport: polling`, on reconnect, window focus, and every ~30s while dialog is open

---

## 5. Infrastructure

| Item | Requirement |
|------|-------------|
| `BROADCAST_CONNECTION` | `reverb` |
| Reverb process | Running (supervisor) |
| Queue | `broadcasts` queue consumed by workers |
| Frontend env | `VITE_REVERB_*` set at build time |

---

## 6. Manual test

1. Assign at least one scanner to a live event.
2. Open **Scanners → Assignments → Watch live**.
3. DevTools → WS connected to Reverb.
4. Submit a scan from scanner app (`POST /scanner/scans`).
5. Row appears at **top** of feed without refresh; stats update.
6. Close dialog → Echo leaves `organizer.event.{id}.scans` channel.

---

## 7. If still broken — capture for backend

1. Response from `GET …/scan-live`
2. `POST /broadcasting/auth` status for `private-organizer.event.{id}.scans`
3. Reverb / queue logs when a scan is POSTed
4. Sample WebSocket frame for `.scan.batch_recorded`

Related: [`frontend-realtime-integration-guide.md`](frontend-realtime-integration-guide.md), [`frontend-realtime-chat-backend-gaps.md`](frontend-realtime-chat-backend-gaps.md)
