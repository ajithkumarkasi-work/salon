import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { CreateAppointmentDto } from '@glowbook/validation';

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
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      });
      const { data } = await api.get(`/appointments?${params}`);
      return data;
    },
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/appointments/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCalendar(salonId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: appointmentKeys.calendar(salonId, startDate, endDate),
    queryFn: async () => {
      const { data } = await api.get(`/appointments/calendar`, {
        params: { salonId, startDate, endDate },
      });
      return data;
    },
    enabled: !!salonId && !!startDate && !!endDate,
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const { data } = await api.patch(`/appointments/${id}/status`, { status, note });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useUpdateAppointmentStatuses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; status: string; note?: string }> }) => {
      const { data } = await api.patch('/appointments/statuses', { updates });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAppointmentDto) => {
      const { data } = await api.post('/appointments', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/appointments/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}
