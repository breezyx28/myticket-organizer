# MyTicket — Organizer Dashboard Flow

> **Type:** Organizer Dashboard (Standalone)  
> **URL:** `organizer.myticket.com`  
> **Users:** Organizer only  
> **Shared Flows:** See `myticket_shared_flow.md` for authentication, notifications, payment, localization, and ticket format  
> **Master Reference:** `myticket_platform_flow.md`  
> **Last Updated:** April 2026

---

## 1. Overview

The Organizer Dashboard is a standalone web application for event organizers. It provides comprehensive tools for event creation and management, scanner management, sales analytics, attendance tracking, financial oversight, marketplace hiring (via real-time chat), and event archiving. Only users with the **Organizer** role can access this dashboard.

---

## 2. Authentication

The Organizer Dashboard has its own login page. **Registration is not available** — Organizer accounts are created through the role application flow on the Main Website (approved by Admin).

### Login Page

- Email/password login and Google Social Login.
- Only users with the **Organizer** role can log in. Non-organizer credentials are rejected with an access denied message.
- See `myticket_shared_flow.md` Section 3.6 for login flow details.

### Forgot Password / Reset Password

- Available on the login page.
- See `myticket_shared_flow.md` Section 3.7 for the full password reset flow.

---

## 3. Dashboard Home

The Organizer Dashboard home screen provides an at-a-glance summary:

- Key metrics: total events, total tickets sold, total revenue, upcoming events.
- Quick actions: Create Event, View My Events, Manage Scanners.
- Recent activity: latest bookings, recent chat messages, recent scanner scans.

---

## 4. Event Creation & Management

### Event Creation Flow

1. Organizer creates an event (title, description, dates, location, category).
2. Organizer configures **event duration and schedule** (see Event Duration & Recurring Events below).
3. Selects a **layout type**:
   - **Grid** — cinema-style, with rows and columns.
   - **Section** — stadium/concert style, grouped sections.
   - **Free** — open event (no assigned seats).
4. For Grid/Section layouts:
   - Organizer selects a **pre-built seat template** OR customizes manually:
     - Define number of rows and columns.
     - Set spacing between seats and between rows.
     - Apply spacing to specific rows or columns independently.
5. Organizer configures **ticket types and pricing** (see Ticket Types & Pricing below).
6. Organizer configures **accessibility seats** (see Accessibility Seating below).
7. Organizer configures **ticket entry mode** (see Ticket Entry Mode below).
8. Organizer optionally sets **purchase limits** (see Purchase Limits below).
9. Organizer **publishes the event** — it goes live immediately and is visible to the public.
10. Organizer assigns Event Scanner accounts (see Section 6).

### Ticket Types & Pricing

The Organizer can define **multiple ticket types** for a single event. Pricing is assigned **per-seat** — each individual seat is assigned a ticket type and its corresponding price:

| Ticket Type | Description | Price |
|---|---|---|
| **VIP** | Premium seating | Set by Organizer per seat |
| **Standard** | General seating | Set by Organizer per seat |
| **Economy** | Budget seating | Set by Organizer per seat |
| **Accessibility** | Designated accessible seats | Set by Organizer per seat |
| *(Custom)* | Organizer-defined label | Set by Organizer per seat |

- Each **individual seat** is assigned a ticket type and price by the Organizer in the layout editor.
- Seats are not grouped into pricing tiers by section or row — the Organizer has **per-seat control** over which ticket type and price each seat receives.
- For **free-layout events**, the Organizer sets a **maximum event capacity** (total number of attendees) and defines ticket types with quantity limits instead of seat assignments. The total of all ticket type quantities cannot exceed the maximum capacity.

### Accessibility Seating

- The Organizer can designate specific seats as **accessibility / special needs seats** directly from the seat layout UI.
- Accessibility seats are selected visually by clicking on individual seats or seat groups in the layout editor.
- These seats have their own **ticket type** (e.g., "Accessibility") with a price set by the Organizer.
- Accessibility seats are visually distinguished on the public seat map so users can identify them easily.

### Event Duration & Recurring Events

Events are **fully customizable** in terms of duration and recurrence:

**Single-Day Events:**
- Standard event with a single start date/time and end date/time.

**Multi-Day Events:**
- An event can span **multiple consecutive days** (e.g., a 3-day festival).
- The Organizer configures the start date and end date.
- Ticketing is customizable: the Organizer decides whether one ticket covers the full duration or separate tickets are required per day.

**Recurring Events:**
- Organizer can create **recurring events** with a defined schedule pattern.
- Configuration includes:
  - **Start date** and **end date** of the recurrence window (e.g., 1 April to 30 April).
  - **Recurrence pattern**: specific days of the week (e.g., "every Friday", "every Tuesday and Thursday").
