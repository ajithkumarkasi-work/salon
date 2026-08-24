import { doc, getDocs, setDoc, where } from 'firebase/firestore';
import { Salon, SalonCategory } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';

export const salonsService = createFirestoreService<Salon>(Collections.salons);
export const salonCategoriesService = createFirestoreService<SalonCategory>(Collections.salonCategories);

export function listActiveSalons() {
  return salonsService.list(where('isActive', '==', true));
}

export function listSalonsByOwner(ownerId: string) {
  return salonsService.list(where('ownerId', '==', ownerId));
}

const DEFAULT_SALON_CATEGORIES: Array<{ slug: string; name: string; icon: string | null }> = [
  { slug: 'hair-salon', name: 'Hair Salon', icon: '💇' },
  { slug: 'nail-salon', name: 'Nail Salon', icon: '💅' },
  { slug: 'spa-wellness', name: 'Spa & Wellness', icon: '🧖' },
  { slug: 'barbershop', name: 'Barbershop', icon: '💈' },
  { slug: 'skin-care', name: 'Skin Care', icon: '🧴' },
  { slug: 'makeup-studio', name: 'Makeup Studio', icon: '💄' },
  { slug: 'massage-therapy', name: 'Massage Therapy', icon: '💆' },
  { slug: 'tattoo-piercing', name: 'Tattoo & Piercing', icon: '🖋️' },
];

/**
 * Seeds the standard salon category list on first use (idempotent — uses the
 * slug as the doc id) so "Create Salon" always has a category to pick from.
 */
export async function ensureDefaultSalonCategories(): Promise<void> {
  const snapshot = await getDocs(salonCategoriesService.collectionRef());
  if (!snapshot.empty) return;

  await Promise.all(
    DEFAULT_SALON_CATEGORIES.map((category) =>
      setDoc(doc(salonCategoriesService.collectionRef(), category.slug), category as any),
    ),
  );
}

/** Lists salon categories, seeding the defaults first if none exist yet. */
export async function listSalonCategoriesWithDefaults(): Promise<SalonCategory[]> {
  await ensureDefaultSalonCategories();
  return salonCategoriesService.list();
}
