import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalonDto, UpdateSalonDto } from '@glowbook/validation';

interface SalonFilters {
  search?: string;
  city?: string;
  categoryId?: string;
  minRating?: number;
  maxPrice?: number;
  priceRange?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class SalonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: SalonFilters = {}) {
    const {
      search,
      city,
      categoryId,
      minRating,
      priceRange,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;
    if (minRating) where.rating = { gte: minRating };
    if (priceRange) where.priceRange = priceRange;

    const [data, total] = await Promise.all([
      this.prisma.salon.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          images: { orderBy: { order: 'asc' }, take: 1 },
          workingHours: true,
        },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.salon.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(idOrSlug: string) {
    const salon = await this.prisma.salon.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        holidays: { where: { date: { gte: new Date() } }, orderBy: { date: 'asc' } },
        staff: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            services: {
              select: {
                service: {
                  select: { id: true, name: true, price: true, duration: true },
                },
              },
            },
          },
        },
        services: {
          where: { isActive: true },
          include: { category: true },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        },
        coupons: {
          where: { isActive: true, validUntil: { gte: new Date() } },
        },
      },
    });

    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }

  async create(ownerId: string, dto: CreateSalonDto) {
    const slug = this.generateSlug(dto.name);

    return this.prisma.salon.create({
      data: {
        ...dto,
        slug,
        ownerId,
      },
    });
  }

  async update(salonId: string, userId: string, dto: UpdateSalonDto) {
    await this.assertOwnership(salonId, userId);

    return this.prisma.salon.update({
      where: { id: salonId },
      data: dto,
    });
  }

  async getOwnerSalons(ownerId: string) {
    return this.prisma.salon.findMany({
      where: { ownerId },
      include: {
        category: true,
        _count: { select: { staff: true, services: true, appointments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateWorkingHours(salonId: string, userId: string, hours: any[]) {
    await this.assertOwnership(salonId, userId);

    await this.prisma.workingHour.deleteMany({ where: { salonId } });

    return this.prisma.workingHour.createMany({
      data: hours.map((h) => ({ ...h, salonId })),
    });
  }

  async addHoliday(salonId: string, userId: string, date: string, name: string) {
    await this.assertOwnership(salonId, userId);

    return this.prisma.salonHoliday.create({
      data: { salonId, date: new Date(date), name },
    });
  }

  async getCategories() {
    return this.prisma.salonCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async assertOwnership(salonId: string, userId: string) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundException('Salon not found');
    if (salon.ownerId !== userId) throw new ForbiddenException('Access denied');
    return salon;
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 6)
    );
  }
}
