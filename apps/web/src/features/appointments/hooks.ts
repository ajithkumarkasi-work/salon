import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryConstraint, orderBy, where } from 'firebase/firestore';
import {
  appointmentStatusHistoryService,
  appointmentsService,
  enrichAppointments,
  listUsersByRole,
  notifyAppointmentStatusChange,
  salonsService,
} from '@/shared/lib/firebase';
import { useAuthStore } from '@/shared/stores/auth.store';
import { CreateAppointmentDto } from '@glowbook/validation';
import { NotificationType, UserRole } from '@glowbook/shared-types';

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (filters: Record<string, unknown>) => [...appointmentKeys.all, 'list', filters] as const,
  detail: (id: string) => [...appointmentKeys.all, id] as const,
  calendar: (salonId: string, start: string, end: string) =>
    [...appointmentKeys.all, 'calendar', salonId, start, end] as const,
};

export function useAppointments(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: async () => {
      console.log('[useAppointments] filters received:', filters);

      // Only one equality filter is sent to Firestore (whichever scope field
      // is present) — everything else (status, date range, search) is applied
      // client-side. This avoids needing a separate composite index for every
      // filter combination, and avoids treating non-Firestore keys (like the
      // startDate/endDate range params) as bogus equality filters.
      const scopeKey = ['salonId', 'customerId', 'staffId'].find(
        (key) => filters[key] !== undefined && filters[key] !== null && filters[key] !== '',
      );
      console.log('[useAppointments] scope key resolved:', scopeKey, scopeKey ? filters[scopeKey] : undefined);

      const constraints: QueryConstraint[] = [];
      if (scopeKey) constraints.push(where(scopeKey, '==', filters[scopeKey]));
      constraints.push(orderBy('startTime', 'desc'));

      let raw: Awaited<ReturnType<typeof appointmentsService.list>>;
      try {
        raw = await appointmentsService.list(...constraints);
        console.log('[useAppointments] Firestore returned', raw.length, 'raw appointment doc(s)');
      } catch (error) {
        console.error('[useAppointments] Firestore query failed:', error);
        throw error;
      }

      let all = await enrichAppointments(raw);
      console.log('[useAppointments] enriched appointments:', all.length);

      if (typeof filters.status === 'string' && filters.status) {
        const before = all.length;
        all = all.filter((appt: any) => appt.status === filters.status);
        console.log(`[useAppointments] status filter '${filters.status}': ${before} -> ${all.length}`);
      }

      const startDate = typeof filters.startDate === 'string' ? filters.startDate : '';
      if (startDate) {
        const before = all.length;
        all = all.filter((appt: any) => appt.startTime >= startDate);
        console.log(`[useAppointments] startDate filter '${startDate}': ${before} -> ${all.length}`);
      }
      const endDate = typeof filters.endDate === 'string' ? filters.endDate : '';
      if (endDate) {
        const before = all.length;
        all = all.filter((appt: any) => appt.startTime <= endDate);
        console.log(`[useAppointments] endDate filter '${endDate}': ${before} -> ${all.length}`);
      }

      const search = typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : '';
      if (search) {
        const before = all.length;
        all = all.filter((appt: any) => {
          const haystack = [
            appt.customer?.firstName,
            appt.customer?.lastName,
            appt.customer?.email,
            appt.service?.name,
            appt.staff?.user?.firstName,
            appt.staff?.user?.lastName,
            appt.qrCode,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(search);
        });
        console.log(`[useAppointments] search filter '${search}': ${before} -> ${all.length}`);
      }

      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? (all.length || 1));
      const start = (page - 1) * limit;
      const data = filters.limit ? all.slice(start, start + limit) : all;
      console.log(`[useAppointments] pagination: page=${page} limit=${limit} -> returning ${data.length} of ${all.length}`);

      const result = { data, meta: { total: all.length, page, limit, totalPages: Math.max(1, Math.ceil(all.length / limit)) } };
      console.log('[useAppointments] final result:', result);
      return result;
    },
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: async () => {
      console.log('[useAppointment] fetching appointment id:', id);
      const appt = await appointmentsService.getById(id);
      if (!appt) {
        console.log('[useAppointment] no appointment found for id:', id);
        return null;
      }
      const [enriched] = await enrichAppointments([appt]);
      console.log('[useAppointment] enriched result:', enriched);
      return enriched;
    },
    enabled: !!id,
  });
}

