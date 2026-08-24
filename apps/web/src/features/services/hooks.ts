import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAllServicesBySalon, servicesService } from '@/shared/lib/firebase';
import { CreateServiceDto, UpdateServiceDto } from '@glowbook/validation';

export const serviceKeys = {
  all: ['services'] as const,
  bySalon: (salonId: string) => [...serviceKeys.all, salonId] as const,
};

export function useServices(salonId: string) {
  return useQuery({
    queryKey: serviceKeys.bySalon(salonId),
    queryFn: () => listAllServicesBySalon(salonId),
    enabled: !!salonId,
  });
}

export function useCreateService(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateServiceDto) =>
      servicesService.create({
        ...dto,
        salonId,
        categoryId: dto.categoryId ?? null,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        isActive: true,
      } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.bySalon(salonId) }),
  });
}

export function useUpdateService(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateServiceDto }) => servicesService.update(id, dto as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.bySalon(salonId) }),
  });
}

export function useDeleteService(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => servicesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.bySalon(salonId) }),
  });
}
