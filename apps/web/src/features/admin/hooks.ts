import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFirebaseDb, staffService, updateUserProfile } from '@/shared/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { UserRole } from '@glowbook/shared-types';

export const adminKeys = {
  users: (page: number, role?: string) => ['admin', 'users', page, role] as const,
};

export function useAdminUsers(page = 1, role?: string) {
  const limit = 20;
  return useQuery({
    queryKey: adminKeys.users(page, role),
    queryFn: async () => {
      const snapshot = await getDocs(collection(getFirebaseDb(), 'users'));
      let all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
      if (role) all = all.filter((u) => u.role === role);
      const total = all.length;
      const start = (page - 1) * limit;
      return { data: all.slice(start, start + limit), meta: { total, page, limit } };
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role, salonId }: { id: string; role: UserRole; salonId?: string }) => {
      await updateUserProfile(id, { role });
      if (role === UserRole.STAFF && salonId) {
        await staffService.create({
          userId: id,
          salonId,
          bio: null,
          role: 'Stylist',
          avatarUrl: null,
          isActive: true,
          rating: 0,
          reviewCount: 0,
          serviceIds: [],
        } as any);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

