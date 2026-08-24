import { useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../config';

interface UseFirebaseAuthUserResult {
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
}

/** Tracks the raw Firebase Auth user (not the Firestore `users/{uid}` profile). */
export function useFirebaseAuthUser(): UseFirebaseAuthUserResult {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { firebaseUser, isLoading };
}
