import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { Favorite } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';

export const favoritesService = createFirestoreService<Favorite>(Collections.favorites);

export function listFavoritesByUser(userId: string) {
  return favoritesService.list(where('userId', '==', userId));
}

// Favorites use a deterministic doc id so add/remove/lookup by (userId, salonId) is O(1).
function favoriteDocId(userId: string, salonId: string): string {
  return `${userId}_${salonId}`;
}

export async function addFavorite(userId: string, salonId: string): Promise<void> {
  await setDoc(doc(favoritesService.collectionRef(), favoriteDocId(userId, salonId)), {
    userId,
    salonId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any);
}

export async function removeFavorite(userId: string, salonId: string): Promise<void> {
  await deleteDoc(doc(favoritesService.collectionRef(), favoriteDocId(userId, salonId)));
}

export async function isFavorited(userId: string, salonId: string): Promise<boolean> {
  const snapshot = await getDoc(doc(favoritesService.collectionRef(), favoriteDocId(userId, salonId)));
  return snapshot.exists();
}
