import {
  appointmentsService,
  createWalkInCustomer,
  findCouponByCode,
  findUserByEmail,
  appointmentStatusHistoryService,
  servicesService,
} from '@/shared/lib/firebase';
import { useAuthStore } from '@/shared/stores/auth.store';
import { UserRole } from '@glowbook/shared-types';
import { CreateAppointmentDto } from '@glowbook/validation';

function generateQrCode(): string {
  return `GB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

/** Resolves who the appointment belongs to: the signed-in customer booking for
 * themselves, or — for staff/owner/admin-assisted "quick booking" — the
 * customer identified by email (found or created), never the assisting staff. */
async function resolveCustomerId(dto: CreateAppointmentDto, actingUserId: string): Promise<string> {
  if (!dto.customerEmail) return actingUserId;

  const existing = await findUserByEmail(dto.customerEmail);
  if (existing) return existing.id;

  const created = await createWalkInCustomer({
    email: dto.customerEmail,
    firstName: dto.customerFirstName?.trim() || 'Walk-in',
    lastName: dto.customerLastName?.trim() || 'Customer',
    phone: dto.customerPhone,
  });
  return created.id;
}

/** Recreates the NestJS booking logic (price/tax/coupon/qrCode) client-side against Firestore. */
export async function createAppointment(dto: CreateAppointmentDto) {
  console.log('[createAppointment] dto:', dto);
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('You must be signed in to book an appointment.');
  console.log('[createAppointment] acting user:', user.id, user.role);

  const customerId = await resolveCustomerId(dto, user.id);
  console.log('[createAppointment] resolved customerId:', customerId);

  const bookingSource =
    user.role === UserRole.ADMIN
      ? 'ADMIN_DASHBOARD'
      : user.role === UserRole.SALON_OWNER
        ? 'ADMIN_DASHBOARD'
        : user.role === UserRole.STAFF
          ? 'STAFF_DASHBOARD'
          : 'CUSTOMER_APP';

  const service = await servicesService.getById(dto.serviceId);
  if (!service) throw new Error('Selected service could not be found.');
  console.log('[createAppointment] service:', service.id, service.name, service.price, service.duration);

  const startTime = new Date(dto.startTime);
  const endTime = new Date(startTime.getTime() + service.duration * 60000);

  let discount = 0;
  if (dto.couponCode) {
    const coupon = await findCouponByCode(dto.salonId, dto.couponCode.trim().toUpperCase());
    console.log('[createAppointment] coupon lookup:', dto.couponCode, '->', coupon);
    const now = Date.now();
    const validFrom = coupon ? Date.parse(coupon.validFrom) : NaN;
    const validUntil = coupon ? Date.parse(coupon.validUntil) : NaN;
    const isWithinValidity =
      coupon &&
      (!Number.isFinite(validFrom) || now >= validFrom) &&
      (!Number.isFinite(validUntil) || now <= validUntil);
    if (coupon?.isActive && isWithinValidity && service.price >= Number(coupon.minAmount ?? 0)) {
      discount =
        coupon.type === 'PERCENTAGE' ? (service.price * coupon.value) / 100 : coupon.value;
      if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
      discount = Math.min(discount, service.price);
    }
  }

  const tax = Math.round((service.price - discount) * 0.18 * 100) / 100;
  const total = Math.round((service.price - discount + tax) * 100) / 100;

  const payload = {
    salonId: dto.salonId,
    customerId,
    staffId: dto.staffId,
    serviceId: dto.serviceId,
    status: 'PENDING' as any,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    price: service.price,
    discount,
    tax,
    total,
    notes: dto.notes ?? null,
    cancelledAt: null,
    cancellationReason: null,
    qrCode: generateQrCode(),
    bookingSource,
    bookingReason: dto.manualReason ?? null,
  };
  console.log('[createAppointment] writing appointment doc:', payload);

  try {
    const created = await appointmentsService.create(payload as any);
    await appointmentStatusHistoryService.create({
      appointmentId: created.id,
      status: 'PENDING' as any,
      changedById: user.id,
      note: null,
    } as any);
    console.log('[createAppointment] created appointment:', created.id);
    return created;
  } catch (error) {
    console.error('[createAppointment] Firestore write failed:', error);
    throw error;
  }
}
