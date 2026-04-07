import { Schema } from 'mongoose';
import { BookingStatus } from '../../shared/enums';

export const BookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null, index: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    providerServiceId: {
      type: Schema.Types.ObjectId,
      ref: 'ProviderService',
      required: true,
      index: true,
    },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', default: null, index: true },
    quoteResponseId: {
      type: Schema.Types.ObjectId,
      ref: 'QuoteResponse',
      default: null,
      index: true,
    },
    slotId: { type: Schema.Types.ObjectId, ref: 'BookingSlot', default: null, index: true },
    scheduledAt: { type: Date, default: null, index: true },
    // Payment status tracking
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'payment_pending', 'paid', 'refund_pending', 'refunded'],
      default: 'unpaid',
    },
    isPaid: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.DRAFT,
      index: true,
    },
    snapshot: {
      orgName: { type: String, default: '' },
      branchName: { type: String, default: '' },
      branchAddress: { type: String, default: '' },
      serviceName: { type: String, default: '' },
      price: { type: Number, default: 0 },
      customerName: { type: String, default: '' },
      vehicleBrand: { type: String, default: '' },
      vehicleModel: { type: String, default: '' },
    },
    customerNotes: { type: String, default: '' },
    providerNotes: { type: String, default: '' },
    cancellationReason: { type: String, default: '' },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    noShow: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ organizationId: 1, status: 1 });
BookingSchema.index({ branchId: 1, scheduledAt: 1 });
