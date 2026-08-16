import { Controller, Get, Post, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class FavoritesController {
  constructor(private favorites: FavoritesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    return this.favorites.findAll(user.id);
  }

  @Post(':salonId')
  add(@CurrentUser() user: JwtUser, @Param('salonId') salonId: string) {
    return this.favorites.add(user.id, salonId);
  }

  @Delete(':salonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtUser, @Param('salonId') salonId: string) {
    return this.favorites.remove(user.id, salonId);
  }

  @Get(':salonId/check')
  check(@CurrentUser() user: JwtUser, @Param('salonId') salonId: string) {
    return this.favorites.isFavorite(user.id, salonId);
  }
}
