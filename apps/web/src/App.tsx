import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuthStore } from '@/shared/stores/auth.store';
import { UserRole } from '@glowbook/shared-types';
import { DashboardLayout } from '@/shared/layouts/DashboardLayout';
import { AuthLayout } from '@/shared/layouts/AuthLayout';
import { PageLoader } from '@/shared/components/PageLoader';
import { Toaster } from '@/shared/components/ui/toaster';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const OverviewPage = lazy(() => import('@/pages/dashboard/OverviewPage'));
const CalendarPage = lazy(() => import('@/pages/dashboard/CalendarPage'));
const AppointmentsPage = lazy(() => import('@/pages/dashboard/AppointmentsPage'));
const ServicesPage = lazy(() => import('@/pages/dashboard/ServicesPage'));
const StaffPage = lazy(() => import('@/pages/dashboard/StaffPage'));
const CustomersPage = lazy(() => import('@/pages/dashboard/CustomersPage'));
const PaymentsPage = lazy(() => import('@/pages/dashboard/PaymentsPage'));
const ReviewsPage = lazy(() => import('@/pages/dashboard/ReviewsPage'));
const AnalyticsPage = lazy(() => import('@/pages/dashboard/AnalyticsPage'));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'));
const OffersPage = lazy(() => import('@/pages/dashboard/OffersPage'));
const CustomerHomePage = lazy(() => import('@/pages/dashboard/CustomerHomePage'));
const CustomerExplorePage = lazy(() => import('@/pages/dashboard/CustomerExplorePage'));
const CustomerFavoritesPage = lazy(() => import('@/pages/dashboard/CustomerFavoritesPage'));
const CustomerOffersPage = lazy(() => import('@/pages/dashboard/CustomerOffersPage'));
const CustomerNotificationsPage = lazy(() => import('@/pages/dashboard/CustomerNotificationsPage'));
const CustomerHelpPage = lazy(() => import('@/pages/dashboard/CustomerHelpPage'));
const CustomerAppointmentsPage = lazy(() => import('@/pages/dashboard/CustomerAppointmentsPage'));
const CustomerSalonDetailsPage = lazy(() => import('@/pages/dashboard/CustomerSalonDetailsPage'));
const CustomerBookingPage = lazy(() => import('@/pages/dashboard/CustomerBookingPage'));
const CustomerAppointmentDetailsPage = lazy(() => import('@/pages/dashboard/CustomerAppointmentDetailsPage'));
const CustomerPaymentHistoryPage = lazy(() => import('@/pages/dashboard/CustomerPaymentHistoryPage'));
const CustomerReviewsPage = lazy(() => import('@/pages/dashboard/CustomerReviewsPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard/appointments" replace />;
  return <>{children}</>;
}

function DashboardHomeRoute() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  const isBusinessRole = user.role === UserRole.SALON_OWNER || user.role === UserRole.ADMIN;
  if (isBusinessRole) return <OverviewPage />;
  if (user.role === UserRole.CUSTOMER) return <CustomerHomePage />;
  return <Navigate to="/dashboard/appointments" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RoleAwareRoute({
  customer,
  business,
}: {
  customer: React.ReactNode;
  business: React.ReactNode;
}) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === UserRole.CUSTOMER ? <>{customer}</> : <>{business}</>;
}

export default function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
          </Route>

          {/* Dashboard routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/dashboard" element={<DashboardHomeRoute />} />
            <Route path="/dashboard/calendar" element={<CalendarPage />} />
            <Route
              path="/dashboard/appointments"
              element={
                <RoleAwareRoute
                  customer={<CustomerAppointmentsPage />}
                  business={<AppointmentsPage />}
                />
              }
            />
            <Route path="/dashboard/appointments/:appointmentId" element={<CustomerAppointmentDetailsPage />} />
            <Route path="/dashboard/explore" element={<CustomerExplorePage />} />
            <Route path="/dashboard/salons/:salonId" element={<CustomerSalonDetailsPage />} />
            <Route path="/dashboard/book/:salonId" element={<CustomerBookingPage />} />
            <Route path="/dashboard/favorites" element={<CustomerFavoritesPage />} />
            <Route path="/dashboard/customer-offers" element={<CustomerOffersPage />} />
            <Route path="/dashboard/notifications" element={<CustomerNotificationsPage />} />
            <Route path="/dashboard/help" element={<CustomerHelpPage />} />
            <Route path="/dashboard/payment-history" element={<CustomerPaymentHistoryPage />} />
            <Route path="/dashboard/services" element={<ServicesPage />} />
            <Route
              path="/dashboard/staff"
              element={
                <RoleRoute roles={[UserRole.SALON_OWNER, UserRole.ADMIN]}>
                  <StaffPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/reviews"
              element={
                <RoleAwareRoute
                  customer={<CustomerReviewsPage />}
                  business={<ReviewsPage />}
                />
              }
            />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route
              path="/dashboard/customers"
              element={
                <RoleRoute roles={[UserRole.SALON_OWNER, UserRole.ADMIN]}>
                  <CustomersPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/payments"
              element={
                <RoleRoute roles={[UserRole.SALON_OWNER, UserRole.ADMIN]}>
                  <PaymentsPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/offers"
              element={
                <RoleRoute roles={[UserRole.SALON_OWNER, UserRole.ADMIN]}>
                  <OffersPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/analytics"
              element={
                <RoleRoute roles={[UserRole.SALON_OWNER, UserRole.ADMIN]}>
                  <AnalyticsPage />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}