- The system generates individual event occurrences based on the pattern.
- Each occurrence can be managed independently (e.g., cancel a single occurrence without affecting the rest).
- Recurring events share the same base configuration (layout, ticket types, pricing) but each occurrence has its own ticket inventory and booking state.

### Purchase Limits

- The Organizer can set a **maximum number of tickets** a single user can purchase per event.
- This setting is **optional** — if not set, there is no limit (unlimited purchases per user).
- The Admin can also set or override purchase limits at the platform level.

### Ticket Entry Mode

Each event has a configurable **ticket entry mode** that determines how QR scanning behaves at the gate:

- **One-Time Entry (default):** The ticket is scanned once. After a successful scan, the ticket status is set to USED and cannot be scanned again.
- **Multi-Scan Mode:** The Organizer can enable multi-scan, allowing the ticket to be scanned **multiple times** throughout the event duration. The ticket remains valid until the event ends.

The entry mode is set during event creation and applies to all tickets for that event.

### Event Management

| Feature | Description |
|---|---|
| **My Events** | List of all events (active, draft, archived) with status indicators |
| **Create Event** | Quick access to event creation flow |
| **Edit Event** | Modify any published or draft event |
| **Duplicate Event** | Clone an archived or past event as a starting point for a new one |
| **Event Status** | Visual indicators: Draft, Published, Sold Out, In Progress, Ended, Cancelled, Archived |
| **Scanner Management** | Create, assign, update, and delete Event Scanner accounts; assign scanners to multiple events |

### Post-Publish Event Editing

Organizers **can edit** an event after it has been published. Editable fields include (but are not limited to): event date, time, location, description, layout, and ticket pricing.

**When an event is edited after tickets have been sold:**

1. The system displays a **strong alert with a disclaimer** to the Organizer before saving changes, warning them of the impact on existing ticket holders.
2. The system generates a **strong notification** (email + in-app) sent to every user who has already purchased a ticket for that event.
3. The notification clearly lists **each field that was changed**, showing the **old value** and the **new value** side by side, so users can see exactly what changed.
4. If the Organizer makes **significant changes** (e.g., event duration, date, time, location), the **Organizer is responsible for issuing refunds** to affected ticket holders. The platform facilitates the refund process, but the decision and financial responsibility lie with the Organizer.
5. If the Organizer changes the seat layout in a way that affects already-booked seats, those specific ticket holders are prioritized for notification and refund eligibility.

### Event Cancellation

The Organizer can cancel their own events:

1. Organizer confirms event cancellation.
2. The refund method is determined by the **cancellation agreement** between the platform and the Organizer. *(Details TBD — pending finalization with project owner.)*
3. All tickets for the event are marked CANCELLED.
4. Each affected user receives email + in-app notification with cancellation details and refund information.
5. Tickets listed in auction are also cancelled and refunded per the agreement terms.

---

## 5. Event Lifecycle & Archive

### Event Statuses

An event progresses through the following lifecycle:

| Status | Description |
|---|---|
| **Draft** | Event created but not yet published — only visible to the Organizer |
| **Published** | Event is live and visible to the public, tickets can be purchased |
| **Sold Out** | All tickets are booked — waitlist is available |
| **In Progress** | Event is currently happening (event day/time has started) |
| **Ended** | Event has concluded — scanning is closed, tickets marked expired |
| **Cancelled** | Event was cancelled — refunds processed per agreement |
| **Archived** | Post-event state — removed from public view, accessible to Organizer |

### Post-Event Archive

When an event ends, it transitions to **Archived** status:

- **Not visible to the public** — archived events are removed from search results, category pages, and the home page.
- **Accessible to the Organizer** via this dashboard for reference, analytics, and reuse.
- The Organizer can **duplicate an archived event** to create a new event with the same base configuration (layout, ticket types, pricing, description), applying small updates for the next occurrence.
- Archived events serve as **proof of business** — the Organizer can reference past events to demonstrate their track record.

### Post-Event Media

After an event ends, the Organizer can upload **post-event media** to the archived event:

- **Production videos** — highlight reels, recap videos, professional recordings of the event.
- **Photos** — additional event photography taken during the event.
- This media is stored on the Organizer's profile and associated with the event for:
  - **Marketing** — showcasing past work to attract future attendees, talents, and vendors.
  - **Client approvals** — demonstrating event quality to potential business partners.
  - **Portfolio building** — building the Organizer's reputation on the platform.

---

## 6. Scanner Management

### Scanner Assignment

- Organizer creates Event Scanner accounts by providing email addresses.
- Scanner accounts are **linked to the Organizer** — they belong to the Organizer, not to individual events.
- The Organizer **assigns scanners to specific events** from their dashboard. A single scanner can be assigned to **multiple events** simultaneously.
- The Organizer has full control over scanner-event associations: they can add, remove, or reassign scanners at any time.

### Scanner Lifecycle

