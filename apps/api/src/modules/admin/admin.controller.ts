import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@glowbook/shared-types';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('salons')
  async getSalons(@Query('page') page = '1', @Query('limit') limit = '20', @Query('search') search?: string) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.salon.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          owner: { select: { firstName: true, lastName: true, email: true } },
          category: true,
          _count: { select: { staff: true, appointments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.salon.count({ where }),
    ]);

    return { data, meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('users')
  async getUsers(@Query('page') page = '1', @Query('limit') limit = '20', @Query('role') role?: string) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (role) where.role = role;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, createdAt: true,
          _count: { select: { appointments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } };
  }

  @Patch('salons/:id/suspend')
  suspendSalon(@Param('id') id: string) {
    return this.prisma.salon.update({ where: { id }, data: { isActive: false } });
  }

  @Patch('salons/:id/activate')
  activateSalon(@Param('id') id: string) {
    return this.prisma.salon.update({ where: { id }, data: { isActive: true } });
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: true } });
  }
}
