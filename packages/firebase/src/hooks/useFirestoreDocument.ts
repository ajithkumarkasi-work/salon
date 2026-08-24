import { useEffect, useState } from 'react';
import { DocumentData, DocumentReference, onSnapshot } from 'firebase/firestore';

interface UseFirestoreDocumentResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/** Subscribes to a single Firestore document and keeps `data` in sync in real time. */
export function useFirestoreDocument<T extends DocumentData>(
  ref: DocumentReference<T> | null | undefined,
): UseFirestoreDocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setData(snapshot.exists() ? snapshot.data() : null);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return { data, isLoading, error };
}
