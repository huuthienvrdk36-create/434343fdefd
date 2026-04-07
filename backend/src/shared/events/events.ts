// Platform Events - единая точка определения всех событий
export enum PlatformEvent {
  // Quote events
  QUOTE_CREATED = 'QUOTE_CREATED',
  QUOTE_RESPONDED = 'QUOTE_RESPONDED',
  QUOTE_ACCEPTED = 'QUOTE_ACCEPTED',
  QUOTE_CANCELLED = 'QUOTE_CANCELLED',
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',
  QUOTE_UPDATED = 'QUOTE_UPDATED', // 🟢 NEW: For realtime UI updates

  // Booking events
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_STARTED = 'BOOKING_STARTED',
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_NO_SHOW = 'BOOKING_NO_SHOW',
  BOOKING_UPDATED = 'BOOKING_UPDATED', // 🟢 NEW: For realtime UI updates

  // Payment events
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Slot events
  SLOT_RESERVED = 'SLOT_RESERVED',
  SLOT_RELEASED = 'SLOT_RELEASED',

  // Organization events
  ORGANIZATION_VERIFIED = 'ORGANIZATION_VERIFIED',
  ORGANIZATION_SUSPENDED = 'ORGANIZATION_SUSPENDED',
  ORGANIZATION_SHADOW_BANNED = 'ORGANIZATION_SHADOW_BANNED', // 🔴 NEW: Suspicious detection

  // User events
  USER_REGISTERED = 'USER_REGISTERED',
  USER_BLOCKED = 'USER_BLOCKED',

  // 🟡 NEW: Commission events
  COMMISSION_CALCULATED = 'COMMISSION_CALCULATED',
  LOYALTY_TIER_UPDATED = 'LOYALTY_TIER_UPDATED',
}

export interface EventPayload {
  event: PlatformEvent;
  timestamp: Date;
  data: Record<string, any>;
  meta?: {
    userId?: string;
    organizationId?: string;
    branchId?: string;
    cityId?: string;
  };
}
