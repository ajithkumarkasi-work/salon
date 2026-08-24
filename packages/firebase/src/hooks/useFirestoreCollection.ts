import { useEffect, useState } from 'react';
import { DocumentData, Query, onSnapshot } from 'firebase/firestore';

interface UseFirestoreCollectionResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
}

/** Subscribes to a Firestore query and keeps `data` in sync in real time. */
export function useFirestoreCollection<T extends DocumentData>(
  query: Query<T> | null | undefined,
): UseFirestoreCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => doc.data()));
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
  }, [query]);

  return { data, isLoading, error };
}
