import { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { useCalendar } from '@/features/appointments/hooks';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { getStatusColor, getInitials, formatCurrency } from '@/shared/lib/utils';
import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/components/Skeleton';
import { UserRole } from '@glowbook/shared-types';

type ViewMode = 'day' | 'week';
type LayoutMode = 'grid' | 'vertical';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const { activeSalonId } = useSalonStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const nextIsMobile = 'matches' in event ? event.matches : mediaQuery.matches;
      setIsMobile(nextIsMobile);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const effectiveLayoutMode: LayoutMode = isMobile ? 'vertical' : layoutMode;

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const startDate = viewMode === 'week'
    ? format(weekStart, "yyyy-MM-dd'T'00:00:00")
    : format(currentDate, "yyyy-MM-dd'T'00:00:00");
  const endDate = viewMode === 'week'
    ? format(addDays(weekStart, 6), "yyyy-MM-dd'T'23:59:59")
    : format(currentDate, "yyyy-MM-dd'T'23:59:59");

  const { data: appointments, isLoading } = useCalendar(
    activeSalonId ?? '',
    startDate,
    endDate,
  );

  const visibleAppointments = useMemo(() => {
    const rows = appointments ?? [];
    if (user?.role !== UserRole.STAFF) return rows;
    return rows.filter((appt: any) => appt.staff?.user?.id === user.id);
  }, [appointments, user?.id, user?.role]);

  const staffList = useMemo(() => {
    if (!visibleAppointments.length) return [];
    const staffMap = new Map<string, any>();
    visibleAppointments.forEach((appt: any) => {
      if (appt.staff && !staffMap.has(appt.staff.id)) {
        staffMap.set(appt.staff.id, appt.staff);
      }
    });
    return Array.from(staffMap.values());
  }, [visibleAppointments]);

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, direction === 'prev' ? -1 : 1));
    }
  };

  const displayDays = viewMode === 'week' ? weekDays : [currentDate];

  const dayBuckets = useMemo(
    () =>
      displayDays.map((day) => {
        const appointmentsForDay = visibleAppointments
          .filter((appt: any) => isSameDay(new Date(appt.startTime), day))
          .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        return { day, appointments: appointmentsForDay };
      }),
    [displayDays, visibleAppointments],
  );

  return (
    <div className="space-y-4 max-[375px]:space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 max-[375px]:gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl max-[375px]:text-xl font-bold">Calendar</h1>
          <p className="text-muted-foreground text-sm max-[375px]:text-xs">
            {viewMode === 'week'
              ? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
              : format(currentDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 max-[375px]:gap-1.5 sm:w-auto sm:justify-end sm:gap-3">
          <div className="flex gap-1 border rounded-lg p-1 max-[375px]:p-0.5">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="max-[375px]:h-8 max-[375px]:px-2 max-[375px]:text-xs"
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="max-[375px]:h-8 max-[375px]:px-2 max-[375px]:text-xs"
            >
              Week
            </Button>
          </div>
          <div className="hidden sm:flex gap-1 border rounded-lg p-1">
            <Button
              variant={layoutMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayoutMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={layoutMode === 'vertical' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayoutMode('vertical')}
            >
              Vertical
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-1 max-[375px]:gap-0.5 sm:ml-0">
            <Button variant="outline" size="icon" className="max-[375px]:h-8 max-[375px]:w-8" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="max-[375px]:h-8 max-[375px]:px-2 max-[375px]:text-xs" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="max-[375px]:h-8 max-[375px]:w-8" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : staffList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No appointments in this period</p>
          </div>
        ) : effectiveLayoutMode === 'vertical' ? (
          <div className="p-3 max-[375px]:p-2 space-y-3 max-[375px]:space-y-2">
            {dayBuckets.map(({ day, appointments }) => (
              <div key={day.toISOString()} className="rounded-lg border overflow-hidden">
                <div
                  className={cn(
                    'px-3 py-2 max-[375px]:px-2 max-[375px]:py-1.5 border-b bg-muted/30 flex items-center justify-between',
                    isSameDay(day, new Date()) && 'bg-primary/10',
                  )}
                >
                  <p className="text-sm max-[375px]:text-xs font-semibold">{format(day, 'EEEE, MMM d')}</p>
                  <Badge variant="outline">{appointments.length}</Badge>
                </div>

                {!appointments.length ? (
                  <p className="px-3 py-4 max-[375px]:px-2 max-[375px]:py-3 text-sm max-[375px]:text-xs text-muted-foreground">No appointments for this day.</p>
                ) : (
                  <div className="divide-y">
                    {appointments.map((appt: any) => (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => setSelectedAppointment(appt)}
                        className="w-full text-left px-3 py-2 max-[375px]:px-2 max-[375px]:py-1.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm max-[375px]:text-xs font-medium truncate">
                              {format(new Date(appt.startTime), 'HH:mm')} - {appt.customer?.firstName} {appt.customer?.lastName}
                            </p>
                            <p className="text-xs max-[375px]:text-[11px] text-muted-foreground truncate">
                              {appt.service?.name} • {appt.staff?.user?.firstName} {appt.staff?.user?.lastName}
                            </p>
                          </div>
                          <Badge className={getStatusColor(appt.status)} variant="outline">
                            {String(appt.status).replace('_', ' ')}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-auto">
            <table
              className={cn(
                'w-full table-fixed',
                viewMode === 'week' ? 'min-w-[900px]' : 'min-w-[560px]',
              )}
            >
              <colgroup>
                {viewMode === 'day' ? (
                  <>
                    <col className="w-44" />
                    <col />
                  </>
                ) : (
                  <>
                    <col className="w-28" />
                    {displayDays.map((day) => (
                      <col key={`col-${day.toISOString()}`} className="w-32" />
                    ))}
                  </>
                )}
              </colgroup>
              {/* Day headers */}
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Staff</th>
                  {displayDays.map((day) => (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        'p-3 text-center text-xs font-medium',
                        isSameDay(day, new Date()) && 'text-primary',
                      )}
                    >
                      <div>{format(day, 'EEE')}</div>
                      <div className={cn(
                        'text-lg font-bold',
                        isSameDay(day, new Date()) && 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto text-sm',
                      )}>
                        {format(day, 'd')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id} className="border-b last:border-b-0">
                    {/* Staff name */}
                    <td className="p-3 border-r">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(staff.user?.firstName ?? '', staff.user?.lastName ?? '')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">
                          {staff.user?.firstName}
                        </span>
                      </div>
                    </td>

                    {/* Day cells */}
                    {displayDays.map((day) => {
                      const dayAppts = visibleAppointments.filter((a: any) =>
                        a.staff?.id === staff.id && isSameDay(new Date(a.startTime), day)
                      );

                      return (
                        <td
                          key={day.toISOString()}
                          className={cn(
                            'p-2 align-top h-24 border-r last:border-r-0',
                            isSameDay(day, new Date()) && 'bg-primary/5',
                          )}
                        >
                          <div className="space-y-1 h-20 overflow-y-auto overflow-x-hidden">
                            {dayAppts.map((appt: any) => (
                              <button
                                key={appt.id}
                                onClick={() => setSelectedAppointment(appt)}
                                className={cn(
                                  'w-full text-left p-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80',
                                  getAppointmentColor(appt.status),
                                )}
                              >
                                <div className="truncate">
                                  {format(new Date(appt.startTime), 'HH:mm')} {appt.customer?.firstName}
                                </div>
                                <div className="truncate text-xs opacity-80">{appt.service?.name}</div>
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appointment detail sidebar */}
      {selectedAppointment && (
        <AppointmentDetail
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </div>
  );
}

function getAppointmentColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-900',
    CONFIRMED: 'bg-blue-100 text-blue-900',
    ARRIVED: 'bg-purple-100 text-purple-900',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-900',
    COMPLETED: 'bg-green-100 text-green-900',
    CANCELLED: 'bg-red-100 text-red-900',
    NO_SHOW: 'bg-gray-100 text-gray-900',
  };
  return map[status] ?? 'bg-gray-100 text-gray-900';
}

function AppointmentDetail({ appointment, onClose }: { appointment: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-end" onClick={onClose}>
      <div
        className="bg-card border-l w-96 h-full p-6 shadow-xl overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold">Appointment Details</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {getInitials(appointment.customer?.firstName ?? '', appointment.customer?.lastName ?? '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{appointment.customer?.firstName} {appointment.customer?.lastName}</p>
              <p className="text-sm text-muted-foreground">{appointment.customer?.email}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <InfoRow label="Service" value={appointment.service?.name} />
            <InfoRow label="Staff" value={`${appointment.staff?.user?.firstName} ${appointment.staff?.user?.lastName}`} />
            <InfoRow label="Date" value={format(new Date(appointment.startTime), 'dd MMM yyyy')} />
            <InfoRow label="Time" value={`${format(new Date(appointment.startTime), 'HH:mm')} – ${format(new Date(appointment.endTime), 'HH:mm')}`} />
            <InfoRow label="Duration" value={`${appointment.service?.duration} minutes`} />
            <InfoRow label="Price" value={formatCurrency(Number(appointment.total))} />
          </div>

          <Badge className={`w-fit ${getStatusColor(appointment.status)}`} variant="outline">
            {appointment.status}
          </Badge>

          {appointment.notes && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
