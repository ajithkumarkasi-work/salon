import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  fetchUserProfile,
  loginWithEmail,
  logout as firebaseLogout,
  registerWithEmail,
  useFirebaseAuthUser,
} from '@/shared/lib/firebase';
import { useAuthStore } from '@/shared/stores/auth.store';
import { LoginDto, RegisterDto } from '@glowbook/validation';

export function useLogin() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: LoginDto) => loginWithEmail(dto),
    onSuccess: (user) => {
      setAuth(user, '', '');
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: RegisterDto) => registerWithEmail(dto),
    onSuccess: (user) => {
      setAuth(user, '', '');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  return useMutation({
    mutationFn: async () => {
      await firebaseLogout();
    },
    onSuccess: () => logout(),
  });
}

/**
 * Keeps the zustand auth store in sync with Firebase Auth's session across
 * reloads, so a signed-in user stays signed in without re-entering credentials.
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
