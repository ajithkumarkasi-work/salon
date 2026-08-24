import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { where } from 'firebase/firestore';
import { Receipt } from 'lucide-react';
import { appointmentsService, enrichAppointments } from '@/shared/lib/firebase';
import { useAuthStore } from '@/shared/stores/auth.store';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { ContentLoader } from '@/shared/components/PageLoader';

const STATUS_COLORS: Record<string, string> = {
  SUCCEEDED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  FAILED: 'bg-red-100 text-red-800',
};

function toPaymentStatus(appointmentStatus: string): string {
  if (appointmentStatus === 'COMPLETED') return 'SUCCEEDED';
  if (appointmentStatus === 'CANCELLED' || appointmentStatus === 'NO_SHOW') return 'REFUNDED';
  return 'PENDING';
}

export default function CustomerPaymentHistoryPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['customer-payment-history', user?.id],
    queryFn: async () => {
      const appointments = await enrichAppointments(
        await appointmentsService.list(where('customerId', '==', user!.id)),
      );
      return appointments.map((appt) => ({
        id: appt.id,
        amount: appt.total,
        status: toPaymentStatus(appt.status),
        createdAt: appt.createdAt,
        appointment: appt,
      }));
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Payment History</h1>
        <p className="text-sm text-muted-foreground mt-1">Checkout and refund history for your bookings.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <ContentLoader label="Loading payment history..." /> : <>
          {/* Mobile cards */}
          <div className="md:hidden p-3 space-y-3">
            {(data ?? []).map((payment: any) => (
              <div key={payment.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{payment.appointment?.salon?.name}</p>
                    <p className="text-xs text-muted-foreground">{payment.appointment?.service?.name}</p>
                  </div>
                  <Badge className={STATUS_COLORS[payment.status] ?? ''} variant="outline">{payment.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(payment.createdAt), 'dd MMM yyyy')}</span>
                  <span className="text-sm font-semibold text-foreground">₹{Number(payment.amount).toFixed(2)}</span>
                </div>
              </div>
            ))}

            {!(data ?? []).length && (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No payments yet.</p>
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Salon</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((payment: any) => (
                      <tr key={payment.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{payment.appointment?.salon?.name}</p>
                          <p className="text-xs text-muted-foreground">{payment.appointment?.service?.name}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(payment.createdAt), 'dd MMM yyyy')}</td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[payment.status] ?? ''} variant="outline">{payment.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">₹{Number(payment.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                {!(data ?? []).length && (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      <div className="flex flex-col items-center justify-center">
                        <Receipt className="h-8 w-8 mb-2 opacity-40" />
                        No payments yet.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>}
        </CardContent>
      </Card>
    </div>
  );
}
