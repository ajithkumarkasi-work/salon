import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto } from '@glowbook/validation';
import { UserRole } from '@glowbook/shared-types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findMyProfile(userId: string) {
    return this.prisma.staff.findFirst({
      where: { userId, isActive: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        salon: { select: { id: true, name: true, city: true, state: true } },
        services: {
          select: {
            service: {
              select: { id: true, name: true, price: true, duration: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findBySalon(salonId: string) {
    return this.prisma.staff.findMany({
      where: { salonId, isActive: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        services: {
          select: {
            service: {
              select: { id: true, name: true, price: true, duration: true },
            },
          },
        },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        services: true,
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        leaves: { where: { endDate: { gte: new Date() } }, orderBy: { startDate: 'asc' } },
      },
    });

    if (!staff) throw new NotFoundException('Staff member not found');

    const stats = await this.getStaffStats(staffId);
    return { ...staff, stats };
  }

  async create(salonId: string, userId: string, role: string, dto: CreateStaffDto) {
    await this.assertSalonOwnership(salonId, userId, role);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: UserRole.STAFF,
        },
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          salonId,
          bio: dto.bio,
          role: dto.role,
          services: {
            create: dto.serviceIds.map((serviceId) => ({ serviceId })),
          },
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          services: true,
        },
      });

      return staff;
    });
  }

  async update(staffId: string, userId: string, role: string, dto: UpdateStaffDto) {
    const staff = await this.assertOwnership(staffId, userId, role);

    const { serviceIds, firstName, lastName, email, phone, ...staffFields } = dto;

    return this.prisma.$transaction(async (tx) => {
      const userData: any = {};
      if (firstName !== undefined) userData.firstName = firstName;
      if (lastName !== undefined) userData.lastName = lastName;
      if (email !== undefined) userData.email = email;
      if (phone !== undefined) userData.phone = phone;

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: staff.userId },
          data: userData,
        });
      }

      if (serviceIds) {
        await tx.staffService.deleteMany({ where: { staffId } });
        await tx.staffService.createMany({
          data: serviceIds.map((serviceId) => ({ staffId, serviceId })),
        });
      }

      return tx.staff.update({
        where: { id: staffId },
        data: staffFields,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
          services: {
            select: {
              service: {
                select: { id: true, name: true, price: true, duration: true },
              },
            },
          },
          workingHours: true,
        },
      });
    });
  }

  async remove(staffId: string, userId: string, role: string) {
    await this.assertOwnership(staffId, userId, role);

    return this.prisma.staff.update({
      where: { id: staffId },
      data: { isActive: false },
    });
  }

  async updateWorkingHours(staffId: string, userId: string, role: string, hours: any[]) {
    await this.assertOwnership(staffId, userId, role);

    await this.prisma.workingHour.deleteMany({ where: { staffId } });

    return this.prisma.workingHour.createMany({
      data: hours.map((h) => ({ ...h, staffId })),
    });
  }

  async addLeave(staffId: string, startDate: string, endDate: string, reason?: string) {
    return this.prisma.staffLeave.create({
      data: {
        staffId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        isApproved: true,
      },
    });
  }

  private async getStaffStats(staffId: string) {
    const [completedCount, totalRevenue, avgRating] = await Promise.all([
      this.prisma.appointment.count({
        where: { staffId, status: 'COMPLETED' },
      }),
      this.prisma.appointment.aggregate({
        where: { staffId, status: 'COMPLETED' },
        _sum: { total: true },
      }),
      this.prisma.review.aggregate({
        where: { staffId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      completedAppointments: completedCount,
      totalRevenue: totalRevenue._sum.total ?? 0,
      averageRating: avgRating._avg.rating ?? 0,
      reviewCount: avgRating._count.rating,
    };
  }

  private async assertOwnership(staffId: string, userId: string, role: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: { salon: { select: { ownerId: true } } },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    if (role === UserRole.ADMIN) return staff;
    if (staff.salon.ownerId !== userId) throw new ForbiddenException('Access denied');
    return staff;
  }

  private async assertSalonOwnership(salonId: string, userId: string, role: string) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundException('Salon not found');
    if (role === UserRole.ADMIN) return salon;
    if (salon.ownerId !== userId) throw new ForbiddenException('Access denied');
    return salon;
  }
}
