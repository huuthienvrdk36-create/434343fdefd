import { Schema } from 'mongoose';
import { OrganizationStatus } from '../../shared/enums';

/**
 * Provider Type for commission calculation
 */
export enum ProviderType {
  NEW = 'new',           // < 5 bookings
  ACTIVE = 'active',     // 5-50 bookings
  ESTABLISHED = 'established', // > 50 bookings
}

export const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    slug: { type: String, unique: true, sparse: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(OrganizationStatus),
      default: OrganizationStatus.DRAFT,
      index: true,
    },
    description: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    taxId: { type: String, default: '' },
    legalName: { type: String, default: '' },
    specializations: [{ type: String }],
    // Derived — recalculated separately
    ratingAvg: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    bookingsCount: { type: Number, default: 0 },
    completedBookingsCount: { type: Number, default: 0 },
    // Ranking System
    rankScore: { type: Number, default: 0, index: true },
    avgResponseTimeMinutes: { type: Number, default: null }, // average response time in minutes
    totalResponsesCount: { type: Number, default: 0 },
    // Boost / Monetization
    isBoosted: { type: Boolean, default: false, index: true },
    boostUntil: { type: Date, default: null },
    boostMultiplier: { type: Number, default: 1 }, // rankScore multiplier when boosted
    // Stats
    quotesReceivedCount: { type: Number, default: 0 },
    quotesRespondedCount: { type: Number, default: 0 },
    disputesCount: { type: Number, default: 0 },
    // Verified Badge - автоматично рахується
    isVerified: { type: Boolean, default: false, index: true },
    verifiedAt: { type: Date, default: null },
    // Popular Badge
    isPopular: { type: Boolean, default: false, index: true },
    bookingsLast30Days: { type: Number, default: 0 },

    // === 🔴 SUSPICIOUS DETECTION SYSTEM ===
    // Tracks providers who might be bypassing the platform
    suspiciousScore: { type: Number, default: 0, index: true },
    isShadowBanned: { type: Boolean, default: false, index: true },
    shadowBannedAt: { type: Date, default: null },
    shadowBanReason: { type: String, default: null },
    // Detailed anti-bypass metrics
    responsesWithoutBooking: { type: Number, default: 0 }, // High number = suspicious
    cancelledByCustomerCount: { type: Number, default: 0 }, // Customer cancelled after response
    avgBookingConversionRate: { type: Number, default: 0 }, // responses -> bookings ratio
    lastSuspiciousCheck: { type: Date, default: null },

    // === 🟡 DYNAMIC COMMISSION SYSTEM ===
    providerType: {
      type: String,
      enum: Object.values(ProviderType),
      default: ProviderType.NEW,
    },
    customCommissionPercent: { type: Number, default: null }, // Override if set
    loyaltyTier: { type: Number, default: 0 }, // 0-5, higher = lower commission
    repeatBookingRate: { type: Number, default: 0 }, // % of repeat customers
    totalPlatformFeesPaid: { type: Number, default: 0 }, // Lifetime fees paid

    // === 🔥 VISIBILITY ENGINE ===
    visibilityScore: { type: Number, default: 0, index: true },
    visibilityState: {
      type: String,
      enum: ['NORMAL', 'BOOSTED', 'LIMITED', 'SHADOW_LIMITED', 'SUSPENDED'],
      default: 'NORMAL',
      index: true,
    },
    isShadowLimited: { type: Boolean, default: false, index: true },
    shadowLimitedAt: { type: Date, default: null },
    shadowLimitReason: { type: String, default: null },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Compound indexes for ranking/visibility queries
OrganizationSchema.index({ status: 1, rankScore: -1 });
OrganizationSchema.index({ status: 1, visibilityScore: -1 });
OrganizationSchema.index({ isBoosted: 1, boostUntil: 1 });
OrganizationSchema.index({ isShadowLimited: 1, isShadowBanned: 1 });
