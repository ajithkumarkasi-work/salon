import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Compass,
  Calendar,
  CalendarCheck,
  Scissors,
  Heart,
  Users,
  CreditCard,
  Tag,
  Star,
  Bell,
  LifeBuoy,
  BarChart3,
  Settings,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/shared/stores/auth.store';
import { UserRole } from '@glowbook/shared-types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials } from '@/shared/lib/utils';

const navItems = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Calendar', path: '/dashboard/calendar', icon: Calendar },
  { label: 'Appointments', path: '/dashboard/appointments', icon: CalendarCheck },
  { label: 'Services', path: '/dashboard/services', icon: Scissors },
  { label: 'Staff', path: '/dashboard/staff', icon: UserCheck },
  { label: 'Customers', path: '/dashboard/customers', icon: Users },
  { label: 'Payments', path: '/dashboard/payments', icon: CreditCard },
  { label: 'Offers', path: '/dashboard/offers', icon: Tag },
  { label: 'Reviews', path: '/dashboard/reviews', icon: Star },
  { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/dashboard/settings', icon: Settings },
];

const customerNavItems = [
  { label: 'Home', path: '/dashboard', icon: Home, end: true },
  { label: 'Explore', path: '/dashboard/explore', icon: Compass },
  { label: 'Appointments', path: '/dashboard/appointments', icon: CalendarCheck },
  { label: 'Favorites', path: '/dashboard/favorites', icon: Heart },
  { label: 'Offers', path: '/dashboard/customer-offers', icon: Tag },
  { label: 'Payment History', path: '/dashboard/payment-history', icon: CreditCard },
  { label: 'Reviews', path: '/dashboard/reviews', icon: Star },
  { label: 'Notifications', path: '/dashboard/notifications', icon: Bell },
  { label: 'Settings', path: '/dashboard/settings', icon: Settings },
  { label: 'Help & Support', path: '/dashboard/help', icon: LifeBuoy },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { user } = useAuthStore();
  const isBusinessRole = user?.role === UserRole.SALON_OWNER || user?.role === UserRole.ADMIN;
  const visibleNavItems = user?.role === UserRole.CUSTOMER ? customerNavItems : navItems.filter((item) => {
    if (['Overview', 'Staff', 'Customers', 'Payments', 'Offers', 'Analytics'].includes(item.label)) {
      return isBusinessRole;
    }
    return true;
  });

  const isActivePath = (path: string, routeActive: boolean) => {
    if (routeActive) return true;
    if (path === '/dashboard/explore') {
      return location.pathname.startsWith('/dashboard/salons/') || location.pathname.startsWith('/dashboard/book/');
    }
    return false;
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      {/* Logo */}
      <div className="sticky top-0 z-10 h-16 flex items-center border-b bg-card px-6">
        <span className="text-xl font-bold text-primary">GlowBook</span>
        <span className="ml-2 text-xs text-muted-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Business</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {visibleNavItems.map(({ label, path, icon: Icon, end }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActivePath(path, isActive)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User info */}
      {user && (
        <div className="sticky bottom-0 border-t bg-card p-4">
          <NavLink
            to="/dashboard/settings"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg p-2 -m-2 transition-colors hover:bg-accent"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </NavLink>
        </div>
      )}
    </aside>
  );
}
