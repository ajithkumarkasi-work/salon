import { useQuery } from '@tanstack/react-query';
import { where } from 'firebase/firestore';
import { appointmentsService, salonsService, servicesService, staffService } from '@/shared/lib/firebase';

export const analyticsKeys = {
  summary: (salonId: string, range: string) => ['analytics', 'summary', salonId, range] as const,
  revenue: (salonId: string, range: string) => ['analytics', 'revenue', salonId, range] as const,
  services: (salonId: string, range: string) => ['analytics', 'services', salonId, range] as const,
  staff: (salonId: string, range: string) => ['analytics', 'staff', salonId, range] as const,
  peakHours: (salonId: string, range: string) => ['analytics', 'peak-hours', salonId, range] as const,
};

interface DateRange {
  startDate: string;
  endDate: string;
}

async function loadAppointmentsInRange(salonId: string, range: DateRange) {
  const all = await appointmentsService.list(where('salonId', '==', salonId));
  return all.filter((a) => {
    const day = a.startTime.slice(0, 10);
    return day >= range.startDate && day <= range.endDate;
  });
}

export function useAnalyticsSummary(salonId: string, range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.summary(salonId, `${range.startDate}-${range.endDate}`),
    queryFn: async () => {
      const appointments = await loadAppointmentsInRange(salonId, range);
      const completed = appointments.filter((a) => a.status === 'COMPLETED');
      const cancelled = appointments.filter((a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW');
      const totalRevenue = completed.reduce((sum, a) => sum + Number(a.total), 0);
      const uniqueCustomers = new Set(appointments.map((a) => a.customerId));
      const salon = await salonsService.getById(salonId);

      return {
        totalRevenue,
        totalBookings: appointments.length,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        newCustomers: uniqueCustomers.size,
        repeatCustomers: 0,
        averageBookingValue: completed.length ? totalRevenue / completed.length : 0,
        cancellationRate: appointments.length ? (cancelled.length / appointments.length) * 100 : 0,
        averageRating: salon?.rating ?? 0,
      };
    },
    enabled: !!salonId,
  });
}

export function useRevenueChart(salonId: string, range: DateRange, groupBy = 'day') {
  return useQuery({
    queryKey: analyticsKeys.revenue(salonId, `${range.startDate}-${range.endDate}-${groupBy}`),
    queryFn: async () => {
      const appointments = (await loadAppointmentsInRange(salonId, range)).filter((a) => a.status === 'COMPLETED');
      const byDate = new Map<string, { date: string; revenue: number; bookings: number }>();
      for (const appt of appointments) {
        const key = appt.startTime.slice(0, 10);
        const entry = byDate.get(key) ?? { date: key, revenue: 0, bookings: 0 };
        entry.revenue += Number(appt.total);
        entry.bookings += 1;
        byDate.set(key, entry);
      }
      return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!salonId,
  });
}

export function usePopularServices(salonId: string, range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.services(salonId, `${range.startDate}-${range.endDate}`),
    queryFn: async () => {
      const appointments = (await loadAppointmentsInRange(salonId, range)).filter((a) => a.status === 'COMPLETED');
      const byService = new Map<string, { serviceId: string; bookings: number; revenue: number }>();
      for (const appt of appointments) {
        const entry = byService.get(appt.serviceId) ?? { serviceId: appt.serviceId, bookings: 0, revenue: 0 };
        entry.bookings += 1;
        entry.revenue += Number(appt.total);
        byService.set(appt.serviceId, entry);
      }
      const entries = Array.from(byService.values());
      const services = await Promise.all(entries.map((e) => servicesService.getById(e.serviceId)));
      return entries
        .map((entry, i) => ({ ...entry, serviceName: services[i]?.name ?? 'Unknown service' }))
        .sort((a, b) => b.bookings - a.bookings);
    },
    enabled: !!salonId,
  });
}

export function useStaffPerformance(salonId: string, range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.staff(salonId, `${range.startDate}-${range.endDate}`),
    queryFn: async () => {
      const appointments = (await loadAppointmentsInRange(salonId, range)).filter((a) => a.status === 'COMPLETED');
      const byStaff = new Map<string, { staffId: string; bookings: number; revenue: number }>();
      for (const appt of appointments) {
        const entry = byStaff.get(appt.staffId) ?? { staffId: appt.staffId, bookings: 0, revenue: 0 };
        entry.bookings += 1;
        entry.revenue += Number(appt.total);
        byStaff.set(appt.staffId, entry);
      }
      const entries = Array.from(byStaff.values());
      const staffMembers = await Promise.all(entries.map((e) => staffService.getById(e.staffId)));
      return entries
        .map((entry, i) => ({
          ...entry,
          staffName: staffMembers[i]?.role ?? 'Unknown staff',
          rating: staffMembers[i]?.rating ?? 0,
        }))
        .sort((a, b) => b.bookings - a.bookings);
    },
    enabled: !!salonId,
  });
}

