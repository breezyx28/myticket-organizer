# Organizer dashboard: frontend / OpenAPI / backend gaps

This document supports handoff to backend developers. The organizer SPA targets **[ORGANIZER_API_ENDPOINTS.md](../ORGANIZER_API_ENDPOINTS.md)** (authoritative route list): RTK Query endpoints in [`src/store/api/organizerApi.ts`](../src/store/api/organizerApi.ts) and [`src/store/api/organizerEndpoints.extra.ts`](../src/store/api/organizerEndpoints.extra.ts) cover that table, with **Zod** validating documented envelopes (paginator shell, `{ data }`, `{ message }`, raw arrays/models where listed). Response models beyond envelopes use **permissive** parsing (`unwrapEnvelope`, mappers) until sample JSON tightens schemas.

## Environment

- **Base URL**: hardcoded `ApiBaseUrl` in [`src/config/api.ts`](../src/config/api.ts).
- **Auth**: Bearer from `POST /api/v1/organizer/auth/login` (including **2FA** branch with `challenge_token` + second step `otp` per backend). Token in `sessionStorage` and Redux `auth.accessToken`. `POST .../auth/refresh` expects `{ token }` per markdown.
- **401 handling**: [`organizerBaseQuery`](../src/store/api/organizerBaseQuery.ts) on **401** (except `login`, `refresh`, `logout`, and public routes) calls **`POST .../auth/refresh`** once, updates the token, and **retries** the original request. Concurrent 401s share one in-flight refresh.

## Parity notes (intentional UI / product gaps)

| Area | Client behavior |
|------|-----------------|
| **Star ratings** | Not in organizer API. [`ratingsService`](../src/services/ratingsService.ts) maps **`GET /engagements`** into the legacy “ratings” UI shape with **score 0**; charts explain missing scores. |
| **Auction analytics** | No organizer route in the doc. [`getAuctionActivity`](../src/services/analyticsService.ts) returns empty counts. |
| **Scanner account edit/delete** | Not documented on `PATCH`/`DELETE /scanners/{id}`. UI is read-only for accounts; use **assign / unassign** and **`POST .../devices/{id}/revoke`** when device ids are available. |
| **Event change notifications** | Still [`sessionStorage`](../src/services/localDashboardExtras.ts) only — no API in the markdown table. |
| **Finance on error** | [`getFinance`](../src/services/financeService.ts) returns **zeros** if summary fails (no mock seed). |

## OpenAPI quality issues (if you still ship OpenAPI alongside markdown)

| Issue | Detail |
|--------|--------|
| Missing `200` / success schemas | OpenAPI may still declare empty success bodies; the client follows **ORGANIZER_API_ENDPOINTS.md** first. |
| `security: []` on organizer routes | Product expects Bearer + organizer app scope. |
| Mixed resource ID types | `events/{id}` numeric; UI normalizes to string ids for routing. |

## Domain model vs API payload

The UI still uses a **single** `OrganizerEvent` shape from [`src/types/domain.ts`](../src/types/domain.ts). `GET /events/{id}` returns `{ data: <Event with relations> }` per doc; [`mapEvent.ts`](../src/lib/api/mapEvent.ts) maps nested relations defensively. Dedicated resources (`ticket-types`, `seats`, …) have RTK endpoints for when the editor is split to multi-fetch.

### Event editor persistence

[`EventEditorPage`](../src/pages/events/EventEditorPage.tsx) persists changes through [`patchEvent`](../src/services/eventsService.ts) → **`PATCH /events/{id}`** with a body built by [`organizerEventPatchToApiBody`](../src/lib/api/mapEvent.ts) (monolithic merged event). RTK already defines split routes such as `listTicketTypes`, `createTicketType`, seat bulk helpers, and `postEventGallery` in [`organizerEndpoints.extra.ts`](../src/store/api/organizerEndpoints.extra.ts), but the editor **does not** call them yet. Whether the backend still accepts embedded ticket types / seats / gallery on the single `PATCH` or requires those nested endpoints must be confirmed against a real contract or sample payloads; until then the dashboard intentionally stays on one `patchEvent` save path to avoid double-writes.

Profile `PATCH` only validates `display_name`, `bio`, `contact_phone` per doc. The profile UI routes venue, social links, and previous events through the documented `/me/venues`, `/me/social-links`, and `/me/previous-events` mutations via [`profileService`](../src/services/profileService.ts). Finance overview uses `GET /me/finance/summary`, `GET /me/finance/exports`, `GET /me/bank-accounts`, and paginated `GET /me/payouts` via [`financeService`](../src/services/financeService.ts).

## Scanner assignments

- Assign: `POST .../scanners/{id}/assignments` with `{ event_id }` (Zod).  
- Unassign: `DELETE .../scanners/{id}/assignments/{assignmentId}` (response `{ data: … }` per doc).  
- Revoke device: `POST .../scanners/{id}/devices/{deviceId}/revoke`.

## Sample JSON checklist (to tighten Zod beyond envelope shells)

Provide **one real 200 body** per route so `unknown` / passthrough models can be replaced with strict fields.

---

*Updated for markdown parity with ORGANIZER_API_ENDPOINTS.md (RTK Query + Zod envelopes).*
