import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserRole } from '@glowbook/shared-types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useSalonStore } from '@/stores/salon.store';

function preferredSalon(salons: any[]) {
  return salons.find((salon) => salon.slug === 'glow-grace-salon') ?? salons[0] ?? null;
}

export function useBusinessSalons() {
  const { user } = useAuthStore();
  const { activeSalonId, setActiveSalonId } = useSalonStore();

  const isStaff = user?.role === UserRole.STAFF;
  const isOwner = user?.role === UserRole.SALON_OWNER;
  const isAdmin = user?.role === UserRole.ADMIN;

  const staffProfile = useQuery({
    queryKey: ['mobile-staff-profile', user?.id],
    queryFn: async () => (await api.get('/staff/me')).data,
    enabled: !!user && isStaff,
  });

  const salonsQuery = useQuery({
    queryKey: ['mobile-business-salons', user?.id, user?.role],
    queryFn: async () => {
      if (isOwner) {
        return (await api.get('/salons/mine')).data ?? [];
      }
      if (isAdmin) {
        return (await api.get('/salons', { params: { page: 1, limit: 100 } })).data?.data ?? [];
      }
      const salon = staffProfile.data?.salon;
      return salon ? [salon] : [];
    },
    enabled: !!user && (isOwner || isAdmin || isStaff),
  });

  const salons = useMemo(() => salonsQuery.data ?? [], [salonsQuery.data]);

  useEffect(() => {
    if (isStaff && staffProfile.data?.salon?.id && activeSalonId !== staffProfile.data.salon.id) {
      setActiveSalonId(staffProfile.data.salon.id);
      return;
    }

    if (!salons.length) return;
    const selected = preferredSalon(salons);
    if (!selected) return;

    if (!activeSalonId) {
      setActiveSalonId(selected.id);
      return;
    }

    const exists = salons.some((salon) => salon.id === activeSalonId);
    if (!exists) {
      setActiveSalonId(selected.id);
    }
  }, [activeSalonId, isStaff, salons, setActiveSalonId, staffProfile.data?.salon?.id]);

  const activeSalon = useMemo(
    () => salons.find((salon) => salon.id === activeSalonId) ?? null,
    [salons, activeSalonId],
  );

  return {
    salons,
    activeSalon,
    activeSalonId,
    setActiveSalonId,
    isLoading: salonsQuery.isLoading || staffProfile.isLoading,
  };
}