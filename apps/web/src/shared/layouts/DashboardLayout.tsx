import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/shared/components/Sidebar';
import { Header } from '@/shared/components/Header';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useMyStaffProfile } from '@/features/staff/hooks';
import { UserRole } from '@glowbook/shared-types';

export function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();
  const { activeSalonId, setActiveSalon } = useSalonStore();
  const { data: myStaffProfile } = useMyStaffProfile(user?.role === UserRole.STAFF);

  useEffect(() => {
    if (user?.role === UserRole.STAFF && !activeSalonId && myStaffProfile?.salonId) {
      setActiveSalon(myStaffProfile.salonId);
    }
  }, [user?.role, activeSalonId, myStaffProfile?.salonId, setActiveSalon]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
