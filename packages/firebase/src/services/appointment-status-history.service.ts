import { where } from 'firebase/firestore';
import { AppointmentStatusHistory } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';

export const appointmentStatusHistoryService = createFirestoreService<AppointmentStatusHistory>(
  Collections.appointmentStatusHistory,
);

export function listAppointmentStatusHistory(appointmentId: string) {
  return appointmentStatusHistoryService.list(where('appointmentId', '==', appointmentId)).then((history) =>
    history.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
  );
}