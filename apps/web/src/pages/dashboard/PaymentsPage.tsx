import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { where } from 'firebase/firestore';
import { Receipt } from 'lucide-react';
import { appointmentsService, enrichAppointments } from '@/shared/lib/firebase';
import { useSalonStore } from '@/shared/stores/salon.store';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatCurrency } from '@/shared/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  SUCCEEDED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  FAILED: 'bg-red-100 text-red-800',
};

// Derives a payment-like record from appointment status, since there is no
// payment gateway backend anymore (Stripe requires a server-held secret key).
function toPaymentStatus(appointmentStatus: string): string {
  if (appointmentStatus === 'COMPLETED') return 'SUCCEEDED';
  if (appointmentStatus === 'CANCELLED' || appointmentStatus === 'NO_SHOW') return 'REFUNDED';
  return 'PENDING';
}

export default function PaymentsPage() {
  const { activeSalonId } = useSalonStore();
  const { data, isLoading } = useQuery({
    queryKey: ['payments', activeSalonId],
    queryFn: async () => {
      const appointments = await enrichAppointments(
        await appointmentsService.list(where('salonId', '==', activeSalonId)),
      );
      return appointments.map((appt) => ({
        id: appt.id,
        amount: appt.total,
        status: toPaymentStatus(appt.status),
        createdAt: appt.createdAt,
        appointment: appt,
      }));
    },
    enabled: !!activeSalonId,
  });

  const payments = data ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Badge variant="secondary">{payments.length} transactions</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="md:hidden">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-24 rounded-lg border bg-muted/20" />
                ))}
              </div>
            ) : payments.length > 0 ? (
              <div className="divide-y">
                {payments.map((payment: any) => (
                  <div key={payment.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{payment.appointment?.salon?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{payment.appointment?.service?.name}</p>
                      </div>
                      <Badge className={STATUS_COLORS[payment.status] ?? ''} variant="outline">
                        {payment.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p className="text-muted-foreground">Date</p>
                      <p className="text-right">{format(new Date(payment.createdAt), 'dd MMM yyyy')}</p>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="text-right font-semibold">{formatCurrency(Number(payment.amount))}</p>
                      <p className="text-muted-foreground">Refunded</p>
                      <p className="text-right text-muted-foreground">
                        {Number(payment.refundAmount) > 0 ? formatCurrency(Number(payment.refundAmount)) : '—'}
                      </p>
                      <p className="text-muted-foreground">Provider ID</p>
                      <p className="text-right truncate">{payment.providerPaymentId ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No payments found for this salon yet.</p>
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Appointment</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Refunded</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array(8).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                  : payments.length > 0
                    ? payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{payment.appointment?.salon?.name}</p>
                          <p className="text-xs text-muted-foreground">{payment.appointment?.service?.name}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(payment.createdAt), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {payment.providerPaymentId ?? '—'}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[payment.status] ?? ''} variant="outline">
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(payment.amount))}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {Number(payment.refundAmount) > 0 ? formatCurrency(Number(payment.refundAmount)) : '—'}
                        </td>
                      </tr>
                    ))
                    : (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          <div className="flex flex-col items-center justify-center">
                            <Receipt className="h-8 w-8 mb-2 opacity-40" />
                            No payments found for this salon yet.
                          </div>
                        </td>
                      </tr>
                    )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
