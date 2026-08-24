import { useEffect, useState } from 'react';
import {
  fetchUserProfile,
  logout as firebaseLogout,
  useFirebaseAuthUser,
} from '@/lib/firebase';
import { useAuthStore } from '@/stores/auth.store';

export { firebaseLogout };

/**
 * Keeps the zustand auth store in sync with Firebase Auth's session across
 * app restarts, so a signed-in user stays signed in without re-entering credentials.
 */
export function useFirebaseAuthSync() {
  const { firebaseUser, isLoading: isFirebaseLoading } = useFirebaseAuthUser();
  const { setAuth, logout, user } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    if (isFirebaseLoading) return;

    let cancelled = false;

    async function sync() {
      if (!firebaseUser) {
        if (user) logout();
        setIsSyncing(false);
        return;
      }

      try {
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (!cancelled) setAuth(profile, '', '');
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, isFirebaseLoading]);

  return { isSyncing: isFirebaseLoading || isSyncing };
}
