import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { where } from 'firebase/firestore';
import { appointmentsService, enrichAppointments } from '@/shared/lib/firebase';
import { useAuthStore } from '@/shared/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ContentLoader } from '@/shared/components/PageLoader';

const STATUS_GROUPS = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'] },
  { key: 'past', label: 'Past', statuses: ['COMPLETED'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED', 'NO_SHOW'] },
] as const;

export default function CustomerAppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_GROUPS)[number]['key']>('upcoming');
  const { data, isLoading } = useQuery({
    queryKey: ['customer-appointments-web', user?.id],
    queryFn: async () => {
      const all = await enrichAppointments(
        await appointmentsService.list(where('customerId', '==', user!.id)),
      );
      return STATUS_GROUPS.map((group) => ({
        key: group.key,
        label: group.label,
        data: all
          .filter((appt) => (group.statuses as readonly string[]).includes(appt.status))
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
      }));
    },
    enabled: !!user,
  });

  const activeGroup = useMemo(
    () => (data ?? []).find((group: any) => group.key === activeFilter),
    [activeFilter, data],
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Upcoming, completed, and cancelled appointments.</p>
        </div>
        <Button onClick={() => navigate('/dashboard/explore')}>Book</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_GROUPS.map((group) => (
          <Button
            key={group.key}
            size="sm"
            variant={activeFilter === group.key ? 'default' : 'outline'}
            onClick={() => setActiveFilter(group.key)}
            className="whitespace-nowrap"
          >
            {group.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <ContentLoader label="Loading bookings..." />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{activeGroup?.label ?? 'Appointments'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(activeGroup?.data ?? []).length ? (
              (activeGroup?.data ?? []).map((appt: any) => (
                <div key={appt.id} className="border rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div>
                    <p className="font-medium">{appt.salon?.name}</p>
                    <p className="text-sm text-muted-foreground">{appt.service?.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(appt.startTime), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                  <div className="sm:text-right space-y-2">
                    <Badge variant="outline">{String(appt.status).replace('_', ' ')}</Badge>
                    <div>
                      <Link className="text-sm text-primary font-medium" to={`/dashboard/appointments/${appt.id}`}>
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No {(activeGroup?.label ?? 'selected').toLowerCase()} bookings.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
