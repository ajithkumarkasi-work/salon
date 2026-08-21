import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  UpdateAppointmentStatusDto,
  UpdateAppointmentStatusesDto,
} from '@glowbook/validation';

@ApiTags('appointments')
@Controller('appointments')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private appointments: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create appointment' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments for current user' })
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('salonId') salonId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.appointments.findAll(user.id, user.role, {
      status,
      search,
      salonId,
      startDate,
      endDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 50) : 20,
    });
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get salon calendar view' })
  getCalendar(
    @CurrentUser() user: JwtUser,
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.appointments.getSalonCalendar(salonId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment details' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.appointments.findOne(id, user.id, user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update appointment status (staff/owner)' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointments.updateStatus(id, user.id, dto);
  }

  @Patch('statuses')
  @ApiOperation({ summary: 'Update one or more appointment statuses' })
  updateStatuses(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateAppointmentStatusesDto,
  ) {
    return this.appointments.updateStatuses(dto.updates, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel appointment' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointments.cancel(id, user.id, dto);
  }

  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule appointment' })
  reschedule(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointments.reschedule(id, user.id, dto);
  }

  @Post('qr-checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'QR code check-in' })
  qrCheckIn(@CurrentUser() user: JwtUser, @Body('qrCode') qrCode: string) {
    return this.appointments.qrCheckIn(qrCode, user.id);
  }
}
