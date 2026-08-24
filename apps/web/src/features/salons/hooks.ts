import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listActiveSalons,
  listSalonCategoriesWithDefaults,
  listSalonsByOwner,
  salonsService,
} from '@/shared/lib/firebase';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { UserRole } from '@glowbook/shared-types';
import { useEffect } from 'react';

export const salonKeys = {
  all: ['salons'] as const,
  mine: () => [...salonKeys.all, 'mine'] as const,
  detail: (id: string) => [...salonKeys.all, id] as const,
  analytics: (id: string, range: string) => [...salonKeys.all, id, 'analytics', range] as const,
};

export function useOwnerSalons() {
  const { setActiveSalon, activeSalonId } = useSalonStore();
  const { user } = useAuthStore();

  const query = useQuery<any[]>({
    queryKey: salonKeys.mine(),
    queryFn: async () => {
      if (user?.role === UserRole.SALON_OWNER) {
        return listSalonsByOwner(user.id);
      }

      // Admin and non-owner roles consume the public salon list shape.
      return listActiveSalons();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!query.data || query.data.length === 0) return;

    const preferredSalon =
      query.data.find((salon: any) => salon.slug === 'glow-grace-salon') ?? query.data[0];

    if (!activeSalonId) {
      setActiveSalon(preferredSalon.id);
      return;
    }

    const stillExists = query.data.some((salon: any) => salon.id === activeSalonId);
    if (!stillExists) {
      setActiveSalon(preferredSalon.id);
    }
  }, [activeSalonId, query.data, setActiveSalon]);

  return query;
}

export function useSalon(id: string) {
  return useQuery({
    queryKey: salonKeys.detail(id),
    queryFn: () => salonsService.getById(id),
    enabled: !!id,
  });
}

export function useSalonCategories() {
  return useQuery({
    queryKey: [...salonKeys.all, 'categories'],
    queryFn: () => listSalonCategoriesWithDefaults(),
  });
}

export function useCreateSalon() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: any) => {
      if (!user) throw new Error('You must be signed in to create a salon.');
      if (user.role !== UserRole.SALON_OWNER) throw new Error('Only salon owners can create a salon.');
      const slug = `${dto.name}-${Date.now()}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      return salonsService.create({
        ...dto,
        slug,
        ownerId: user.id,
        description: null,
        coverImageUrl: null,
        logoUrl: null,
        isActive: true,
        isVerified: false,
        rating: 0,
        reviewCount: 0,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: salonKeys.mine() }),
  });
}