export function useCalendar(salonId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: appointmentKeys.calendar(salonId, startDate, endDate),
    queryFn: async () => {
      console.log('[useCalendar] querying salonId:', salonId, 'range:', startDate, '->', endDate);
      const raw = await appointmentsService.list(where('salonId', '==', salonId));
      const periodStart = new Date(startDate).getTime();
      const periodEnd = new Date(endDate).getTime();
      const inPeriod = raw
        .filter((appointment) => {
          const startTime = new Date(appointment.startTime).getTime();
          return Number.isFinite(startTime) && startTime >= periodStart && startTime <= periodEnd;
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      console.log('[useCalendar] Firestore returned', inPeriod.length, 'appointment(s) in period');
      const enriched = await enrichAppointments(inPeriod);
      console.log('[useCalendar] enriched appointments:', enriched.length);
      return enriched;
    },
    enabled: !!salonId && !!startDate && !!endDate,
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      console.log('[useUpdateAppointmentStatus] updating', id, '->', status);
      try {
        const appointment = await appointmentsService.getById(id);
        const result = await appointmentsService.update(id, { status: status as any });
        if (appointment) {
          try {
            await appointmentStatusHistoryService.create({
              appointmentId: id,
              status: status as any,
              changedById: useAuthStore.getState().user?.id ?? '',
              note: note ?? null,
            } as any);
          } catch (historyError) {
            console.warn('[useUpdateAppointmentStatus] status history write failed:', historyError);
          }
          try {
            const [salon, adminUsers] = await Promise.all([
              salonsService.getById(appointment.salonId),
              listUsersByRole(UserRole.ADMIN),
            ]);

            const currentUser = useAuthStore.getState().user;
            await notifyAppointmentStatusChange({
              customerId: appointment.customerId,
              ownerId: salon?.ownerId,
              adminIds: adminUsers.map((user: { id: string }) => user.id),
              appointmentId: id,
              status,
              changedById: currentUser?.id,
              changedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : undefined,
              changedByRole: currentUser?.role,
              title: 'Appointment status updated',
              body: `Your appointment status changed to ${status.replace('_', ' ').toLowerCase()}.`,
            });
          } catch (notificationError) {
            console.warn('[useUpdateAppointmentStatus] notification creation failed:', notificationError);
          }
        }
        console.log('[useUpdateAppointmentStatus] update succeeded for', id);
        return result;
      } catch (error) {
        console.error('[useUpdateAppointmentStatus] Firestore update failed:', error);
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useUpdateAppointmentStatuses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; status: string; note?: string }> }) => {
      await Promise.all(updates.map((u) => appointmentsService.update(u.id, { status: u.status as any })));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAppointmentDto) => {
      const { createAppointment } = await import('@/shared/lib/booking');
      return createAppointment(dto);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const result = await appointmentsService.update(id, {
        status: 'CANCELLED' as any,
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason,
      });
      try {
        await appointmentStatusHistoryService.create({
          appointmentId: id,
          status: 'CANCELLED' as any,
          changedById: useAuthStore.getState().user?.id ?? '',
          note: reason || null,
        } as any);
      } catch (historyError) {
        console.warn('[useCancelAppointment] status history write failed:', historyError);
      }
      try {
        const appointment = await appointmentsService.getById(id);
        if (appointment) {
          const [salon, adminUsers] = await Promise.all([
            salonsService.getById(appointment.salonId),
            listUsersByRole(UserRole.ADMIN),
          ]);

          const currentUser = useAuthStore.getState().user;
          await notifyAppointmentStatusChange({
            customerId: appointment.customerId,
            ownerId: salon?.ownerId,
            adminIds: adminUsers.map((user: { id: string }) => user.id),
            appointmentId: id,
            status: 'CANCELLED',
            changedById: currentUser?.id,
            changedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : undefined,
            changedByRole: currentUser?.role,
            title: 'Appointment status updated',
            body: 'Your appointment status changed to cancelled.',
          });
        }
      } catch (notificationError) {
        console.warn('[useCancelAppointment] notification creation failed:', notificationError);
      }
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

