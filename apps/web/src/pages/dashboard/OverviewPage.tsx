import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Users, CalendarCheck, DollarSign, Star, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { useAnalyticsSummary, useRevenueChart, usePopularServices } from '@/features/analytics/hooks';
import { useAppointments } from '@/features/appointments/hooks';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useOwnerSalons, useCreateSalon, useSalonCategories } from '@/features/salons/hooks';
import { Input } from '@/shared/components/ui/input';
import { CustomSelect } from '@/shared/components/ui/custom-select';
import { useToast } from '@/shared/hooks/use-toast';
import { formatCurrency, formatTime, getStatusColor, getInitials } from '@/shared/lib/utils';
import { Skeleton, StatCardSkeleton } from '@/shared/components/Skeleton';
import { UserRole } from '@glowbook/shared-types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type DateRange = '7d' | '30d' | '90d';

const DATE_RANGES: Record<DateRange, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
};

const STATUS_TICK_SHORT: Record<string, string> = {
  PENDING: 'Pend',
  CONFIRMED: 'Conf',
  ARRIVED: 'Arr',
  'IN PROGRESS': 'Prog',
  COMPLETED: 'Done',
  CANCELLED: 'Canc',
  'NO SHOW': 'NoSh',
};

function getRange(range: DateRange) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return {
    startDate: format(subDays(new Date(), days), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  };
}

