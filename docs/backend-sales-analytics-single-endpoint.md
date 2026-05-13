# Backend Handoff: Single Endpoint for Sales Analytics Page

## Goal

Replace multiple frontend calls and client-side aggregation with **one backend endpoint** that returns all data required by `SalesAnalyticsPage`.

Current frontend behavior fans out into many calls:
- `GET /organizer/events` (list events)
- `GET /organizer/events/{id}/orders` for each event
- `GET /organizer/events/{id}/tickets` for each event
- local aggregation for KPI cards, trend chart, inventory chart, ticket mix, and recent bookings table

This is expensive and causes slow/duplicated requests.

---

## Proposed Endpoint

`GET /api/v1/organizer/analytics/sales`

Auth:
- `Authorization: Bearer <organizer_token>`
- Organizer scope/app guard (same as other organizer APIs)
- Must return data only for events owned by the authenticated organizer

---

## Query Params

All params optional unless stated:

- `from` (ISO datetime or `YYYY-MM-DD`)
- `to` (ISO datetime or `YYYY-MM-DD`)
- `timezone` (default: `Asia/Riyadh`)
- `event_ids[]` (filter analytics to specific events)
- `limit_recent_bookings` (default `12`, max `100`)
- `bucket` (for trend): `hour` | `day` (default `hour`)

Notes:
- If `from/to` missing, backend may default to last 30 days.
- Time bucketing and formatting should be done server-side in the requested timezone.

---

## Response Shape (single payload)

```json
{
  "data": {
    "summary": {
      "total_tickets_sold": 0,
      "total_revenue_gross": 0,
      "live_or_upcoming_events": 0,
      "event_count": 0,
      "avg_order_value": 0
    },
    "revenue_trend": [
      {
        "bucket_start": "2026-05-13T08:00:00+03:00",
        "label": "08:00",
        "revenue": 0
      }
    ],
    "ticket_type_mix": [
      {
        "label": "VIP",
        "qty": 0
      }
    ],
    "event_inventory": [
      {
        "event_id": "15",
        "event_title": "Test Event",
        "sold": 0,
        "remaining": 0,
        "gross": 0,
        "by_type": {
          "VIP": 0,
          "Standard": 0
        }
      }
    ],
    "recent_bookings": [
      {
        "id": "ord_123",
        "event_id": "15",
        "event_title": "Test Event",
        "buyer_email": "buyer@example.com",
        "qty": 2,
        "amount": 240,
        "ticket_type": "VIP",
        "seat_ref": "A-12",
        "at": "2026-05-13T09:20:00+03:00"
      }
    ],
    "auction_activity": {
      "active": 0,
      "sold": 0,
      "expired": 0,
      "listings": []
    }
  },
  "meta": {
    "from": "2026-05-01",
    "to": "2026-05-31",
    "timezone": "Asia/Riyadh",
    "currency": "SAR",
    "generated_at": "2026-05-13T10:30:00+03:00"
  }
}
```

---

## Required Data for UI Sections

### 1) KPI cards
- `summary.total_tickets_sold`
- `summary.total_revenue_gross`
- `summary.live_or_upcoming_events`
- `summary.avg_order_value`
- `summary.event_count` (supporting metric)

### 2) Revenue trend chart
- `revenue_trend[].label` (x-axis)
- `revenue_trend[].revenue` (y-axis)

### 3) Ticket type mix chart
- `ticket_type_mix[].label`
- `ticket_type_mix[].qty`

### 4) Event inventory stacked chart + table
- `event_inventory[].event_title`
- `event_inventory[].sold`
- `event_inventory[].remaining`
- `event_inventory[].gross`
- `event_inventory[].by_type` (for future drill-down)

### 5) Recent bookings table
- `recent_bookings[].at`
- `recent_bookings[].event_title`
- `recent_bookings[].buyer_email`
- `recent_bookings[].ticket_type`
- `recent_bookings[].seat_ref`
- `recent_bookings[].qty`
- `recent_bookings[].amount`

### 6) Auction widget (can be zero/default for now)
- `auction_activity.active`
- `auction_activity.sold`
- `auction_activity.expired`
- `auction_activity.listings[]`

---

## Business Rules

- Organizer isolation: no cross-organizer data leakage.
- Money values returned as numeric (frontend formats `SAR`).
- `remaining = max(capacity - sold, 0)` for events with capacity.
- `live_or_upcoming_events` includes statuses:
  - `published`
  - `pending_approval`
  - `sold_out`
- `avg_order_value` = total booking amount / booking count (0 when no bookings).

---

## Performance Requirements

- Avoid N+1 per-event calls.
- Use grouped queries/materialized aggregates where possible.
- Target response time:
  - p50 < 300ms
  - p95 < 900ms
- Add index coverage for:
  - `events.organizer_id`
  - booking/order created timestamp
  - ticket type joins used in aggregation

---

## Error Contract

Use standard organizer API envelope:

```json
{
  "message": "Validation failed.",
  "errors": {
    "from": ["The from date is invalid."]
  }
}
```

Status codes:
- `200` success
- `401` unauthenticated
- `403` forbidden (not organizer scope)
- `422` invalid filters
- `500` unexpected server error

---

## Frontend Integration Plan

Once backend endpoint is available:

1. Add RTK query endpoint: `getSalesAnalytics`.
2. Replace these service calls:
   - `getSalesSummary()`
   - `getBookingVelocity()`
   - `getSalesByEvent()`
   - `getTicketTypeDistribution()`
   - `getAuctionActivity()`
3. Read all Sales page sections from one response payload.
4. Keep current UI shape unchanged (only data source changes).

---

## Acceptance Checklist

- [ ] One API call fully powers `SalesAnalyticsPage`
- [ ] No per-event orders/tickets fanout from frontend
- [ ] KPI/trend/mix/inventory/recent-bookings all rendered from single response
- [ ] Correct organizer isolation
- [ ] Reasonable response latency under production-like data volume
