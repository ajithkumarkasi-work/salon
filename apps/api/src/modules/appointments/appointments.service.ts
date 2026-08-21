import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppointmentGateway } from '../../gateway/appointment.gateway';
import { JwtUser } from '../auth/current-user.decorator';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  UpdateAppointmentStatusDto,
  UpdateAppointmentStatusesDto,
} from '@glowbook/validation';
import { AppointmentStatus, NotificationType, UserRole } from '@glowbook/shared-types';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// Valid state transitions
const VALID_TRANSITIONS: Record<string, AppointmentStatus[]> = {
  PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  CONFIRMED: [AppointmentStatus.ARRIVED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  ARRIVED: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.NO_SHOW],
  IN_PROGRESS: [AppointmentStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private availability: AvailabilityService,
    private notifications: NotificationsService,
    private gateway: AppointmentGateway,
  ) {}

  async create(actor: JwtUser, dto: CreateAppointmentDto) {
    const {
      salonId,
      serviceId,
      staffId,
      startTime,
      notes,
      couponCode,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      manualReason,
    } = dto;

    let customerId = actor.id;
    let source = 'CUSTOMER_APP';

    if (actor.role === UserRole.CUSTOMER) {
      if (customerEmail) {
        throw new BadRequestException('Customers can only book for themselves');
      }
    } else if ([UserRole.STAFF, UserRole.SALON_OWNER, UserRole.ADMIN].includes(actor.role as UserRole)) {
      if (!customerEmail) {
        throw new BadRequestException('Customer email is required for assisted booking');
      }

      if (actor.role === UserRole.STAFF) {
        const staffProfile = await this.prisma.staff.findFirst({
          where: { userId: actor.id, salonId, isActive: true },
        });
        if (!staffProfile) {
          throw new ForbiddenException('Staff can only book for their assigned salon');
        }
      }

      if (actor.role === UserRole.SALON_OWNER) {
        const ownsSalon = await this.prisma.salon.findFirst({
          where: { id: salonId, ownerId: actor.id },
          select: { id: true },
        });
        if (!ownsSalon) {
          throw new ForbiddenException('Not authorized to book for this salon');
        }
      }

      const normalizedEmail = customerEmail.toLowerCase();
      let customer = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, role: true, isActive: true },
      });

      if (customer && customer.role !== UserRole.CUSTOMER) {
        throw new BadRequestException('This email is already used by a non-customer account');
      }

      if (customer && !customer.isActive) {
        throw new BadRequestException('Customer account is inactive');
      }

      if (!customer) {
        if (!customerFirstName?.trim() || !customerLastName?.trim()) {
          throw new BadRequestException('Customer first name and last name are required for quick create');
        }

        const tempPassword = `Welcome${Math.floor(1000 + Math.random() * 9000)}A1`;
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        customer = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            firstName: customerFirstName.trim(),
            lastName: customerLastName.trim(),
            phone: customerPhone?.trim() || undefined,
            role: UserRole.CUSTOMER,
          },
          select: { id: true, role: true, isActive: true },
        });
      }

      customerId = customer.id;
      source = actor.role === UserRole.STAFF ? 'STAFF_DASHBOARD' : 'ADMIN_DASHBOARD';
    } else {
      throw new ForbiddenException('Role not allowed to create appointments');
    }

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) throw new BadRequestException('Service not available');

    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, salonId, isActive: true, services: { some: { serviceId } } },
    });
    if (!staff) throw new BadRequestException('Staff not available for this service');

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + (service.duration + service.bufferTime) * 60000);

    // Backend availability validation (never trust frontend)
    const isAvailable = await this.availability.validateSlot(salonId, staffId, serviceId, startDateTime);
    if (!isAvailable) throw new ConflictException('This time slot is no longer available');

    // Coupon validation
    let discount = 0;
    let couponId: string | undefined;
    let coupon: any;

    if (couponCode) {
      coupon = await this.prisma.coupon.findFirst({
        where: {
          salonId,
          code: couponCode.toUpperCase(),
          isActive: true,
          validFrom: { lte: new Date() },
          validUntil: { gte: new Date() },
        },
      });

      if (!coupon) throw new BadRequestException('Invalid or expired coupon');

      const price = Number(service.price);
      if (coupon.type === 'PERCENTAGE') {
        discount = (price * Number(coupon.value)) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
      } else {
        discount = Math.min(Number(coupon.value), price);
      }

      if (coupon.newCustomersOnly) {
        const pastBookings = await this.prisma.appointment.count({
          where: { customerId, salonId, status: AppointmentStatus.COMPLETED },
        });
        if (pastBookings > 0) throw new BadRequestException('Coupon is for new customers only');
      }

      couponId = coupon.id;
    }

    const price = Number(service.price);
    const tax = (price - discount) * 0.18; // 18% GST
    const total = price - discount + tax;

    // Generate QR code token
    const qrToken = uuidv4();
    const qrCode = await QRCode.toDataURL(`glowbook:appt:${qrToken}`);

    const appointment = await this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          salonId,
          customerId,
          staffId,
          serviceId,
          startTime: startDateTime,
          endTime: endDateTime,
          price: service.price,
          discount,
          tax,
          total,
          notes,
          couponId,
          qrCode: qrToken,
        },
        include: {
          salon: { select: { id: true, name: true, address: true, phone: true, coverImageUrl: true } },
          service: { select: { id: true, name: true, duration: true, price: true, imageUrl: true } },
          staff: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });

      await tx.appointmentStatusHistory.create({
        data: { appointmentId: appt.id, status: AppointmentStatus.PENDING, changedById: actor.id },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'APPOINTMENT_CREATED',
          resource: 'Appointment',
          resourceId: appt.id,
          metadata: {
            source,
            manualReason: manualReason?.trim() || null,
            customerId,
            salonId,
            serviceId,
            staffId,
          },
        },
      });

      if (coupon) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      return appt;
    });

    // Notify salon owner and staff
    await this.notifications.sendAppointmentNotification(appointment, NotificationType.NEW_BOOKING);

    // Emit real-time event
    this.gateway.emitToSalon(salonId, 'appointment:new', { appointment });

    return { ...appointment, qrCodeDataUrl: qrCode };
  }

  async findAll(userId: string, role: string, filters: any = {}) {
    const { status, search, salonId, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role === 'CUSTOMER') {
      where.customerId = userId;
    } else if (role === 'STAFF') {
      const staff = await this.prisma.staff.findUnique({ where: { userId } });
      if (!staff) {
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }
      where.staffId = staff.id;
    } else if (role === 'SALON_OWNER') {
      if (salonId) {
        const salon = await this.prisma.salon.findFirst({
          where: { id: salonId, ownerId: userId },
          select: { id: true },
        });
        if (!salon) {
          throw new ForbiddenException('Not authorized to view appointments for this salon');
        }
        where.salonId = salon.id;
      } else {
        const salons = await this.prisma.salon.findMany({ where: { ownerId: userId }, select: { id: true } });
        where.salonId = { in: salons.map((s) => s.id) };
      }
    }

    if (status) where.status = status;

    if (startDate || endDate) {
      where.startTime = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    if (typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      where.OR = [
        { customer: { firstName: { contains: query, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query, mode: 'insensitive' } } },
        { customer: { email: { contains: query, mode: 'insensitive' } } },
        { customer: { phone: { contains: query, mode: 'insensitive' } } },
        { service: { name: { contains: query, mode: 'insensitive' } } },
        { staff: { user: { firstName: { contains: query, mode: 'insensitive' } } } },
        { staff: { user: { lastName: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        include: {
          salon: { select: { id: true, name: true, address: true, coverImageUrl: true } },
          service: { select: { id: true, name: true, duration: true, price: true, imageUrl: true } },
          staff: {
            include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
          },
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
          payment: true,
          review: true,
        },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    const appointmentIds = data.map((appointment) => appointment.id);
    const sourceByAppointmentId: Record<string, { source: string; manualReason: string | null }> = {};

    if (appointmentIds.length > 0) {
      const creationLogs = await this.prisma.auditLog.findMany({
        where: {
          action: 'APPOINTMENT_CREATED',
          resource: 'Appointment',
          resourceId: { in: appointmentIds },
        },
        orderBy: { createdAt: 'desc' },
      });

      creationLogs.forEach((log) => {
        if (!log.resourceId || sourceByAppointmentId[log.resourceId]) return;
        const metadata = (log.metadata as Record<string, unknown> | null) ?? {};
        sourceByAppointmentId[log.resourceId] = {
          source: typeof metadata.source === 'string' ? metadata.source : 'CUSTOMER_APP',
          manualReason: typeof metadata.manualReason === 'string' ? metadata.manualReason : null,
        };
      });
    }

    const enriched = data.map((appointment) => {
      const sourceMeta = sourceByAppointmentId[appointment.id];
      return {
        ...appointment,
        bookingSource: sourceMeta?.source ?? 'CUSTOMER_APP',
        bookingReason: sourceMeta?.manualReason ?? null,
      };
    });

    return { data: enriched, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, userId: string, role: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        salon: true,
        service: true,
        staff: { include: { user: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        payment: { include: { refunds: true } },
        review: true,
        statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!appt) throw new NotFoundException('Appointment not found');

    if (role === UserRole.CUSTOMER && appt.customerId !== userId) {
      throw new ForbiddenException('Not authorized to view this appointment');
    }

    if (role === UserRole.STAFF) {
      const staffProfile = await this.prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || appt.staffId !== staffProfile.id) {
        throw new ForbiddenException('Staff can view only their own appointments');
      }
    }

    if (role === UserRole.SALON_OWNER) {
      const ownsSalon = await this.prisma.salon.findFirst({
        where: { id: appt.salonId, ownerId: userId },
        select: { id: true },
      });
      if (!ownsSalon) {
        throw new ForbiddenException('Not authorized to view this appointment');
      }
    }

    return appt;
  }

  async updateStatus(id: string, userId: string, dto: UpdateAppointmentStatusDto) {
    const [updated] = await this.updateStatuses([{ id, ...dto }], userId);
    return updated;
  }

  async updateStatuses(updates: UpdateAppointmentStatusesDto['updates'], userId: string) {
    const appointmentIds = updates.map((update) => update.id);
    if (new Set(appointmentIds).size !== appointmentIds.length) {
      throw new BadRequestException('Each appointment can be updated only once per request');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!actor) throw new ForbiddenException('Not authorized');

    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers are not allowed to change appointment status');
    }

    const appointments = await this.prisma.appointment.findMany({
      where: { id: { in: appointmentIds } },
    });
    if (appointments.length !== appointmentIds.length) {
      throw new NotFoundException('One or more appointments were not found');
    }
    const appointmentsById = new Map(appointments.map((appointment) => [appointment.id, appointment]));

    if (actor.role === UserRole.STAFF) {
      const staffProfile = await this.prisma.staff.findFirst({
        where: { userId, isActive: true },
      });
      if (!staffProfile) throw new ForbiddenException('Staff can update appointments only in their salon');
      if (appointments.some((appointment) => appointment.staffId !== staffProfile.id)) {
        throw new ForbiddenException('Staff can update only their own appointments');
      }
    }

    if (actor.role === UserRole.SALON_OWNER) {
      const salonIds = [...new Set(appointments.map((appointment) => appointment.salonId))];
      const ownedSalons = await this.prisma.salon.findMany({
        where: { id: { in: salonIds }, ownerId: userId },
        select: { id: true },
      });
      if (ownedSalons.length !== salonIds.length) {
        throw new ForbiddenException('Not authorized to update one or more appointments');
      }
    }

    const canOverrideTransitions = actor.role === UserRole.ADMIN || actor.role === UserRole.SALON_OWNER;
    for (const update of updates) {
      const appointment = appointmentsById.get(update.id)!;
      const newStatus = update.status as AppointmentStatus;
      if (!canOverrideTransitions) {
        const allowed = VALID_TRANSITIONS[appointment.status] ?? [];
        if (!allowed.includes(newStatus)) {
          throw new BadRequestException(`Cannot transition from ${appointment.status} to ${newStatus}`);
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      return Promise.all(updates.map(async (update) => {
        const result = await tx.appointment.update({
          where: { id: update.id },
          data: { status: update.status as AppointmentStatus },
          include: {
            salon: { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
            customer: { select: { id: true, firstName: true } },
          },
        });

        await tx.appointmentStatusHistory.create({
          data: { appointmentId: update.id, status: update.status as AppointmentStatus, changedById: userId, note: update.note },
        });

        return result;
      }));
    });

    updated.forEach((appointment) => {
      this.gateway.emitToSalon(appointment.salonId, 'appointment:status', { appointment });
      this.gateway.emitToUser(appointment.customer.id, 'appointment:status', { appointment });
    });

    return updated;
  }

  async cancel(id: string, userId: string, dto: CancelAppointmentDto) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    if (!['PENDING', 'CONFIRMED'].includes(appt.status)) {
      throw new BadRequestException('Cannot cancel appointment in current state');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
        include: {
          salon: { select: { id: true, name: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          service: { select: { id: true, name: true } },
          staff: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          status: AppointmentStatus.CANCELLED,
          changedById: userId,
          note: dto.reason,
        },
      });

      return result;
    });

    await this.notifications.sendAppointmentNotification(updated, NotificationType.BOOKING_CANCELLED);
    this.gateway.emitToSalon(updated.salonId, 'appointment:cancelled', { appointment: updated });

    return updated;
  }

  async reschedule(id: string, userId: string, dto: RescheduleAppointmentDto) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    if (!['PENDING', 'CONFIRMED'].includes(appt.status)) {
      throw new BadRequestException('Cannot reschedule appointment in current state');
    }

    const newStart = new Date(dto.startTime);
    const isAvailable = await this.availability.validateSlot(
      appt.salonId,
      dto.staffId,
      appt.serviceId,
      newStart,
    );

    if (!isAvailable) throw new ConflictException('Selected time slot is not available');

    const totalDuration = appt.service.duration + appt.service.bufferTime;
    const newEnd = new Date(newStart.getTime() + totalDuration * 60000);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: {
          staffId: dto.staffId,
          startTime: newStart,
          endTime: newEnd,
          status: AppointmentStatus.CONFIRMED,
        },
        include: {
          salon: { select: { id: true, name: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          service: { select: { id: true, name: true } },
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          status: AppointmentStatus.CONFIRMED,
          changedById: userId,
          note: 'Rescheduled',
        },
      });

      return result;
    });

    await this.notifications.sendAppointmentNotification(updated, NotificationType.BOOKING_RESCHEDULED);
    this.gateway.emitToSalon(updated.salonId, 'appointment:rescheduled', { appointment: updated });

    return updated;
  }

  async qrCheckIn(qrCode: string, staffUserId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { qrCode },
      include: {
        salon: { select: { id: true } },
        staff: { select: { userId: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Invalid QR code');
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException('Appointment cannot be checked in');
    }

    // Verify staff belongs to this salon
    const staffMember = await this.prisma.staff.findFirst({
      where: { userId: staffUserId, salonId: appointment.salonId },
    });
    if (!staffMember) throw new ForbiddenException('Not authorized to check in this appointment');

    return this.updateStatus(appointment.id, staffUserId, {
      status: AppointmentStatus.ARRIVED,
      note: 'QR code check-in',
    });
  }

  async getSalonCalendar(salonId: string, startDate: string, endDate: string) {
    return this.prisma.appointment.findMany({
      where: {
        salonId,
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      include: {
        service: { select: { id: true, name: true, duration: true } },
        staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
