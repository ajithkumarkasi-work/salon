import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { UserRole } from '@glowbook/shared-types';

export const adminKeys = {
  users: (page: number, role?: string) => ['admin', 'users', page, role] as const,
};

export function useAdminUsers(page = 1, role?: string) {
  return useQuery({
    queryKey: adminKeys.users(page, role),
    queryFn: async () => {
      const { data } = await api.get('/admin/users', { params: { page, limit: 20, role } });
      return data;
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role, salonId }: { id: string; role: UserRole; salonId?: string }) => {
      const { data } = await api.patch(`/admin/users/${id}/role`, { role, salonId });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
