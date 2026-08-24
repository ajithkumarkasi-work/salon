import { where } from 'firebase/firestore';
import { Service, ServiceCategory } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';

export const servicesService = createFirestoreService<Service>(Collections.services);
export const serviceCategoriesService = createFirestoreService<ServiceCategory>(Collections.serviceCategories);

export function listServicesBySalon(salonId: string) {
  return servicesService.list(where('salonId', '==', salonId), where('isActive', '==', true));
}

/** Includes inactive services — for the salon owner's management view. */
export function listAllServicesBySalon(salonId: string) {
  return servicesService.list(where('salonId', '==', salonId));
}
