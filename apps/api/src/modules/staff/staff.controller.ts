import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@glowbook/shared-types';
import { CreateStaffDto, UpdateStaffDto } from '@glowbook/validation';

@ApiTags('staff')
@Controller()
export class StaffController {
  constructor(private staff: StaffService) {}

  @Get('staff/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user staff profile' })
  getMyStaffProfile(@CurrentUser() user: JwtUser) {
    return this.staff.findMyProfile(user.id);
  }

  @Get('salons/:salonId/staff')
  @ApiOperation({ summary: 'Get salon staff' })
  findBySalon(@Param('salonId') salonId: string) {
    return this.staff.findBySalon(salonId);
  }

  @Get('staff/:id')
  @ApiOperation({ summary: 'Get staff member details' })
  findOne(@Param('id') id: string) {
    return this.staff.findOne(id);
  }

  @Post('salons/:salonId/staff')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add staff to salon' })
  create(
    @Param('salonId') salonId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateStaffDto,
  ) {
    return this.staff.create(salonId, user.id, user.role, dto);
  }

  @Patch('staff/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update staff member' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(id, user.id, user.role, dto);
  }

  @Post('staff/:id/working-hours')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  updateWorkingHours(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: { hours: any[] },
  ) {
    return this.staff.updateWorkingHours(id, user.id, user.role, body.hours);
  }

  @Post('staff/:id/leave')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  addLeave(
    @Param('id') id: string,
    @Body() body: { startDate: string; endDate: string; reason?: string },
  ) {
    return this.staff.addLeave(id, body.startDate, body.endDate, body.reason);
  }

  @Delete('staff/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate staff member' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.staff.remove(id, user.id, user.role);
  }
}
