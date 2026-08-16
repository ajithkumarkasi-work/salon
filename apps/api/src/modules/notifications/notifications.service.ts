import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@glowbook/shared-types';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount } };
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async sendAppointmentNotification(appointment: any, type: NotificationType) {
    const { title, body } = this.buildNotificationContent(type, appointment);
    const userId = appointment.customerId ?? appointment.customer?.id;
    if (!userId) return;

    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: { appointmentId: appointment.id },
      },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: { status: 'CONFIRMED', startTime: { gte: windowStart, lt: windowEnd } },
      include: {
        salon: { select: { id: true, name: true } },
        customer: { select: { id: true, firstName: true } },
        service: { select: { id: true, name: true } },
      },
    });

    for (const appt of appointments) {
      const existing = await this.prisma.notification.findFirst({
        where: { userId: appt.customerId, type: NotificationType.BOOKING_REMINDER },
      });
      if (!existing) {
        await this.sendAppointmentNotification(appt, NotificationType.BOOKING_REMINDER);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendReviewRequests() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: { status: 'COMPLETED', endTime: { gte: twoHoursAgo, lt: oneHourAgo }, review: null },
      include: {
        salon: { select: { id: true, name: true } },
        customer: { select: { id: true } },
        service: { select: { id: true, name: true } },
      },
    });

    for (const appt of appointments) {
      await this.sendAppointmentNotification(appt, NotificationType.REVIEW_REQUEST);
    }
  }
  private buildNotificationContent(type: NotificationType, appt: any): { title: string; body: string } {
    const salonName = appt.salon?.name ?? 'the salon';
    const serviceName = appt.service?.name ?? 'your service';
    const time = appt.startTime ? format(new Date(appt.startTime), 'hh:mm a') : '';
    const date = appt.startTime ? format(new Date(appt.startTime), 'MMM d') : '';
    const dateTime = appt.startTime ? `${date} at ${time}` : 'the scheduled time';

    const map: Record<NotificationType, { title: string; body: string }> = {
      [NotificationType.BOOKING_CONFIRMED]: {
        title: 'Appointment Confirmed',
        body: `Your ${serviceName} at ${salonName} is confirmed for ${dateTime}.`,
      },
      [NotificationType.BOOKING_REMINDER]: {
        title: 'Appointment Reminder',
        body: `Reminder: your ${serviceName} at ${salonName} is at ${dateTime}.`,
      },
      [NotificationType.BOOKING_CANCELLED]: {
        title: 'Appointment Cancelled',
        body: `Your appointment at ${salonName} has been cancelled.`,
      },
      [NotificationType.BOOKING_RESCHEDULED]: {
        title: 'Appointment Rescheduled',
        body: `Your ${serviceName} at ${salonName} has been moved to ${dateTime}.`,
      },
      [NotificationType.PAYMENT_CONFIRMED]: {
        title: 'Payment Confirmed',
        body: `Payment for your ${serviceName} at ${salonName} was successful.`,
      },
      [NotificationType.APPOINTMENT_STARTING]: {
        title: 'Appointment Starting Soon',
        body: `Your ${serviceName} at ${salonName} starts in 30 minutes.`,
      },
      [NotificationType.REVIEW_REQUEST]: {
        title: 'How was your experience?',
        body: `Share your feedback for your ${serviceName} at ${salonName}.`,
      },
      [NotificationType.NEW_BOOKING]: {
        title: 'New Appointment Booked',
        body: `A customer booked ${serviceName} for ${dateTime}.`,
      },
      [NotificationType.CUSTOMER_ARRIVED]: {
        title: 'Customer Arrived',
        body: `Your customer has arrived for their ${serviceName}.`,
      },
      [NotificationType.STAFF_SCHEDULE_CHANGED]: {
        title: 'Schedule Updated',
        body: 'Your staff schedule has been updated.',
      },
    };

    return map[type];
  }
}
