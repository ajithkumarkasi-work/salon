import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private availability: AvailabilityService) {}

  @Get()
  @ApiOperation({ summary: 'Get available appointment slots' })
  getSlots(
    @Query('salonId') salonId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.availability.getAvailableSlots({ salonId, serviceId, date, staffId });
  }
}
