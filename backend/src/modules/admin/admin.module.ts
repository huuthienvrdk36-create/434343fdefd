import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserSchema } from '../users/user.schema';
import { OrganizationSchema } from '../organizations/organization.schema';
import { BookingSchema } from '../bookings/booking.schema';
import { PaymentSchema } from '../payments/payment.schema';
import { DisputeSchema } from '../disputes/dispute.schema';
import { QuoteSchema } from '../quotes/quote.schema';
import { ReviewSchema } from '../reviews/review.schema';
import { PlatformConfigSchema } from '../platform-config/platform-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Booking', schema: BookingSchema },
      { name: 'Payment', schema: PaymentSchema },
      { name: 'Dispute', schema: DisputeSchema },
      { name: 'Quote', schema: QuoteSchema },
      { name: 'Review', schema: ReviewSchema },
      { name: 'PlatformConfig', schema: PlatformConfigSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET || 'auto-platform-jwt-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
