import {
  DocumentData,
  QueryConstraint,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { typedCollection } from '../converters';

/** Generic Firestore CRUD helpers for a single collection, typed to entity `T`. */
export function createFirestoreService<T extends { id: string }>(collectionName: string) {
  const collectionRef = () => typedCollection<T>(collectionName);

  return {
    collectionRef,

    async list(...constraints: QueryConstraint[]): Promise<T[]> {
      const snapshot = await getDocs(query(collectionRef(), ...constraints));
      return snapshot.docs.map((d) => d.data());
    },

    async getById(id: string): Promise<T | null> {
      const snapshot = await getDoc(doc(collectionRef(), id));
      return snapshot.exists() ? snapshot.data() : null;
    },

    async create(input: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
      const payload = { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as DocumentData;
      const ref = await addDoc(collectionRef(), payload as T);
      const created = await getDoc(ref);
      return created.data() as T;
    },

    async update(id: string, input: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void> {
      await updateDoc(doc(collectionRef(), id), { ...input, updatedAt: serverTimestamp() } as DocumentData);
    },

    async remove(id: string): Promise<void> {
      await deleteDoc(doc(collectionRef(), id));
    },
  };
}