- After an event ends, the scanner account remains active under the Organizer's management (it may still be assigned to other events).
- Organizer can create, update, or delete scanner accounts at any time from this dashboard.

---

## 7. Sales & Booking Analytics

| Metric | Description |
|---|---|
| **Total tickets sold** | Aggregate and per-event breakdown |
| **Tickets remaining** | Available inventory per ticket type |
| **Revenue** | Total revenue, per-event revenue, per-ticket-type revenue |
| **Sales over time** | Timeline chart showing ticket sales velocity (daily/weekly/monthly) |
| **Ticket type distribution** | Breakdown of sales by VIP, Standard, Economy, Accessibility, etc. |
| **Booking list** | Detailed list of all bookings with buyer info, seat, ticket type, purchase date |
| **Auction activity** | Tickets currently in auction, sold via auction, expired unsold |

---

## 8. Attendance & Scanner Activity

| Metric | Description |
|---|---|
| **Attendance count** | Number of tickets scanned (USED) vs. total sold |
| **Attendance rate** | Percentage of sold tickets that were actually scanned |
| **Scanner activity log** | Real-time or recent log of scans (timestamp, scanner, result) |
| **No-show count** | Tickets sold but not scanned by event end |

---

## 9. Financial Overview

| Feature | Description |
|---|---|
| **Gross revenue** | Total ticket sales before fees |
| **Platform fees** | Fees deducted (if applicable, based on admin configuration) |
| **Net revenue** | Revenue after fees |
| **Refunds issued** | Total refunds processed (cancellations, event edits, auction returns) |
| **Payout status** | Payment settlement status from the payment gateway |

---

## 10. Marketplace & Hiring — Organizer Side

### Browsing Profiles

- The Organizer can browse **Talent** and **Vendor** profiles in the Marketplace directly from this dashboard.
- Profiles display: name, bio, location, verification media (Talents), service categories (Vendors), image gallery, ratings, and availability status.

### Initiating Chat

The hiring process is facilitated through a **real-time chat system**:

1. **Browse & Discover:** The Organizer browses Talent and Vendor profiles. Both parties can view each other's public profile information.
2. **Initiate Chat:** The Organizer opens a **real-time chat** with a Talent or Vendor directly from their profile.
3. **Negotiate:** All negotiation happens within the chat — pricing, terms, scheduling, event details, and any other arrangement. Both parties can exchange messages, share documents, and discuss requirements in real time.
4. **Accept or Decline:** The Talent/Vendor either **accepts** or **declines** the engagement through the chat.
   - On **accept**: the Talent/Vendor's availability status is automatically changed to **"Reserved"** (visible on their Marketplace profile).
   - On **decline**: the Organizer is notified. No status change occurs.
5. **Post-Acceptance:** The Talent/Vendor can manually update their status back to **"Available"** or any other status at any time. The chat remains available for ongoing communication.

### Chat Management

| Feature | Description |
|---|---|
| **Chat conversations** | All active and past chat threads with Talents and Vendors |
| **Hired Talents** | Talents currently committed to the Organizer's events |
| **Hired Vendors** | Vendors currently committed, with event associations |

### Talent–Event & Vendor–Event Association

- Both **Talents** and **Vendors** hired for a specific event can be **publicly associated with that event** on the event page.
  - Talent example: _"Performing: [Talent Name]"_
  - Vendor example: _"Official catering by [Vendor Name]"_
- The Organizer has a **per-event show/hide toggle** for each association — they can choose to display or hide individual Talent and Vendor associations on the public event page.

| Feature | Description |
|---|---|
| **Talent–Event association** | Manage which talents are publicly linked to which events (show/hide toggle) |
| **Vendor–Event association** | Manage which vendors are publicly linked to which events (show/hide toggle) |

### Financial Independence

- The platform does **not** handle, process, or escrow any payments between Talents/Vendors and Organizers.
- All financial arrangements are handled **directly between the two parties** outside the platform.

---

## 11. Ratings Received

- The Organizer can view **average star ratings** from attendees for their past events.
- Ratings are displayed per event and as an overall organizer rating.
- The Organizer can also view ratings they have given to Talents and Vendors.

---

## 12. Organizer Profile Management

To use this dashboard (and to create events), the Organizer must complete their profile:

- **Personal information:** full name, contact details.
- **Bio:** description of the organization or event hosting background.
- **Organization document** *(required)*: official documentation proving the legitimacy of the organization or ownership/management of the event venue.
- **Image gallery** *(multiple images)*: photos of the venue, past events, or the organization itself.
- **Venue details** *(if applicable)*: venue size, location/address, maximum audience capacity, available facilities.
- **Organization details:** logo, social media links, website/link, previous events hosted, typical event duration, event types/categories.

Profile editing follows the same rules as `myticket_shared_flow.md` Section 3.8.
