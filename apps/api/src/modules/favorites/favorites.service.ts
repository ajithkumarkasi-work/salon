import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        salon: {
          include: {
            category: true,
            images: { take: 1, orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, salonId: string) {
    return this.prisma.favorite.upsert({
      where: { userId_salonId: { userId, salonId } },
      create: { userId, salonId },
      update: {},
      include: { salon: { select: { id: true, name: true } } },
    });
  }

  async remove(userId: string, salonId: string) {
    return this.prisma.favorite.deleteMany({ where: { userId, salonId } });
  }

  async isFavorite(userId: string, salonId: string) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_salonId: { userId, salonId } },
    });
    return { isFavorite: !!fav };
  }
}
