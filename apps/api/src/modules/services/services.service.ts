import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from '@glowbook/validation';
import { UserRole } from '@glowbook/shared-types';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findBySalon(salonId: string) {
    return this.prisma.service.findMany({
      where: { salonId, isActive: true },
      include: { category: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        staffServices: {
          include: {
            staff: {
              include: {
                user: { select: { firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(salonId: string, userId: string, role: string, dto: CreateServiceDto) {
    await this.assertOwnership(salonId, userId, role);

    return this.prisma.service.create({
      data: { ...dto, salonId },
      include: { category: true },
    });
  }

  async update(serviceId: string, userId: string, role: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');
    await this.assertOwnership(service.salonId, userId, role);

    return this.prisma.service.update({
      where: { id: serviceId },
      data: dto,
      include: { category: true },
    });
  }

  async remove(serviceId: string, userId: string, role: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');
    await this.assertOwnership(service.salonId, userId, role);

    return this.prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
  }

  async getCategories(salonId: string) {
    return this.prisma.serviceCategory.findMany({ where: { salonId }, orderBy: { name: 'asc' } });
  }

  async createCategory(salonId: string, userId: string, role: string, name: string, icon?: string) {
    await this.assertOwnership(salonId, userId, role);
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return this.prisma.serviceCategory.create({ data: { salonId, name, slug, icon } });
  }

  private async assertOwnership(salonId: string, userId: string, role: string) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundException('Salon not found');
    if (role === UserRole.ADMIN) return salon;
    if (salon.ownerId !== userId) throw new ForbiddenException('Access denied');
    return salon;
  }
}
