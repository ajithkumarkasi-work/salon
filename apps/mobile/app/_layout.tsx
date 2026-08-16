import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (count, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return count < 2;
      },
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '700', color: '#111827' },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(business-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Sign In', headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ title: 'Create Account', headerShown: false }} />
        <Stack.Screen name="business/services" options={{ title: 'Services' }} />
        <Stack.Screen name="business/staff" options={{ title: 'Staff' }} />
        <Stack.Screen name="business/offers" options={{ title: 'Offers & Coupons' }} />
        <Stack.Screen name="business/payments" options={{ title: 'Payments' }} />
        <Stack.Screen name="business/analytics" options={{ title: 'Analytics' }} />
        <Stack.Screen name="business/reviews" options={{ title: 'Reviews' }} />
        <Stack.Screen name="salon/[id]" options={{ title: 'Salon', headerTransparent: true, headerTitle: '' }} />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Appointment Details' }} />
        <Stack.Screen name="booking/[salonId]" options={{ title: 'Book Appointment' }} />
        <Stack.Screen name="offers" options={{ title: 'Offers & Coupons' }} />
        <Stack.Screen name="payment-history" options={{ title: 'Payment History' }} />
        <Stack.Screen name="reviews" options={{ title: 'Reviews & Ratings' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="help-support" options={{ title: 'Help & Support' }} />
      </Stack>
    </QueryClientProvider>
  );
}
