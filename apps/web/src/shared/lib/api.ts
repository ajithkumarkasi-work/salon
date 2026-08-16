import axios from 'axios';
import { useAuthStore } from '@/shared/stores/auth.store';
import { demoApiAdapter } from '@/shared/lib/demo-api';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  adapter: DEMO_MODE ? demoApiAdapter : undefined,
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — refresh token flow
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (reason: unknown) => void }> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = data.tokens.accessToken;
        setTokens(data.tokens.accessToken, data.tokens.refreshToken);

        failedQueue.forEach(({ resolve }) => resolve(newAccessToken));
        failedQueue = [];
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        failedQueue.forEach(({ reject }) => reject(error));
        failedQueue = [];
        logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
