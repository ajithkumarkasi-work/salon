import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useState } from 'react';

export default function CustomerAppointmentDetailsPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState('');

  const { data: appt, isLoading } = useQuery({
    queryKey: ['customer-appointment-detail', appointmentId],
    queryFn: async () => (await api.get(`/appointments/${appointmentId}`)).data,
    enabled: !!appointmentId,
  });

  const cancel = useMutation({
    mutationFn: async () =>
      api.post(`/appointments/${appointmentId}/cancel`, {
        reason: cancelReason.trim() || 'Cancelled by customer',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-appointment-detail', appointmentId] });
      qc.invalidateQueries({ queryKey: ['customer-appointments-web'] });
      qc.invalidateQueries({ queryKey: ['customer-notifications'] });
    },
  });

  if (isLoading || !appt) {
    return <p className="text-sm text-muted-foreground">Loading appointment...</p>;
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(appt.status);

  return (
    <div className="space-y-5 animate-fade-in">
      <Button type="button" variant="ghost" className="w-fit px-0" onClick={() => navigate('/dashboard/appointments')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Appointments
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Booking Confirmation</h1>
        <p className="text-sm text-muted-foreground mt-1">Appointment summary and check-in details.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{appt.service?.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{appt.salon?.name}</p>
          <p className="text-muted-foreground">{format(new Date(appt.startTime), 'dd MMM yyyy, HH:mm')}</p>
          <p className="text-muted-foreground">Staff: {appt.staff?.user?.firstName} {appt.staff?.user?.lastName}</p>
          <p className="text-muted-foreground">Total: ₹{Number(appt.total).toFixed(2)}</p>
          <div className="pt-1"><Badge variant="outline">{String(appt.status).replace('_', ' ')}</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">QR / Check-in Code</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm font-mono text-primary">{appt.qrCode}</p>
          <p className="text-xs text-muted-foreground mt-1">Show this at salon for check-in.</p>
        </CardContent>
      </Card>

      {canCancel && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Cancel Booking</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason (optional)"
            />
            <Button variant="destructive" onClick={() => cancel.mutate()} loading={cancel.isPending}>
              Cancel Appointment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
