import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@glowbook/shared-types';
import { CreateServiceDto, UpdateServiceDto } from '@glowbook/validation';

@ApiTags('services')
@Controller()
export class ServicesController {
  constructor(private services: ServicesService) {}

  @Get('salons/:salonId/services')
  findBySalon(@Param('salonId') salonId: string) {
    return this.services.findBySalon(salonId);
  }

  @Get('salons/:salonId/service-categories')
  getCategories(@Param('salonId') salonId: string) {
    return this.services.getCategories(salonId);
  }

  @Get('services/:id')
  findOne(@Param('id') id: string) {
    return this.services.findOne(id);
  }

  @Post('salons/:salonId/services')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  create(
    @Param('salonId') salonId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateServiceDto,
  ) {
    return this.services.create(salonId, user.id, user.role, dto);
  }

  @Patch('services/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  update(@Param('id') id: string, @CurrentUser() user: JwtUser, @Body() dto: UpdateServiceDto) {
    return this.services.update(id, user.id, user.role, dto);
  }

  @Delete('services/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.services.remove(id, user.id, user.role);
  }

  @Post('salons/:salonId/service-categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  createCategory(
    @Param('salonId') salonId: string,
    @CurrentUser() user: JwtUser,
    @Body() body: { name: string; icon?: string },
  ) {
    return this.services.createCategory(salonId, user.id, user.role, body.name, body.icon);
  }
}
