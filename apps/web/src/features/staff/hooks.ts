import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStaffAccount, listAllStaffBySalon, staffService, updateUserProfile, withStaffUserProfiles } from '@/shared/lib/firebase';
import { useAuthStore } from '@/shared/stores/auth.store';
import { where } from 'firebase/firestore';
import { CreateStaffDto, UpdateStaffDto } from '@glowbook/validation';

export const staffKeys = {
  all: ['staff'] as const,
  bySalon: (salonId: string) => [...staffKeys.all, salonId] as const,
  me: () => [...staffKeys.all, 'me'] as const,
};

export function useMyStaffProfile(enabled = true) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: staffKeys.me(),
    queryFn: async () => {
      const matches = await staffService.list(where('userId', '==', user!.id));
      return matches[0] ?? null;
    },
    enabled: enabled && !!user,
  });
}

export function useStaff(salonId: string) {
  return useQuery({
    queryKey: staffKeys.bySalon(salonId),
    queryFn: async () => withStaffUserProfiles(await listAllStaffBySalon(salonId)),
    enabled: !!salonId,
  });
}

export function useCreateStaff(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateStaffDto) => {
      // Creates a real Firebase Auth login + `users/{uid}` profile (role STAFF)
      // so the staff member also shows up in the users table and can sign in.
      const { email, password, firstName, lastName, phone, serviceIds, ...rest } = dto as any;
      const staffUser = await createStaffAccount({ email, password, firstName, lastName, phone });

      return staffService.create({
        ...rest,
        salonId,
        userId: staffUser.id,
        bio: dto.bio ?? null,
        avatarUrl: null,
        isActive: true,
        rating: 0,
        reviewCount: 0,
        serviceIds,
      } as any);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.bySalon(salonId) }),
  });
}

export function useUpdateStaff(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto, userId }: { id: string; dto: UpdateStaffDto; userId?: string }) => {
      const { firstName, lastName, email: _email, phone, serviceIds, role, bio, ...rest } = dto as any;

      // firstName/lastName/phone live on the linked `users/{userId}` doc, not
      // the staff doc — email is intentionally not editable here (it's tied
      // to the Firebase Auth account).
      if (userId && (firstName !== undefined || lastName !== undefined || phone !== undefined)) {
        await updateUserProfile(userId, {
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
          ...(phone !== undefined ? { phone } : {}),
        });
      }

      return staffService.update(id, { ...rest, role, bio, serviceIds } as any);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.bySalon(salonId) }),
  });
}

export function useDeleteStaff(salonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => staffService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.bySalon(salonId) }),
  });
}
