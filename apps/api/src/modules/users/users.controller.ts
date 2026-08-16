import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { UpdateProfileDto } from '@glowbook/validation';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  getProfile(@CurrentUser() user: JwtUser) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatarUrl: true, role: true, isActive: true,
        emailVerified: true, createdAt: true,
      },
    });
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatarUrl: true, role: true,
      },
    });
  }
}
