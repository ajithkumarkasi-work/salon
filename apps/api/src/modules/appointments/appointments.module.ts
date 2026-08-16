import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AvailabilityModule } from '../availability/availability.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GatewayModule } from '../../gateway/gateway.module';

@Module({
  imports: [AvailabilityModule, NotificationsModule, GatewayModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
