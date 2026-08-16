import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { CreateReviewDto } from '@glowbook/validation';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post('appointments/:id/review')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  create(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(id, user.id, dto);
  }

  @Get('salons/:id/reviews')
  findBySalon(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviews.findBySalon(id, parseInt(page ?? '1'), parseInt(limit ?? '20'));
  }
}
