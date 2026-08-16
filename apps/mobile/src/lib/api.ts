import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { refreshToken: rt, setTokens, logout } = useAuthStore.getState();
      if (rt) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: rt });
          setTokens(data.tokens.accessToken, data.tokens.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
          return api(error.config);
        } catch {
          logout();
        }
      } else {
        logout();
      }
    }
    return Promise.reject(error);
  },
);
