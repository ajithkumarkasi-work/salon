import { where } from 'firebase/firestore';
import { Staff } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';
import { fetchUserProfile } from './auth.service';

export const staffService = createFirestoreService<Staff>(Collections.staff);

export function listStaffBySalon(salonId: string) {
  return staffService.list(where('salonId', '==', salonId), where('isActive', '==', true));
}

/** Includes inactive staff — for the salon owner's management view. */
export function listAllStaffBySalon(salonId: string) {
  return staffService.list(where('salonId', '==', salonId));
}

/** Attaches a denormalized `user` field, since staff docs only store `userId`. */
export async function withStaffUserProfiles(staffMembers: Staff[]): Promise<Staff[]> {
  const uniqueIds = Array.from(new Set(staffMembers.map((s) => s.userId).filter(Boolean)));
  const profiles = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return await fetchUserProfile(id);
      } catch {
        return null;
      }
    }),
  );
  const byId = new Map(uniqueIds.map((id, i) => [id, profiles[i]]));
  return staffMembers.map((member) => ({ ...member, user: byId.get(member.userId) ?? undefined }));
}
