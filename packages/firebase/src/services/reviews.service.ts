import { where } from 'firebase/firestore';
import { Review } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';
import { fetchUserProfile } from './auth.service';

export const reviewsService = createFirestoreService<Review>(Collections.reviews);

export function listReviewsBySalon(salonId: string) {
  return reviewsService.list(where('salonId', '==', salonId), where('isPublished', '==', true));
}

export function listReviewsByStaff(staffId: string) {
  return reviewsService.list(where('staffId', '==', staffId), where('isPublished', '==', true));
}

/** Attaches a denormalized `customer` field, since reviews only store `customerId`. */
export async function withCustomerProfiles(reviews: Review[]): Promise<Review[]> {
  const uniqueIds = Array.from(new Set(reviews.map((r) => r.customerId)));
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
  return reviews.map((review) => ({ ...review, customer: byId.get(review.customerId) ?? undefined }));
}
