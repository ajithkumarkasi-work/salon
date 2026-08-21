import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatCurrency, getInitials } from '@/shared/lib/utils';
import { UserRole } from '@glowbook/shared-types';

export default function CustomersPage() {
  const { activeSalonId } = useSalonStore();
  const { user } = useAuthStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', activeSalonId],
    queryFn: async () => {
      const { data } = await api.get('/appointments', {
        params: { salonId: activeSalonId, limit: 100, status: 'COMPLETED' },
      });
      // Aggregate customer stats from appointments
      const customerMap = new Map<string, any>();
      data.data.forEach((appt: any) => {
        const c = appt.customer;
        if (!c) return;
        const existing = customerMap.get(c.id) ?? {
          ...c, totalBookings: 0, totalSpent: 0, lastVisit: null, visits: [],
        };
        existing.totalBookings++;
        existing.totalSpent += Number(appt.total);
        existing.visits.push(appt);
        if (!existing.lastVisit || new Date(appt.startTime) > new Date(existing.lastVisit)) {
          existing.lastVisit = appt.startTime;
        }
        customerMap.set(c.id, existing);
      });
      return Array.from(customerMap.values())
        .map((customer: any) => ({
          ...customer,
          visits: [...(customer.visits ?? [])].sort(
            (a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
          ),
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);
    },
    enabled: !!activeSalonId,
  });

  const canOpenCustomerDrawer =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SALON_OWNER;

  const selectedCustomer = useMemo(
    () => (data ?? []).find((customer: any) => customer.id === selectedCustomerId) ?? null,
    [data, selectedCustomerId],
  );

  useEffect(() => {
    if (!selectedCustomerId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedCustomerId(null);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedCustomerId]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Badge variant="secondary">{data?.length ?? 0} customers</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="md:hidden">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-24 rounded-lg border bg-muted/20" />
                ))}
              </div>
            ) : (data?.length ?? 0) > 0 ? (
              <div className="divide-y">
                {data?.map((customer: any) => (
                  <div
                    key={customer.id}
                    className={canOpenCustomerDrawer ? 'space-y-3 p-4 cursor-pointer transition-colors hover:bg-muted/30' : 'space-y-3 p-4'}
                    onClick={() => canOpenCustomerDrawer && setSelectedCustomerId(customer.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {getInitials(customer.firstName, customer.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{customer.firstName} {customer.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone ?? '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Visits</p>
                        <p className="font-medium">{customer.totalBookings}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Spent</p>
                        <p className="font-semibold">{formatCurrency(customer.totalSpent)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last visit</p>
                        <p className="font-medium">{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('en-IN') : '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No customers found yet.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Visits</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Spent</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array(8).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                  : data?.map((customer: any) => (
                      <tr
                        key={customer.id}
                        className={canOpenCustomerDrawer ? 'border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors' : 'border-b last:border-b-0 hover:bg-muted/30 transition-colors'}
                        onClick={() => canOpenCustomerDrawer && setSelectedCustomerId(customer.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(customer.firstName, customer.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{customer.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">{customer.totalBookings}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(customer.totalSpent)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedCustomer && canOpenCustomerDrawer && (
        <>
          <button
            type="button"
            aria-label="Close customer details"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setSelectedCustomerId(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Customer Details</h2>
                <p className="text-xs text-muted-foreground">Visit history, staff, services and payments</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCustomerId(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(selectedCustomer.firstName, selectedCustomer.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    <p className="text-sm text-muted-foreground break-all">{selectedCustomer.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone ?? '—'}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Visits</p>
                    <p className="text-sm font-semibold">{selectedCustomer.totalBookings}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paid</p>
                    <p className="text-sm font-semibold">{formatCurrency(selectedCustomer.totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last visit</p>
                    <p className="text-sm font-semibold">{selectedCustomer.lastVisit ? new Date(selectedCustomer.lastVisit).toLocaleDateString('en-IN') : '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Visit History</h3>
                  <Badge variant="secondary">{selectedCustomer.visits?.length ?? 0} visits</Badge>
                </div>
                <div className="mt-3 space-y-3">
                  {(selectedCustomer.visits ?? []).map((visit: any, index: number) => (
                    <div key={visit.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Visit #{(selectedCustomer.visits?.length ?? 0) - index}</p>
                          <p className="mt-1 text-sm font-medium">{visit.service?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Staff: {visit.staff?.user?.firstName} {visit.staff?.user?.lastName}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{formatCurrency(Number(visit.total ?? 0))}</p>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Date: {new Date(visit.startTime).toLocaleDateString('en-IN')}</span>
                        <span className="text-right">Time: {new Date(visit.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>Status: {String(visit.status ?? 'COMPLETED').replace('_', ' ')}</span>
                        <span className="text-right">Duration: {visit.service?.duration ?? '—'} min</span>
                      </div>
                      {visit.notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {visit.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
