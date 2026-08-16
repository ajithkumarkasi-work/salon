import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { CreateCouponDto, UpdateCouponDto } from '@glowbook/validation';

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CouponsController {
  constructor(private coupons: CouponsService) {}

  @Post('salon/:salonId')
  create(
    @Param('salonId') salonId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateCouponDto,
  ) {
    return this.coupons.create(salonId, user.id, user.role, dto);
  }

  @Get('salon/:salonId')
  findBySalon(@Param('salonId') salonId: string) {
    return this.coupons.findBySalon(salonId);
  }

  @Post('validate')
  validate(
    @CurrentUser() user: JwtUser,
    @Body('code') code: string,
    @Body('salonId') salonId: string,
    @Body('amount') amount: number,
  ) {
    return this.coupons.validate(code, salonId, amount, user.id);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.coupons.deactivate(id, user.id, user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.coupons.update(id, user.id, user.role, dto);
  }
}
