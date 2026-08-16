import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from '@glowbook/validation';
import { AppointmentStatus } from '@glowbook/shared-types';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(appointmentId: string, customerId: string, dto: CreateReviewDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { review: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.customerId !== customerId) throw new BadRequestException('Not your appointment');
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed appointments');
    }
    if (appointment.review) throw new ConflictException('Already reviewed this appointment');

    const review = await this.prisma.review.create({
      data: {
        appointmentId,
        salonId: appointment.salonId,
        staffId: appointment.staffId,
        customerId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Update salon rating
    await this.updateSalonRating(appointment.salonId);
    await this.updateStaffRating(appointment.staffId);

    return review;
  }

  async findBySalon(salonId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { salonId, isPublished: true },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          staff: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { salonId, isPublished: true } }),
    ]);

    const stats = await this.prisma.review.aggregate({
      where: { salonId, isPublished: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      stats: {
        average: stats._avg.rating ?? 0,
        count: stats._count.rating,
      },
    };
  }

  private async updateSalonRating(salonId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { salonId, isPublished: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.salon.update({
      where: { id: salonId },
      data: {
        rating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating,
      },
    });
  }

  private async updateStaffRating(staffId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { staffId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        rating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating,
      },
    });
  }
}
