import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatus, NotificationType } from '@glowbook/shared-types';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY', 'sk_test_placeholder'), {
      apiVersion: '2024-06-20',
    });
  }

  async createPaymentIntent(appointmentId: string, customerId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        salon: { select: { name: true } },
        service: { select: { name: true } },
        customer: { select: { email: true, firstName: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.customerId !== customerId) throw new BadRequestException('Unauthorized');

    const existing = await this.prisma.payment.findUnique({ where: { appointmentId } });
    if (existing?.status === PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Payment already completed');
    }

    const amountInPaisa = Math.round(Number(appointment.total) * 100);

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: amountInPaisa,
        currency: 'inr',
        metadata: {
          appointmentId,
          salonName: appointment.salon.name,
          serviceName: appointment.service.name,
        },
        description: `GlowBook - ${appointment.salon.name} - ${appointment.service.name}`,
      });

      const payment = await this.prisma.payment.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          customerId,
          amount: appointment.total,
          currency: 'INR',
          status: PaymentStatus.PENDING,
          provider: 'stripe',
          providerPaymentId: intent.id,
          providerClientSecret: intent.client_secret,
        },
        update: {
          providerPaymentId: intent.id,
          providerClientSecret: intent.client_secret,
          status: PaymentStatus.PENDING,
        },
      });

      return { clientSecret: intent.client_secret, paymentId: payment.id };
    } catch (err) {
      throw new BadRequestException('Payment service unavailable. Please try again.');
    }
  }

  async confirmPayment(paymentId: string, providerPaymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, email: true } },
            salon: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        providerPaymentId,
      },
    });

    // Confirm the appointment
    await this.prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: { status: 'CONFIRMED' },
    });

    await this.notifications.sendAppointmentNotification(
      payment.appointment,
      NotificationType.PAYMENT_CONFIRMED,
    );

    return updated;
  }

  async refund(paymentId: string, amount?: number, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Cannot refund an incomplete payment');
    }

    const refundAmount = amount ?? Number(payment.amount);

    try {
      if (payment.providerPaymentId) {
        await this.stripe.refunds.create({
          payment_intent: payment.providerPaymentId,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
        });
      }
    } catch (err) {
      throw new BadRequestException('Refund failed. Please contact support.');
    }

    const isFullRefund = refundAmount >= Number(payment.amount);

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
          refundAmount: Number(payment.refundAmount) + refundAmount,
          refundReason: reason,
          refundedAt: new Date(),
        },
      }),
      this.prisma.refund.create({
        data: {
          paymentId,
          amount: refundAmount,
          reason: reason ?? 'Customer request',
        },
      }),
    ]);

    return { success: true, refundedAmount: refundAmount };
  }

  async getPaymentHistory(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { customerId },
        skip,
        take: limit,
        include: {
          appointment: {
            include: {
              salon: { select: { name: true } },
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { customerId } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
