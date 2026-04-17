export type UserRole = 'organizer' | 'attendee';

export type OrganizerUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Public-facing organizer name */
  displayName: string;
  /** Long-form description of organizer/events */
  bio: string;
  /** Primary contact phone (E.164 or local) */
  phone: string;
  /** Primary operating city */
  city: string;
  /** Logo image URL (optional) */
  logoUrl: string;
  /** Required organization document (e.g. CR/permit scan) */
  organizationDocument?: string;
  /** Gallery of venue/past event images */
  gallery: string[];
  venue?: {
    name: string;
    address: string;
    city: string;
    capacity: number | null;
    facilities: string[];
  };
  organization?: {
    website?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    previousEvents: string[];
    typicalEventDurationHours?: number | null;
    categories: string[];
  };
};

export type EventStatus =
  | 'draft'
  | 'published'
  | 'sold_out'
  | 'in_progress'
  | 'ended'
  | 'cancelled'
  | 'archived';

export type LayoutType = 'grid' | 'section' | 'free';

export type EntryMode = 'one_time' | 'multi_scan';

export type TicketTypeDef = {
  id: string;
  label: string;
  /** For free layout: max qty of this type */
  quantityLimit?: number;
  defaultPrice: number;
};

export type SeatCell = {
  id: string;
  row: number;
  col: number;
  section?: string;
  ticketTypeId: string;
  price: number;
  accessibility: boolean;
};

export type RecurrencePattern = {
  weekdays: number[]; // 0 Sun .. 6 Sat
  windowStart: string; // ISO date
  windowEnd: string;
};

export type EventOccurrence = {
  id: string;
  eventId: string;
  startsAt: string;
  endsAt: string;
  status: 'scheduled' | 'cancelled';
  ticketsSold: number;
};

export type OrganizerEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  layoutType: LayoutType;
  rows: number;
  cols: number;
  rowGap: number;
  colGap: number;
  /** Per-row gap overrides (optional) */
  rowGaps?: Record<number, number>;
  colGaps?: Record<number, number>;
  capacity: number;
  ticketTypes: TicketTypeDef[];
  seats: SeatCell[];
  entryMode: EntryMode;
  purchaseLimitPerUser?: number;
  multiDaySingleTicket: boolean;
  recurrence?: RecurrencePattern | null;
  occurrences: EventOccurrence[];
  /** Sold count for published events (mock aggregate) */
  ticketsSold: number;
  /** Revenue mock */
  revenueGross: number;
  /** Sold-out waitlist counter (mock) */
  waitlistCount?: number;
  postEventMedia: { kind: 'video' | 'photo'; label: string }[];
  /** Last impactful edit simulation */
  lastChangeLog?: { field: string; old: string; new: string; at: string }[];
};

export type ScannerAccount = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  assignedEventIds: string[];
};

export type ScanLog = {
  id: string;
  eventId: string;
  scannerId: string;
  ticketRef: string;
  at: string;
  result: 'ok' | 'duplicate' | 'invalid';
};

export type BookingActivity = {
  id: string;
  eventId: string;
  eventTitle: string;
  buyerEmail: string;
  qty: number;
  at: string;
  amount: number;
  seatRef?: string;
  ticketType?: string;
};

export type AuctionListingMock = {
  id: string;
  eventId: string;
  eventTitle: string;
  status: 'active' | 'sold' | 'expired';
  startingPrice: number;
  finalPrice?: number;
  createdAt: string;
  closedAt?: string;
};

export type RatingItem = {
  id: string;
  from: string;
  score: number;
  comment: string;
  eventTitle: string;
  eventId?: string;
  at: string;
};

export type GivenRating = {
  id: string;
  to: string;
  role: 'talent' | 'vendor';
  score: number;
  comment: string;
  eventTitle: string;
  eventId?: string;
  at: string;
};

export type OrganizerRatingAggregate = {
  overallAverage: number;
  totalReceived: number;
  byEvent: { eventId: string; eventTitle: string; average: number; count: number }[];
};

export type FinanceSnapshot = {
  gross: number;
  platformFees: number;
  net: number;
  refunds: number;
  payoutStatus: 'scheduled' | 'paid' | 'held';
  refundBreakdown?: { reason: string; amount: number }[];
  feeAdjustments?: { label: string; amount: number }[];
};

export type EventChangeNotification = {
  id: string;
  eventId: string;
  eventTitle: string;
  createdAt: string;
  kind: 'edited' | 'cancelled';
  changes?: { field: string; old: string; new: string }[];
};

export type OrganizerDashboardState = {
  profile: OrganizerUser;
  events: OrganizerEvent[];
  scanners: ScannerAccount[];
  scanLogs: ScanLog[];
  bookings: BookingActivity[];
  ratings: RatingItem[];
  givenRatings?: GivenRating[];
  finance: FinanceSnapshot;
  /** Optional placeholder for auction listings used in analytics only */
  auctions?: AuctionListingMock[];
  notifications?: EventChangeNotification[];
};
