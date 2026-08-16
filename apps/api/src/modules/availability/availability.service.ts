import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityQueryDto } from '@glowbook/validation';
import { TimeSlot } from '@glowbook/shared-types';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(query: AvailabilityQueryDto): Promise<{ date: string; slots: TimeSlot[] }> {
    const { salonId, serviceId, staffId, date } = query;

    const targetDate = new Date(date);
    if (targetDate < this.today()) {
      throw new BadRequestException('Cannot check availability for past dates');
    }

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new BadRequestException('Service not found');

    const totalDuration = service.duration + service.bufferTime;
    const dayOfWeek = this.getDayOfWeek(targetDate);

    // Check salon holiday
    const holiday = await this.prisma.salonHoliday.findFirst({
      where: {
        salonId,
        date: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lte: new Date(date + 'T23:59:59.999Z'),
        },
      },
    });
    if (holiday) return { date, slots: [] };

    // Get staff to check
    const staffList = staffId
      ? await this.getStaffById(staffId, serviceId)
      : await this.getStaffForService(salonId, serviceId);

    const allSlots: TimeSlot[] = [];

    for (const staff of staffList) {
      const staffSlots = await this.getSlotsForStaff(staff, totalDuration, date, dayOfWeek, salonId, serviceId);
      allSlots.push(...staffSlots);
    }

    // Sort by time
    allSlots.sort((a, b) => a.time.localeCompare(b.time));

    return { date, slots: allSlots };
  }

  private async getSlotsForStaff(
    staff: any,
    durationMinutes: number,
    date: string,
    dayOfWeek: string,
    salonId: string,
    serviceId: string,
  ): Promise<TimeSlot[]> {
    // Check staff working hours for this day
    const workingHour = await this.prisma.workingHour.findFirst({
      where: { staffId: staff.id, dayOfWeek: dayOfWeek as any },
    });

    // Fall back to salon working hours
    const salonHour = workingHour
      ? workingHour
      : await this.prisma.workingHour.findFirst({
          where: { salonId, dayOfWeek: dayOfWeek as any },
        });

    if (!salonHour || salonHour.isClosed) return [];

    // Check staff leave
    const onLeave = await this.prisma.staffLeave.findFirst({
      where: {
        staffId: staff.id,
        isApproved: true,
        startDate: { lte: new Date(date) },
        endDate: { gte: new Date(date) },
      },
    });
    if (onLeave) return [];

    // Get existing appointments for staff on this date
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        staffId: staff.id,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    });

    const slots: TimeSlot[] = [];
    const [openH, openM] = salonHour.openTime.split(':').map(Number);
    const [closeH, closeM] = salonHour.closeTime.split(':').map(Number);

    let current = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const now = new Date();
    const isToday = date === now.toISOString().split('T')[0];

    while (current + durationMinutes <= closeMinutes) {
      const slotStart = new Date(date + 'T00:00:00.000Z');
      slotStart.setUTCHours(0, current, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // Skip past slots for today (add 30m buffer)
      if (isToday && slotStart.getTime() < now.getTime() + 30 * 60000) {
        current += 15;
        continue;
      }

      // Check conflicts with existing appointments
      const hasConflict = existingAppointments.some((appt) => {
        const apptStart = new Date(appt.startTime).getTime();
        const apptEnd = new Date(appt.endTime).getTime();
        const slotStartMs = slotStart.getTime();
        const slotEndMs = slotEnd.getTime();
        return slotStartMs < apptEnd && slotEndMs > apptStart;
      });

      if (!hasConflict) {
        slots.push({
          time: `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`,
          staffId: staff.id,
          staffName: `${staff.user.firstName} ${staff.user.lastName}`,
          isAvailable: true,
        });
      }

      current += 15; // 15-minute slot intervals
    }

    return slots;
  }

  async validateSlot(
    salonId: string,
    staffId: string,
    serviceId: string,
    startTime: Date,
  ): Promise<boolean> {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return false;

    const totalDuration = service.duration + service.bufferTime;
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);
    const date = startTime.toISOString().split('T')[0];

    // Check not in the past
    if (startTime < new Date()) return false;

    // Check salon holiday
    const holiday = await this.prisma.salonHoliday.findFirst({
      where: {
        salonId,
        date: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lte: new Date(date + 'T23:59:59.999Z'),
        },
      },
    });
    if (holiday) return false;

    // Check staff conflicts
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        staffId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { startTime: { lt: endTime, gte: startTime } },
          { endTime: { gt: startTime, lte: endTime } },
          { startTime: { lte: startTime }, endTime: { gte: endTime } },
        ],
      },
    });

    return !conflict;
  }

  private async getStaffById(staffId: string, serviceId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        isActive: true,
        services: { some: { serviceId } },
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    return staff ? [staff] : [];
  }

  private async getStaffForService(salonId: string, serviceId: string) {
    return this.prisma.staff.findMany({
      where: {
        salonId,
        isActive: true,
        services: { some: { serviceId } },
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
  }

  private getDayOfWeek(date: Date): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  private today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
