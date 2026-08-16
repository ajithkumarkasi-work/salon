import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { CreateStaffDto, UpdateStaffDto } from '@glowbook/validation';

export const staffKeys = {
  all: ['staff'] as const,
  bySalon: (salonId: string) => [...staffKeys.all, salonId] as const,
  me: () => [...staffKeys.all, 'me'] as const,
};

export function useMyStaffProfile(enabled = true) {
  return useQuery({
    queryKey: staffKeys.me(),
    queryFn: async () => {
      const { data } = await api.get('/staff/me');
      return data;
    },
    enabled,
  });
}

export function useStaff(salonId: string) {
  return useQuery({
    queryKey: staffKeys.bySalon(salonId),
    queryFn: async () => {
      const { data } = await api.get(`/salons/${salonId}/staff`);
      return data;
    },
    enabled: !!salonId,
  });
}

export function useCreateStaff(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateStaffDto) => {
      const { data } = await api.post(`/salons/${salonId}/staff`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.bySalon(salonId) }),
  });
}

export function useUpdateStaff(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateStaffDto }) => {
      const { data } = await api.patch(`/staff/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.bySalon(salonId) }),
  });
}

export function useDeleteStaff(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/staff/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.bySalon(salonId) }),
  });
}
