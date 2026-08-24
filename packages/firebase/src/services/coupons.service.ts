import { where } from 'firebase/firestore';
import { Coupon } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';

export const couponsService = createFirestoreService<Coupon>(Collections.coupons);

export function listCouponsBySalon(salonId: string) {
  return couponsService.list(where('salonId', '==', salonId), where('isActive', '==', true));
}

/** Includes deactivated coupons — for the salon owner's management view. */
export function listAllCouponsBySalon(salonId: string) {
  return couponsService.list(where('salonId', '==', salonId));
}

export async function findCouponByCode(salonId: string, code: string): Promise<Coupon | null> {
  const matches = await couponsService.list(where('salonId', '==', salonId), where('code', '==', code));
  return matches[0] ?? null;
}
