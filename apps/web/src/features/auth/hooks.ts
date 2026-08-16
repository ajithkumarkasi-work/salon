import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { useAuthStore } from '@/shared/stores/auth.store';
import { LoginDto, RegisterDto } from '@glowbook/validation';

export function useLogin() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: LoginDto) => {
      const { data } = await api.post('/auth/login', dto);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: RegisterDto) => {
      const { data } = await api.post('/auth/register', dto);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
    },
  });
}
