import { Appointment, DayOfWeek, TimeSlot } from '@glowbook/shared-types';
import { where } from 'firebase/firestore';
import { appointmentsService } from './appointments.service';
import { servicesService } from './services.service';
import { staffService, withStaffUserProfiles } from './staff.service';
import { isOnStaffLeave, listStaffLeaves } from './staff-leaves.service';
import { listWorkingHoursBySalon, listWorkingHoursByStaff } from './working-hours.service';

const DAY_NAMES: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

// Used whenever a salon/staff member hasn't configured working hours yet, so
// booking still works instead of silently showing zero slots.
const DEFAULT_OPEN_TIME = '09:00';
const DEFAULT_CLOSE_TIME = '19:00';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface AvailabilityParams {
  salonId: string;
  serviceId: string;
  staffId?: string;
  date: string; // YYYY-MM-DD
}

/**
 * Computes free time slots by combining working hours, service duration, and
 * existing appointments. This replicates what the NestJS availability
 * endpoint used to do, entirely on the client against Firestore data.
 */
export async function getAvailability({ salonId, serviceId, staffId, date }: AvailabilityParams): Promise<TimeSlot[]> {
  const service = await servicesService.getById(serviceId);
  if (!service) return [];

  const stepMinutes = service.duration + (service.bufferTime ?? 0);
  const dayOfWeek = DAY_NAMES[new Date(`${date}T00:00:00`).getDay()];

  const rawCandidateStaff = staffId
    ? [await staffService.getById(staffId)].filter((s): s is NonNullable<typeof s> => !!s)
    : (await staffService.list(where('salonId', '==', salonId), where('isActive', '==', true))).filter(
        (member: any) => !member.serviceIds?.length || member.serviceIds.includes(serviceId),
      );
  // Attach the linked user profile so real staff names show up (instead of
  // falling back to a generic "Staff" label) in the booking UI.
  const candidateStaff = await withStaffUserProfiles(rawCandidateStaff);

  const slots: TimeSlot[] = [];

  for (const member of candidateStaff) {
    if (isOnStaffLeave(await listStaffLeaves(member.id), date)) continue;

    const staffName = (member as any).user
      ? `${(member as any).user.firstName} ${(member as any).user.lastName}`
      : member.role;

    const staffHours = await listWorkingHoursByStaff(member.id);
    let hours = staffHours.find((h) => h.dayOfWeek === dayOfWeek);

    if (!hours) {
      const salonHours = await listWorkingHoursBySalon(salonId);
      hours = salonHours.find((h) => h.dayOfWeek === dayOfWeek);
    }

    if (hours?.isClosed) continue;

    // No working hours configured yet for this salon/staff — default to a
    // standard open window rather than showing zero slots.
    const openTime = hours?.openTime ?? DEFAULT_OPEN_TIME;
    const closeTime = hours?.closeTime ?? DEFAULT_CLOSE_TIME;

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    let existingAppointments: Appointment[] = [];
    try {
      existingAppointments = (await appointmentsService.list(where('staffId', '==', member.id))).filter((appt) => {
        const start = new Date(appt.startTime);
        return start >= dayStart && start <= dayEnd;
      });
    } catch (error) {
      // Customers may not have permission to read another customer's appointment.
      console.warn('[availability] Could not read existing appointments:', error);
    }
    const busy = existingAppointments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW');

    const openMin = timeToMinutes(openTime);
    const closeMin = timeToMinutes(closeTime);

    for (let start = openMin; start + service.duration <= closeMin; start += stepMinutes) {
      const slotStart = new Date(`${date}T${minutesToTime(start)}:00`);
      const slotEnd = new Date(slotStart.getTime() + service.duration * 60000);

      const overlaps = busy.some((appt) => {
        const apptStart = new Date(appt.startTime);
        const apptEnd = new Date(appt.endTime);
        return slotStart < apptEnd && slotEnd > apptStart;
      });

      slots.push({
        time: minutesToTime(start),
        staffId: member.id,
        staffName,
        isAvailable: !overlaps,
      });
    }
  }

  return slots;
}