export default function OverviewPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const { activeSalonId } = useSalonStore();
  const { user } = useAuthStore();
  const { data: salons, isLoading: salonsLoading } = useOwnerSalons();
  const range = getRange(dateRange);
  const isOwner = user?.role === UserRole.SALON_OWNER;
  const isAdmin = user?.role === UserRole.ADMIN;

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(activeSalonId ?? '', range);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueChart(activeSalonId ?? '', range);
  const { data: popularServices } = usePopularServices(activeSalonId ?? '', range);
  const { data: todayAppointments } = useAppointments({
    salonId: activeSalonId,
    startDate: format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
    endDate: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
    limit: 10,
  });
  const { data: recentAppointments } = useAppointments({
    salonId: activeSalonId,
    startDate: format(startOfDay(subDays(new Date(), 6)), "yyyy-MM-dd'T'HH:mm:ss"),
    endDate: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
    limit: 500,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 420px)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const nextIsNarrowMobile = 'matches' in event ? event.matches : mediaQuery.matches;
      setIsNarrowMobile(nextIsNarrowMobile);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const stats = [
    ...(isOwner
      ? [{
          label: 'Total Revenue',
          value: formatCurrency(summary?.totalRevenue ?? 0),
          icon: DollarSign,
          trend: '+12.5%',
          up: true,
          color: 'text-green-600',
          bg: 'bg-green-50',
        }]
      : []),
    {
      label: 'Total Bookings',
      value: summary?.totalBookings ?? 0,
      icon: CalendarCheck,
      trend: '+8.2%',
      up: true,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'New Customers',
      value: summary?.newCustomers ?? 0,
      icon: Users,
      trend: '+5.1%',
      up: true,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Avg Rating',
      value: summary?.averageRating ? summary.averageRating.toFixed(1) : '—',
      icon: Star,
      trend: '+0.2',
      up: true,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  const todayStatusMix = useMemo(() => {
    const rows = todayAppointments?.data ?? [];
    const buckets: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      ARRIVED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };

    rows.forEach((item: any) => {
      const key = String(item.status ?? '').toUpperCase();
      if (Object.prototype.hasOwnProperty.call(buckets, key)) {
        buckets[key] += 1;
      }
    });

    return Object.entries(buckets).map(([status, count]) => ({
      status: status.replace('_', ' '),
      count,
    }));
  }, [todayAppointments?.data]);

  const sevenDayBookingsTrend = useMemo(() => {
    const appointments = recentAppointments?.data ?? [];
    const byDay = new Map<string, number>();

    for (let i = 6; i >= 0; i -= 1) {
      const day = subDays(new Date(), i);
      byDay.set(format(day, 'yyyy-MM-dd'), 0);
    }

    appointments.forEach((item: any) => {
      const key = format(new Date(item.startTime), 'yyyy-MM-dd');
      if (byDay.has(key)) {
        byDay.set(key, (byDay.get(key) ?? 0) + 1);
      }
    });

    return Array.from(byDay.entries()).map(([date, count]) => ({
      date,
      label: format(new Date(date), 'dd MMM'),
      count,
    }));
  }, [recentAppointments?.data]);

  if (salonsLoading) return <div className="grid grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)}</div>;
  if (!activeSalonId) return <EmptyState />;

  const hasSevenDayTrendData = sevenDayBookingsTrend.some((point) => point.count > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {salons?.find((s: any) => s.id === activeSalonId)?.name ?? 'Your Salon'} — Business at a glance
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
          {(Object.keys(DATE_RANGES) as DateRange[]).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setDateRange(range)}
            >
              {DATE_RANGES[range]}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading
          ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.up ? (
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={`text-xs ${stat.up ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend} vs last period
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Appointment Status Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={todayStatusMix} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={isNarrowMobile ? 1 : 0}
                  minTickGap={isNarrowMobile ? 18 : 8}
                  tickFormatter={(value: string) => (isNarrowMobile ? STATUS_TICK_SHORT[value] ?? value : value)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip formatter={(v: number) => [v, 'Appointments']} contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                <Bar dataKey="count" fill="hsl(346 77% 49%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Day Bookings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sevenDayBookingsTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={isNarrowMobile ? 1 : 0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip formatter={(v: number) => [v, 'Bookings']} contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(221 83% 53%)" strokeWidth={2} fill="url(#colorBookings)" />
              </AreaChart>
            </ResponsiveContainer>
            {!hasSevenDayTrendData && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                No bookings found in the last 7 days for the selected salon.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className={`grid grid-cols-1 gap-4 ${isOwner ? 'lg:grid-cols-3' : ''}`}>
        {/* Revenue chart */}
        {isOwner && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={revenueData ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(346 77% 49%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(346 77% 49%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => format(new Date(v), 'dd MMM')}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={isNarrowMobile ? 1 : 0}
                    />
                    <YAxis
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                      labelFormatter={(l) => format(new Date(l), 'dd MMM yyyy')}
                      contentStyle={{ borderRadius: '0.5rem', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(346 77% 49%)"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Popular services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Popular Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularServices?.slice(0, 6).map((service: any, i: number) => (
                <div key={service.serviceId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{service.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{service.bookings} bookings</p>
                  </div>
                  {isOwner && <span className="text-sm font-semibold text-right">{formatCurrency(service.revenue)}</span>}
                </div>
              )) ?? Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's appointments */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Today's Appointments
            </CardTitle>
            <Badge variant="secondary" className="w-fit">{todayAppointments?.meta?.total ?? 0} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!todayAppointments?.data?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.data.map((appt: any) => (
                <div key={appt.id} className="rounded-lg border p-3 transition-colors hover:bg-accent/40">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={appt.customer?.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {getInitials(appt.customer?.firstName ?? '', appt.customer?.lastName ?? '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {appt.customer?.firstName} {appt.customer?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">{appt.service?.name} • {appt.staff?.user?.firstName} {appt.staff?.user?.lastName}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <Badge className={`${getStatusColor(appt.status)}`} variant="outline">
                      {appt.status}
                    </Badge>
                    <span className="rounded-md bg-muted px-2 py-1 font-medium">{formatTime(appt.startTime)}</span>
                    <span className="text-muted-foreground">{appt.service?.duration}min</span>
                    {isOwner && <span className="ml-auto text-sm font-semibold">{formatCurrency(Number(appt.total))}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">No salon found</h2>
      <p className="text-muted-foreground mb-6">Create a salon or select one to load overview data.</p>
      <Button onClick={() => setIsModalOpen(true)}>Create your first salon</Button>
      {isModalOpen && <CreateSalonModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

function CreateSalonModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { setActiveSalon } = useSalonStore();
  const { data: categories } = useSalonCategories();
  const createSalon = useCreateSalon();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceRange, setPriceRange] = useState('2');

  const categoryOptions = (categories ?? []).map((c: any) => ({ value: c.id, label: c.name }));

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !address.trim() || !city.trim() || !state.trim() || !zipCode.trim() || !categoryId) {
      toast({ variant: 'destructive', title: 'Missing details', description: 'Please fill in all fields.' });
      return;
    }

    try {
      const salon = await createSalon.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        categoryId,
        priceRange: Number(priceRange),
      });
      setActiveSalon(salon.id);
      toast({ title: 'Salon created', variant: 'success' as any });
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create salon',
        description: error?.response?.data?.message ?? 'Please try again.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create your salon</h2>

          <Input placeholder="Salon name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Phone (e.g. +919876543210)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <Input placeholder="Zip code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
          <CustomSelect
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions}
            placeholder="Select category"
          />
          <CustomSelect
            value={priceRange}
            onChange={setPriceRange}
            options={[
              { value: '1', label: '$ Budget' },
              { value: '2', label: '$$ Moderate' },
              { value: '3', label: '$$$ Premium' },
              { value: '4', label: '$$$$ Luxury' },
            ]}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={createSalon.isPending}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createSalon.isPending}>
              {createSalon.isPending ? 'Creating…' : 'Create salon'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
