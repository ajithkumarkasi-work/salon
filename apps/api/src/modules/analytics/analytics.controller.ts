import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtUser,
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analytics.getSalonSummary(
      salonId,
      new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      new Date(endDate || new Date().toISOString()),
    );
  }

  @Get('revenue')
  getRevenue(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analytics.getRevenueChart(
      salonId,
      new Date(startDate),
      new Date(endDate),
      groupBy,
    );
  }

  @Get('services')
  getPopularServices(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analytics.getPopularServices(salonId, new Date(startDate), new Date(endDate));
  }

  @Get('staff-performance')
  getStaffPerformance(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analytics.getStaffPerformance(salonId, new Date(startDate), new Date(endDate));
  }

  @Get('peak-hours')
  getPeakHours(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analytics.getPeakHours(salonId, new Date(startDate), new Date(endDate));
  }

  @Get('platform')
  getPlatformSummary() {
    return this.analytics.getPlatformSummary();
  }
}
