import { where } from 'firebase/firestore';
import { StaffLeave } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';

export const staffLeavesService = createFirestoreService<StaffLeave>(Collections.staffLeaves);

export function listStaffLeaves(staffId: string) {
  return staffLeavesService.list(where('staffId', '==', staffId));
}

export function isOnStaffLeave(leaves: StaffLeave[], date: string) {
  return leaves.some(
    (leave) => leave.isApproved && date >= leave.startDate.slice(0, 10) && date <= leave.endDate.slice(0, 10),
  );
}