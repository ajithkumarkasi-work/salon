import {
  CollectionReference,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
  collection,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';

/** Recursively converts Firestore Timestamp fields into ISO strings, since
 * shared-types declares createdAt/updatedAt (and similar) as `string`. */
function normalizeTimestamps<T>(value: T): T {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTimestamps(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      normalizeTimestamps(val),
    ]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

/** Generic converter that trusts the stored shape matches `T` (minus `id`). */
export function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T): DocumentData {
      const { id, ...rest } = model as T & { id: string };
      return rest;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      return { id: snapshot.id, ...normalizeTimestamps(snapshot.data(options)) } as T;
    },
  };
}

export function typedCollection<T extends { id: string }>(name: string): CollectionReference<T> {
  return collection(getFirebaseDb(), name).withConverter(makeConverter<T>());
}

