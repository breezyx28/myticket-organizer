# Frontend handoff — real-time scan live feed (Reverb)

**Date:** 2026-05-18  
**Audience:** Organizer dashboard + Scanner app React teams  
**Prerequisite:** [`docs/socket-and-chat/frontend-realtime-integration-guide.md`](socket-and-chat/frontend-realtime-integration-guide.md) (Echo, Sanctum, `/broadcasting/auth`)

---

## Overview

When a scanner submits a ticket scan, the organizer event live-scan page receives batched rows and counter updates over Reverb. The scanner app continues to use the synchronous HTTP `201` response as the source of truth; WebSocket echo is optional.

| App | Primary transport | Channel |
|-----|-------------------|---------|
| **Scanner** | `POST /scanner/scans` → `data.result` | Optional: `private-scanner.{accountId}.scans` |
| **Organizer** | Reverb on event page | `private-organizer.event.{eventId}.scans` |

---

## Organizer dashboard

### 1. Bootstrap on live-scan page load

```http
GET /api/v1/organizer/events/{eventId}/scan-live
Authorization: Bearer {organizer_token}
```

**200 (Reverb enabled in production)**

```json
{
  "transport": "reverb",
  "channel": "private-organizer.event.18.scans",
  "auth_endpoint": "https://myticket-api.kat-jr.com/broadcasting/auth",
  "events": {
    "scan.batch_recorded": "Append rows to live feed",
    "scan.stats_updated": "Update counters header"
  },
  "initial_stats": {
    "ok": 120,
    "duplicate": 4,
    "invalid": 2,
    "expired": 0,
    "wrong_event": 1,
    "total": 127
  },
  "fallback": {
    "transport": "polling",
    "endpoint": "/api/v1/organizer/events/18/scan-logs?since=<iso8601>"
  }
}
```

When `transport` is `polling`, subscribe only to REST polling (no Echo).

### 2. Subscribe with Echo

```typescript
const { channel, auth_endpoint, initial_stats } = await fetchScanLive(eventId);

setStats(initial_stats);

const echoChannel = echo.private(channel.replace(/^private-/, ''));

echoChannel.listen('.scan.batch_recorded', (envelope: ScanBatchEnvelope) => {
  prependRows(envelope.payload.items);
});

echoChannel.listen('.scan.stats_updated', (envelope: ScanStatsEnvelope) => {
  setStats(envelope.payload.stats);
});
```

### 3. Event payloads

**`.scan.batch_recorded`**

```json
{
  "type": "scan.batch_recorded",
  "payload": {
    "event_id": 18,
    "count": 2,
    "items": [
      {
        "id": 101,
        "event_id": 18,
        "scanner_account_id": 1,
        "scanner_name": "Gate A",
        "device_id": 3,
        "ticket_ref": "TIC-…",
        "result": "ok",
        "failure_reason": null,
        "scanned_at": "2026-05-20T12:15:35Z"
      }
    ]
  },
  "occurred_at": "2026-05-20T12:15:36Z"
}
```

**`.scan.stats_updated`**

```json
{
  "type": "scan.stats_updated",
  "payload": {
    "event_id": 18,
    "stats": {
      "ok": 121,
      "duplicate": 4,
      "invalid": 2,
      "expired": 0,
      "wrong_event": 1,
      "total": 128,
      "last_scan_at": "2026-05-20T12:15:35Z",
      "active_scanners": 3
    }
  },
  "occurred_at": "2026-05-20T12:15:36Z"
}
```

### 4. Reconcile / polling fallback

On reconnect, tab focus, or every ~30 seconds:

```http
GET /api/v1/organizer/events/{eventId}/scan-logs?since=2026-05-20T12:00:00Z
```

- `since` — ISO8601 timestamp of the newest row you already have.
- Response is a Laravel paginator; each row includes presenter fields (`scanner_name`, `device_id`, `result`, etc.).
- Merge by `id` to avoid duplicates.

---

## Scanner app

### 1. Submit scan (unchanged — canonical UX)

```http
POST /api/v1/scanner/scans
Authorization: Bearer {scanner_token}

{
  "event_id": 18,
  "ticket_code": "TIC-…",
  "device_id": 3
}
```

Render success/failure immediately from `data.result` (`ok`, `duplicate`, `invalid`, `expired`, `wrong_event`).

### 2. Optional multi-device echo

After login, `scanner_account.id` is available from the login/`/me` payload.

```typescript
echo.private(`scanner.${accountId}.scans`).listen('.scan.recorded', (envelope) => {
  // Optional: sync UI if another device scanned the same account
});
```

**`.scan.recorded`** payload matches a single compact row (same shape as items in `scan.batch_recorded`).

---

## Channel authorization

Both channels are **private**; Echo must send the organizer/scanner Sanctum token to `/broadcasting/auth`.

| Channel pattern | Who may subscribe |
|-----------------|-------------------|
| `organizer.event.{eventId}.scans` | Organizer user who owns the event (`events.organizer_id` = their active `organizer_profiles` row) |
| `scanner.{scannerAccountId}.scans` | Scanner user linked to that active account, which must belong to an active organizer profile |

**Organizer isolation:** Live scan sockets are scoped by organizer relation — not a global feed.

- Organizers only authorize for events they own; another organizer cannot subscribe to your event channel even with the event ID.
- Scanner echo channels are per `scanner_accounts` row; only the linked scanner user may subscribe.
- Realtime publish is skipped unless `scanner_accounts.organizer_profile_id` matches `events.organizer_id` for the scan.
- HTTP scan submit rejects cross-organizer scanner/event pairs with `result: wrong_event` and `failure_reason: scanner_not_owned_by_event_organizer`.

Implementation: `App\Domains\Scanners\Support\ScanLiveAuthorization` (used by `routes/channels.php`, `ScanRealtimePublisher`, and `ScannerService`).

---

## Environment (same as chat)

Organizer and scanner SPAs use the same Reverb env vars as documented in the unified realtime guide:

```env
VITE_REVERB_APP_KEY=…
VITE_REVERB_HOST=myticket-api.kat-jr.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Backend production must set `BROADCAST_CONNECTION=reverb` and run queue workers with the `broadcasts` queue (see `docs/operations.md`).

---

## Checklist

**Organizer**

- [ ] Call `GET …/events/{id}/scan-live` when opening live-scan view
- [ ] Subscribe to returned private channel
- [ ] Handle `.scan.batch_recorded` and `.scan.stats_updated`
- [ ] Poll `GET …/scan-logs?since=` on reconnect / interval
- [ ] Seed header counters from `initial_stats`

**Scanner**

- [ ] Keep HTTP `POST /scanner/scans` as primary feedback
- [ ] (Optional) Subscribe to `scanner.{accountId}.scans` for cross-device sync
