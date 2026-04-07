import { Schema } from 'mongoose';
import { QuoteStatus } from '../../shared/enums';

export const QuoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null, index: true },
    requestedServiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
      index: true,
    },
    description: { type: String, default: '' },
    city: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: Object.values(QuoteStatus),
      default: QuoteStatus.PENDING,
      index: true,
    },
    responsesCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);
