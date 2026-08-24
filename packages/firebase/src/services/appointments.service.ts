import { orderBy, where } from 'firebase/firestore';
import { Appointment } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';
import { fetchUserProfile } from './auth.service';
import { salonsService } from './salons.service';
import { servicesService } from './services.service';
import { staffService } from './staff.service';
import { listAppointmentStatusHistory } from './appointment-status-history.service';

export const appointmentsService = createFirestoreService<Appointment>(Collections.appointments);

export function listAppointmentsByCustomer(customerId: string) {
  return appointmentsService.list(where('customerId', '==', customerId), orderBy('startTime', 'desc'));
}

export function listAppointmentsBySalon(salonId: string) {
  return appointmentsService.list(where('salonId', '==', salonId), orderBy('startTime', 'desc'));
}

export function listAppointmentsByStaff(staffId: string) {
  return appointmentsService.list(where('staffId', '==', staffId), orderBy('startTime', 'desc'));
}

async function safeFetch<T>(fn: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/**
 * Attaches denormalized `salon`, `service`, `staff` (with `user`), and `customer`
 * fields, since appointment docs only store the related ids.
 */
export async function enrichAppointments(appointments: Appointment[]): Promise<Appointment[]> {
  const salonIds = Array.from(new Set(appointments.map((a) => a.salonId)));
  const serviceIds = Array.from(new Set(appointments.map((a) => a.serviceId)));
  const staffIds = Array.from(new Set(appointments.map((a) => a.staffId)));
  const customerIds = Array.from(new Set(appointments.map((a) => a.customerId)));

  const [salons, services, staffMembers, customers] = await Promise.all([
    Promise.all(salonIds.map((id) => safeFetch(() => salonsService.getById(id)))),
    Promise.all(serviceIds.map((id) => safeFetch(() => servicesService.getById(id)))),
    Promise.all(staffIds.map((id) => safeFetch(() => staffService.getById(id)))),
    Promise.all(customerIds.map((id) => safeFetch(() => fetchUserProfile(id)))),
  ]);

  const staffWithUsers = await Promise.all(
    staffMembers.map(async (member) => {
      if (!member?.userId) return member;
      const user = await safeFetch(() => fetchUserProfile(member.userId));
      return user ? { ...member, user } : member;
    }),
  );

  const salonById = new Map(salonIds.map((id, i) => [id, salons[i]]));
  const serviceById = new Map(serviceIds.map((id, i) => [id, services[i]]));
  const staffById = new Map(staffIds.map((id, i) => [id, staffWithUsers[i]]));
  const customerById = new Map(customerIds.map((id, i) => [id, customers[i]]));

  const historyByAppointment = new Map(
    await Promise.all(
      appointments.map(async (appointment) => [appointment.id, await safeFetch(() => listAppointmentStatusHistory(appointment.id))] as const),
    ),
  );
  const historyActorIds = Array.from(
    new Set(Array.from(historyByAppointment.values()).flatMap((items) => (items ?? []).map((item) => item.changedById))),
  );
  const historyActors = await Promise.all(historyActorIds.map((id) => safeFetch(() => fetchUserProfile(id))));
  const actorById = new Map(historyActorIds.map((id, index) => [id, historyActors[index]]));

  return appointments.map((appt) => ({
    ...appt,
    salon: salonById.get(appt.salonId) ?? undefined,
    service: serviceById.get(appt.serviceId) ?? undefined,
    staff: staffById.get(appt.staffId) ?? undefined,
    customer: customerById.get(appt.customerId) ?? undefined,
    statusHistory: (historyByAppointment.get(appt.id) ?? []).map((item) => ({
      ...item,
      changedBy: actorById.get(item.changedById) ?? undefined,
    })),
  })) as Appointment[];
}
