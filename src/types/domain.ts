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
  /** Primary operating city (display name; optional if `cityId` is set) */
  city: string;
  /** Saudi city id from reference API (`city_id`, integer as string) */
  cityId?: string;
  /** Saudi region id from reference API (`region_id`, integer as string) */
  regionId?: string;
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
    regionId?: string;
    cityId?: string;
    latitude?: number | null;
    longitude?: number | null;
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
  | 'pending_approval'
  | 'rejected'
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
  /** Parent event id from API (`event_id`); used to validate seat linkage. */
  eventId?: string;
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

export type EventGalleryItem = {
  /** Server row id (required for DELETE /events/{id}/gallery/{itemId}). */
  id: string;
  /** Public image URL (https or absolute path). */
  url: string;
};

export type EventPartnerLink = {
  id: string;
  profileId: string;
  displayName: string;
  slug?: string;
  role: 'talent' | 'vendor';
};

export type MarketplaceMetadata = {
  targetType: 'talent' | 'vendor';
  targetId: string;
  brief?: string;
  eventId?: string;
};

export type ConversationParticipant = {
  id: string;
  userId: string;
  role: 'organizer' | 'talent' | 'vendor';
  displayName: string;
  email?: string;
};

export type Conversation = {
  id: string;
  type: string;
  subject: string;
  status: 'open' | 'closed';
  contextType?: string;
  contextId?: string;
  metadata?: MarketplaceMetadata;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  unread: boolean;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: string;
  body: string;
  attachmentUrl?: string;
  readAt?: string;
  createdAt: string;
};

export type ConversationsListPage = {
  data: Conversation[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type MarketplaceCategoryOption = {
  id: string;
  name: string;
  slug?: string;
};

export type TalentListing = {
  profileId: string;
  slug: string;
  displayName: string;
  headline: string;
  city: string;
  coverImageUrl: string;
  categoryLabel?: string;
  ratingSummary?: string;
  regionId?: string;
  cityId?: string;
  categories: MarketplaceCategoryOption[];
};

export type VendorListing = {
  profileId: string;
  slug: string;
  displayName: string;
  headline: string;
  city: string;
  coverImageUrl: string;
  serviceLabel?: string;
  ratingSummary?: string;
  regionId?: string;
  cityId?: string;
  categories: MarketplaceCategoryOption[];
};

export type MarketplaceProfileDetail = (TalentListing | VendorListing) & {
  description?: string;
  bio?: string;
};

export type OrganizerEvent = {
  id: string;
  title: string;
  description: string;
  /** Display label (from API or category list). */
  category: string;
  /** Event category FK from main `events/categories` list — PATCH as `category_id`. */
  categoryId?: string;
  venue: string;
  city: string;
  /** Venue coordinates from API (decimal degrees). */
  latitude?: number | null;
  longitude?: number | null;
  /** Saudi region id (reference API) when event PATCH supports `region_id`. */
  regionId?: string;
  /** Saudi city id (reference API) when event PATCH supports `city_id`. */
  cityId?: string;
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
  /** Marketing / hero gallery (from GET event; manage via POST/DELETE gallery endpoints). */
  eventGallery: EventGalleryItem[];
  postEventMedia: { kind: 'video' | 'photo'; label: string }[];
  /** Linked talent/vendor profiles on this event. */
  talents: EventPartnerLink[];
  vendors: EventPartnerLink[];
  showTalents: boolean;
  showVendors: boolean;
  /** Last impactful edit simulation */
  lastChangeLog?: { field: string; old: string; new: string; at: string }[];
};

export type ScannerAccount = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  assignedEventIds: string[];
  /** Present when API returns assignment ids (needed to DELETE unassign). */
  assignmentIdsByEventId?: Record<string, string>;
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
  /** From API `adjustments_total` when present */
  adjustments?: number;
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

export type AdminEventNotificationAction =
  | 'approved'
  | 'rejected'
  | 'featured'
  | 'unfeatured'
  | 'pinned'
  | 'unpinned';

export type AdminEventNotificationData = {
  admin_action: AdminEventNotificationAction;
  event_id: number;
  event_code: string;
  status: string;
  rejection_reason?: string;
};

export type OrganizerNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  data: AdminEventNotificationData | Record<string, unknown> | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsListPage = {
  data: OrganizerNotification[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  unread_count: number;
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
