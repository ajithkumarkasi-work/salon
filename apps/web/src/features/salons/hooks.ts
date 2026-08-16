import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
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
        const { data } = await api.get('/salons/mine');
        return data;
      }

      // Admin and non-owner roles consume the public salon list shape.
      const { data } = await api.get('/salons', { params: { page: 1, limit: 100 } });
      return data?.data ?? [];
    },
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
    queryFn: async () => {
      const { data } = await api.get(`/salons/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
