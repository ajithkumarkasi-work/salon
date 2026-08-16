import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SalonsModule } from './modules/salons/salons.module';
import { ServicesModule } from './modules/services/services.module';
import { StaffModule } from './modules/staff/staff.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AdminModule } from './modules/admin/admin.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    GatewayModule,
    AuthModule,
    UsersModule,
    SalonsModule,
    ServicesModule,
    StaffModule,
    AvailabilityModule,
    AppointmentsModule,
    PaymentsModule,
    ReviewsModule,
    NotificationsModule,
    FavoritesModule,
    AnalyticsModule,
    CouponsModule,
    AdminModule,
  ],
})
export class AppModule {}
