import { where } from 'firebase/firestore';
import { WorkingHour } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';

export const workingHoursService = createFirestoreService<WorkingHour>(Collections.workingHours);

export function listWorkingHoursBySalon(salonId: string) {
  return workingHoursService.list(where('salonId', '==', salonId));
}

export function listWorkingHoursByStaff(staffId: string) {
  return workingHoursService.list(where('staffId', '==', staffId));
}
