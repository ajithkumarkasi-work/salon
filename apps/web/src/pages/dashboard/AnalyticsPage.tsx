import { useState } from 'react';
import { subDays, format } from 'date-fns';
import { TrendingUp, DollarSign, Users, Star, BarChart2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { useAnalyticsSummary, useRevenueChart, usePopularServices, useStaffPerformance } from '@/features/analytics/hooks';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { formatCurrency, getInitials } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/components/Skeleton';
import { UserRole } from '@glowbook/shared-types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

type Range = '7d' | '30d' | '90d';

function getRange(range: Range) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return {
    startDate: format(subDays(new Date(), days), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  };
}

const COLORS = ['hsl(346 77% 49%)', 'hsl(346 77% 65%)', 'hsl(346 77% 75%)', 'hsl(346 77% 85%)', 'hsl(346 77% 90%)'];

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');
  const { activeSalonId } = useSalonStore();
  const { user } = useAuthStore();
  const dateRange = getRange(range);
  const isOwner = user?.role === UserRole.SALON_OWNER;

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(activeSalonId ?? '', dateRange);
  const { data: revenue } = useRevenueChart(activeSalonId ?? '', dateRange, range === '90d' ? 'week' : 'day');
  const { data: popularServices } = usePopularServices(activeSalonId ?? '', dateRange);
  const { data: staffPerf } = useStaffPerformance(activeSalonId ?? '', dateRange);

  const kpis = [
    ...(isOwner ? [{ label: 'Total Revenue', value: formatCurrency(summary?.totalRevenue ?? 0), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' }] : []),
    { label: 'Total Bookings', value: summary?.totalBookings ?? 0, icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Cancellation Rate', value: summary ? `${summary.cancellationRate.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    ...(isOwner ? [{ label: 'Avg Booking Value', value: formatCurrency(summary?.averageBookingValue ?? 0), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' }] : []),
    { label: 'New Customers', value: summary?.newCustomers ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Average Rating', value: summary?.averageRating ? `★ ${summary.averageRating.toFixed(1)}` : '—', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as Range[]).map((r) => (
            <Button key={r} variant={range === r ? 'default' : 'outline'} size="sm" onClick={() => setRange(r)}>
              {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) =>
          summaryLoading ? (
            <div key={kpi.label} className="rounded-xl border p-6 space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          ) : (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Revenue chart */}
      {isOwner && (
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenue ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(346 77% 49%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(346 77% 49%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), range === '7d' ? 'EEE' : 'MMM d')} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} labelFormatter={(l) => format(new Date(l), 'dd MMM yyyy')} contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(346 77% 49%)" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Services + Staff charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Popular services */}
        <Card>
          <CardHeader><CardTitle className="text-base">Popular Services</CardTitle></CardHeader>
          <CardContent>
            {popularServices ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={popularServices.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="serviceName" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip formatter={(v: number) => [v, 'Bookings']} contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                  <Bar dataKey="bookings" fill="hsl(346 77% 49%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-60" />
            )}
          </CardContent>
        </Card>

        {/* Staff performance */}
        <Card>
          <CardHeader><CardTitle className="text-base">Staff Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffPerf?.map((s: any) => (
                <div key={s.staffId} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{s.staffName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{s.staffName}</p>
                      {isOwner && <p className="text-sm font-semibold">{formatCurrency(s.revenue)}</p>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary rounded-full h-1.5"
                          style={{ width: `${Math.min((s.bookings / Math.max(...(staffPerf?.map((x: any) => x.bookings) ?? [1]))) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{s.bookings} bookings</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs font-medium">{s.rating.toFixed(1)}</span>
                  </div>
                </div>
              )) ?? Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1"><Skeleton className="h-3" /><Skeleton className="h-2 w-3/4" /></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
