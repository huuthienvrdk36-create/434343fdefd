import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { BranchesModule } from './modules/branches/branches.module';
import { ServicesModule } from './modules/services/services.module';
import { ProviderServicesModule } from './modules/provider-services/provider-services.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { GeoModule } from './modules/geo/geo.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlatformConfigModule } from './modules/platform-config/platform-config.module';
import { SlotsModule } from './modules/slots/slots.module';
// 🧠 V5: Smart Matching Engine
import { MatchingModule } from './modules/matching/matching.module';
// 🗺️ V5: Map Decision Layer
import { MapModule } from './modules/map/map.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME || 'auto_platform',
    }),
    PlatformConfigModule, // Global module — settings & secrets
    NotificationsModule, // Global module — EventBus
    AuthModule,
    OrganizationsModule,
    BranchesModule,
    ServicesModule,
    ProviderServicesModule,
    VehiclesModule,
    QuotesModule,
    BookingsModule,
    GeoModule,
    ReviewsModule,
    FavoritesModule,
    PaymentsModule,
    DisputesModule,
    AdminModule,
    SlotsModule,
    // 🧠 V5: Smart Matching
    MatchingModule,
    // 🗺️ V5: Map Decision Layer
    MapModule,
  ],
})
export class AppModule {}
