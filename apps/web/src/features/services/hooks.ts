import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { CreateServiceDto, UpdateServiceDto } from '@glowbook/validation';

export const serviceKeys = {
  all: ['services'] as const,
  bySalon: (salonId: string) => [...serviceKeys.all, salonId] as const,
};

export function useServices(salonId: string) {
  return useQuery({
    queryKey: serviceKeys.bySalon(salonId),
    queryFn: async () => {
      const { data } = await api.get(`/salons/${salonId}/services`);
      return data;
    },
    enabled: !!salonId,
  });
}

export function useCreateService(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateServiceDto) => {
      const { data } = await api.post(`/salons/${salonId}/services`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.bySalon(salonId) }),
  });
}

export function useUpdateService(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateServiceDto }) => {
      const { data } = await api.patch(`/services/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.bySalon(salonId) }),
  });
}

export function useDeleteService(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/services/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.bySalon(salonId) }),
  });
}
