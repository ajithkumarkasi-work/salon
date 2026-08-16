import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from '@glowbook/validation';
import { UserRole } from '@glowbook/shared-types';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(salonId: string, userId: string, role: string, dto: CreateCouponDto) {
    await this.assertOwnership(salonId, userId, role);

    return this.prisma.coupon.create({
      data: {
        ...dto,
        salonId,
        code: dto.code.toUpperCase(),
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
      },
    });
  }

  async findBySalon(salonId: string) {
    return this.prisma.coupon.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validate(code: string, salonId: string, amount: number, customerId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        salonId,
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    if (!coupon) return { valid: false, discount: 0, message: 'Invalid or expired coupon' };

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
    }

    if (amount < Number(coupon.minAmount)) {
      return {
        valid: false,
        discount: 0,
        message: `Minimum order amount is ₹${coupon.minAmount}`,
      };
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = (amount * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    } else {
      discount = Math.min(Number(coupon.value), amount);
    }

    return { valid: true, discount, coupon };
  }

  async deactivate(couponId: string, userId: string, role: string) {
    const existing = await this.prisma.coupon.findUnique({
      where: { id: couponId },
      include: { salon: { select: { id: true, ownerId: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    await this.assertOwnership(existing.salonId, userId, role);

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });
  }

  async update(couponId: string, userId: string, role: string, dto: UpdateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    await this.assertOwnership(existing.salonId, userId, role);

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...dto,
        code: dto.code?.toUpperCase(),
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  private async assertOwnership(salonId: string, userId: string, role: string) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new NotFoundException('Salon not found');
    if (role === UserRole.ADMIN) return salon;
    if (salon.ownerId !== userId) throw new NotFoundException('Salon not found');
    return salon;
  }
}
