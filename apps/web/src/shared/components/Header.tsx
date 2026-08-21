import { Bell, LogOut, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from './ui/button';
import { useAuthStore } from '@/shared/stores/auth.store';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials } from '@/shared/lib/utils';
import { api } from '@/shared/lib/api';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@glowbook/shared-types';
import { useState } from 'react';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['customer-notifications'],
    queryFn: async () => {
      return (await api.get('/notifications', { params: { limit: 50 } })).data?.data ?? [];
    },
    enabled: user?.role === UserRole.CUSTOMER,
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleLogout = async () => {
    setIsLogoutConfirmOpen(false);
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // logout regardless
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-[72px] border-b bg-card flex items-center justify-between px-3 sm:px-4 md:h-16 md:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:hidden"
          aria-label="Open menu"
          onClick={onMenuClick}
        >
          <Menu className="h-9 w-9" strokeWidth={2.75} />
        </Button>
        <h2 className="text-sm font-medium text-muted-foreground sm:text-base">
          Welcome back,{' '}
          <span className="text-foreground font-semibold">{user?.firstName}</span>
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
          onClick={() => navigate('/dashboard/notifications')}
        >
          <Bell className="h-4 w-4" />
          {user?.role === UserRole.CUSTOMER && unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        <div className="flex items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings')}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open profile settings"
            >
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
              </Avatar>
            </button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsLogoutConfirmOpen(true)} aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="logout-confirmation-title">
          <div className="w-full max-w-sm rounded-lg border bg-background shadow-lg">
            <div className="border-b px-5 py-4">
              <h2 id="logout-confirmation-title" className="text-base font-semibold">Log out?</h2>
              <p className="mt-1 text-sm text-muted-foreground">You will need to sign in again to access your account.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setIsLogoutConfirmOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleLogout}>Log out</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
