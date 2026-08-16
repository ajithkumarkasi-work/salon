import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSalonSummary(salonId: string, startDate: Date, endDate: Date) {
    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      revenueData,
      newCustomers,
      avgRating,
    ] = await Promise.all([
      this.prisma.appointment.count({ where: { salonId, startTime: { gte: startDate, lte: endDate } } }),
      this.prisma.appointment.count({ where: { salonId, status: 'COMPLETED', startTime: { gte: startDate, lte: endDate } } }),
      this.prisma.appointment.count({ where: { salonId, status: 'CANCELLED', startTime: { gte: startDate, lte: endDate } } }),
      this.prisma.appointment.aggregate({
        where: { salonId, status: 'COMPLETED', startTime: { gte: startDate, lte: endDate } },
        _sum: { total: true },
        _avg: { total: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['customerId'],
        where: { salonId, startTime: { gte: startDate, lte: endDate } },
        having: { customerId: { _count: { equals: 1 } } },
        _count: { customerId: true },
      }),
      this.prisma.review.aggregate({
        where: { salonId },
        _avg: { rating: true },
      }),
    ]);

    return {
      totalRevenue: Number(revenueData._sum.total ?? 0),
      totalBookings,
      completedBookings,
      cancelledBookings,
      newCustomers: newCustomers.length,
      averageBookingValue: Number(revenueData._avg.total ?? 0),
      cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
      averageRating: avgRating._avg.rating ?? 0,
    };
  }

  async getRevenueChart(salonId: string, startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    const appointments = await this.prisma.appointment.findMany({
      where: { salonId, status: 'COMPLETED', startTime: { gte: startDate, lte: endDate } },
      select: { startTime: true, total: true },
      orderBy: { startTime: 'asc' },
    });

    const grouped = new Map<string, { revenue: number; bookings: number }>();

    for (const appt of appointments) {
      const key = this.getGroupKey(new Date(appt.startTime), groupBy);
      const existing = grouped.get(key) ?? { revenue: 0, bookings: 0 };
      grouped.set(key, {
        revenue: existing.revenue + Number(appt.total),
        bookings: existing.bookings + 1,
      });
    }

    return Array.from(grouped.entries()).map(([date, data]) => ({ date, ...data }));
  }

  async getPopularServices(salonId: string, startDate: Date, endDate: Date) {
    const result = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      where: { salonId, startTime: { gte: startDate, lte: endDate } },
      _count: { serviceId: true },
      _sum: { total: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 10,
    });

    const serviceIds = result.map((r) => r.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });

    const serviceMap = new Map<string, { name: string }>();
    for (const s of services) {
      serviceMap.set(s.id, { name: s.name });
    }

    return result.map((r) => ({
      serviceId: r.serviceId,
      serviceName: serviceMap.get(r.serviceId)?.name ?? 'Unknown',
      bookings: r._count.serviceId,
      revenue: Number(r._sum.total ?? 0),
    }));
  }

  async getStaffPerformance(salonId: string, startDate: Date, endDate: Date) {
    const result = await this.prisma.appointment.groupBy({
      by: ['staffId'],
      where: { salonId, status: 'COMPLETED', startTime: { gte: startDate, lte: endDate } },
      _count: { staffId: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    });

    const staffIds = result.map((r) => r.staffId);
    const staff = await this.prisma.staff.findMany({
      where: { id: { in: staffIds } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const staffMap = new Map<string, { firstName: string; lastName: string; rating: number }>();
    for (const s of staff) {
      staffMap.set(s.id, {
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        rating: Number(s.rating ?? 0),
      });
    }

    return result.map((r) => ({
      staffId: r.staffId,
      staffName: staffMap.get(r.staffId)
        ? `${staffMap.get(r.staffId)?.firstName} ${staffMap.get(r.staffId)?.lastName}`
        : 'Unknown',
      bookings: r._count.staffId,
      revenue: Number(r._sum.total ?? 0),
      rating: staffMap.get(r.staffId)?.rating ?? 0,
    }));
  }

  async getPeakHours(salonId: string, startDate: Date, endDate: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: { salonId, startTime: { gte: startDate, lte: endDate } },
      select: { startTime: true },
    });

    const hourCounts = new Array(24).fill(0);
    for (const appt of appointments) {
      const hour = new Date(appt.startTime).getHours();
      hourCounts[hour]++;
    }

    return hourCounts.map((bookings, hour) => ({ hour, bookings }));
  }

  async getPlatformSummary() {
    const [totalSalons, activeSalons, totalCustomers, totalBookings, totalRevenue] = await Promise.all([
      this.prisma.salon.count(),
      this.prisma.salon.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.appointment.count(),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalSalons,
      activeSalons,
      totalCustomers,
      totalBookings,
      platformRevenue: Number(totalRevenue._sum.amount ?? 0),
    };
  }

  private getGroupKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    if (groupBy === 'month') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    if (groupBy === 'week') {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  }
}
