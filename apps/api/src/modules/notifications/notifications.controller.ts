import { Controller, Get, Patch, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.findForUser(user.id, parseInt(page ?? '1'), parseInt(limit ?? '20'));
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.notifications.markRead(id, user.id);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: JwtUser) {
    return this.notifications.markAllRead(user.id);
  }
}
