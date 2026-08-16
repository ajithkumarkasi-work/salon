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
import { SalonsService } from './salons.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { UserRole } from '@glowbook/shared-types';
import { CreateSalonDto, UpdateSalonDto } from '@glowbook/validation';

@ApiTags('salons')
@Controller('salons')
export class SalonsController {
  constructor(private salons: SalonsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get all salon categories' })
  getCategories() {
    return this.salons.getCategories();
  }

  @Get()
  @ApiOperation({ summary: 'List salons with search and filter' })
  findAll(
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minRating') minRating?: string,
    @Query('priceRange') priceRange?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salons.findAll({
      search,
      city,
      categoryId,
      minRating: minRating ? parseFloat(minRating) : undefined,
      priceRange: priceRange ? parseInt(priceRange) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 50) : 20,
    });
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get owner salons' })
  getOwnerSalons(@CurrentUser() user: JwtUser) {
    return this.salons.getOwnerSalons(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get salon details' })
  findOne(@Param('id') id: string) {
    return this.salons.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a salon' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateSalonDto) {
    return this.salons.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update salon' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateSalonDto,
  ) {
    return this.salons.update(id, user.id, dto);
  }

  @Post(':id/working-hours')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  updateWorkingHours(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: { hours: any[] },
  ) {
    return this.salons.updateWorkingHours(id, user.id, body.hours);
  }

  @Post(':id/holidays')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SALON_OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  addHoliday(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: { date: string; name: string },
  ) {
    return this.salons.addHoliday(id, user.id, body.date, body.name);
  }
}
