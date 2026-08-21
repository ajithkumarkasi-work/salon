import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { CustomSelect } from '@/shared/components/ui/custom-select';
import { useAppointment, useAppointments, useCreateAppointment, useUpdateAppointmentStatuses } from '@/features/appointments/hooks';
import { useServices } from '@/features/services/hooks';
import { useStaff } from '@/features/staff/hooks';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { formatCurrency, getStatusColor, getInitials } from '@/shared/lib/utils';
import { Skeleton, TableRowSkeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/shared/hooks/use-toast';
import { AppointmentStatus, UserRole } from '@glowbook/shared-types';
import { CreateAppointmentDto } from '@glowbook/validation';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.ARRIVED,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.ARRIVED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.ARRIVED]: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

const formatStatusLabel = (status: string) =>
  status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function AppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [pendingStatusUpdates, setPendingStatusUpdates] = useState<Record<string, AppointmentStatus>>({});
  const pendingStatusUpdatesRef = useRef<Record<string, AppointmentStatus>>({});
  const saveStatusUpdatesRef = useRef<() => void>(() => undefined);
  const { activeSalonId } = useSalonStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { data: services } = useServices(activeSalonId ?? '');
  const { data: staff } = useStaff(activeSalonId ?? '');

  const { data, isLoading } = useAppointments({
    salonId: activeSalonId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: searchTerm.trim() || undefined,
    page,
    limit: 20,
  });

  const { data: pendingData } = useAppointments({
    salonId: activeSalonId,
    status: AppointmentStatus.PENDING,
    page: 1,
    limit: 1,
  });
  const { data: confirmedData } = useAppointments({
    salonId: activeSalonId,
    status: AppointmentStatus.CONFIRMED,
    page: 1,
    limit: 1,
  });
  const { data: arrivedData } = useAppointments({
    salonId: activeSalonId,
    status: AppointmentStatus.ARRIVED,
    page: 1,
    limit: 1,
  });
  const { data: inProgressData } = useAppointments({
    salonId: activeSalonId,
    status: AppointmentStatus.IN_PROGRESS,
    page: 1,
    limit: 1,
  });

  const updateStatus = useUpdateAppointmentStatuses();
  const updateStatusMutationRef = useRef(updateStatus.mutateAsync);
  const createAppointment = useCreateAppointment();
  const { data: appointmentDetail, isLoading: appointmentDetailLoading } = useAppointment(selectedAppointmentId ?? '');
  const canAssistBooking = user?.role === UserRole.ADMIN;
  const canManageAppointmentStatus = [UserRole.STAFF, UserRole.SALON_OWNER, UserRole.ADMIN].includes(user?.role as UserRole);
  const canOverrideTransitions = user?.role === UserRole.SALON_OWNER || user?.role === UserRole.ADMIN;
  const canOpenAppointmentDrawer = user?.role === UserRole.ADMIN;

  const actionableCount =
    (pendingData?.meta?.total ?? 0) +
    (confirmedData?.meta?.total ?? 0) +
    (arrivedData?.meta?.total ?? 0) +
    (inProgressData?.meta?.total ?? 0);

  const availableStaff = useMemo(() => {
    if (!serviceId) return staff ?? [];
    return (staff ?? []).filter((member: any) => (member.services ?? []).some((s: any) => s.serviceId === serviceId));
  }, [staff, serviceId]);

  const appointmentStatus = (appt: any): AppointmentStatus =>
    pendingStatusUpdates[appt.id] ?? appt.status;

  const handleChangeStatus = (appt: any, nextStatus: AppointmentStatus) => {
    const updates = { ...pendingStatusUpdatesRef.current, [appt.id]: nextStatus };
    pendingStatusUpdatesRef.current = updates;
    setPendingStatusUpdates(updates);
  };

  useEffect(() => {
    updateStatusMutationRef.current = updateStatus.mutateAsync;
  });

  const saveStatusUpdates = () => {
    const updates = pendingStatusUpdatesRef.current;
    const entries = Object.entries(updates);
    if (!entries.length || updateStatus.isPending) return;

    pendingStatusUpdatesRef.current = {};
    setPendingStatusUpdates({});

    void updateStatusMutationRef.current({
      updates: entries.map(([id, status]) => ({ id, status })),
    }).then(() => {
      toast({
        title: 'Appointment updates saved',
        description: `${entries.length} status ${entries.length === 1 ? 'change' : 'changes'} saved.`,
        variant: 'success' as any,
      });
    }).catch(() => {
      toast({
        variant: 'destructive',
        title: 'Status updates failed',
        description: 'Your unsaved changes were not applied. Please try again.',
      });
    });
  };

  saveStatusUpdatesRef.current = saveStatusUpdates;

  useEffect(() => {
    const flushStatusUpdates = () => saveStatusUpdatesRef.current();

    window.addEventListener('pagehide', flushStatusUpdates);
    return () => {
      window.removeEventListener('pagehide', flushStatusUpdates);
      flushStatusUpdates();
    };
  }, []);

  useEffect(() => {
    if (!isBookingModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !createAppointment.isPending) {
        setIsBookingModalOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isBookingModalOpen, createAppointment.isPending]);

  useEffect(() => {
    if (!selectedAppointmentId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedAppointmentId(null);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedAppointmentId]);

  const handleCreate = async () => {
    if (!activeSalonId) {
      toast({ variant: 'destructive', title: 'No salon selected', description: 'Select a salon before creating bookings.' });
      return;
    }
    if (!serviceId || !staffId || !startTime) {
      toast({ variant: 'destructive', title: 'Missing details', description: 'Select service, staff and time.' });
      return;
    }
    if (canAssistBooking && !customerEmail.trim()) {
      toast({ variant: 'destructive', title: 'Customer email required', description: 'Enter customer email for assisted booking.' });
      return;
    }

    const payload: CreateAppointmentDto = {
      salonId: activeSalonId,
      serviceId,
      staffId,
      startTime: new Date(startTime).toISOString(),
      customerEmail: canAssistBooking ? customerEmail.trim().toLowerCase() : undefined,
      customerFirstName: canAssistBooking ? customerFirstName.trim() || undefined : undefined,
      customerLastName: canAssistBooking ? customerLastName.trim() || undefined : undefined,
      customerPhone: canAssistBooking ? customerPhone.trim() || undefined : undefined,
      manualReason: canAssistBooking ? manualReason.trim() || undefined : undefined,
      couponCode: couponCode.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await createAppointment.mutateAsync(payload);
      toast({ title: 'Appointment created', description: 'Booking was created successfully.', variant: 'success' as any });
      setIsBookingModalOpen(false);
      setCustomerEmail('');
      setCustomerFirstName('');
      setCustomerLastName('');
      setCustomerPhone('');
      setServiceId('');
      setStaffId('');
      setStartTime('');
      setCouponCode('');
      setNotes('');
      setManualReason('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create appointment',
        description: error?.response?.data?.message ?? 'Please try again.',
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <div className="flex items-center gap-2">
          {Object.keys(pendingStatusUpdates).length > 0 && (
            <>
              <Badge variant="secondary" className="w-fit">{Object.keys(pendingStatusUpdates).length} unsaved</Badge>
              <Button type="button" size="sm" onClick={saveStatusUpdates} loading={updateStatus.isPending}>Save changes</Button>
            </>
          )}
          <Badge variant="secondary" className="w-fit">Live booking board</Badge>
          {canAssistBooking && (
            <Button type="button" size="sm" onClick={() => setIsBookingModalOpen(true)}>
              Quick Booking
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Total Appointments</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold">{data?.meta?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Needs Next Action</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold">{actionableCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          placeholder="Search by customer, phone, email, service, or staff"
          className="pl-9"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_OPTIONS.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className="whitespace-nowrap"
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {isLoading
          ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
          : !(data?.data?.length)
          ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="font-medium">No appointments found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No appointments match this filter yet.
                  </p>
                </CardContent>
              </Card>
            )
            : data?.data?.map((appt: any) => {
              const status = appointmentStatus(appt);
              const transitions = STATUS_TRANSITIONS[status] ?? [];
              const allowedStatuses = canOverrideTransitions
                ? ALL_APPOINTMENT_STATUSES.filter((option) => option !== status)
                : transitions;

              return (
              <Card
                key={appt.id}
                className={canOpenAppointmentDrawer ? 'cursor-pointer transition-colors hover:bg-accent/30' : undefined}
                onClick={() => canOpenAppointmentDrawer && setSelectedAppointmentId(appt.id)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{appt.customer?.firstName} {appt.customer?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{appt.service?.name} • {appt.service?.duration} min</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(appt.startTime), 'dd MMM, HH:mm')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(status)} variant="outline">
                      {status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {appt.bookingSource === 'STAFF_DASHBOARD'
                        ? 'Staff'
                        : appt.bookingSource === 'ADMIN_DASHBOARD'
                        ? 'Admin'
                        : 'Customer'}
                    </Badge>
                    <p className="font-semibold">{formatCurrency(Number(appt.total))}</p>
                  </div>

                  {canManageAppointmentStatus && allowedStatuses.length > 0 && (
                    <div className="pt-1" onClick={(event) => event.stopPropagation()}>
                      <CustomSelect
                        value=""
                        placeholder="Change"
                        options={allowedStatuses.map((status) => ({
                          value: status,
                          label: formatStatusLabel(status),
                        }))}
                        className="w-[110px]"
                        buttonClassName="h-8 px-2.5 text-xs"
                        menuClassName="z-20"
                        onChange={(nextValue) => handleChangeStatus(appt, nextValue as AppointmentStatus)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="hidden p-0 md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array(8).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
                  : !(data?.data?.length)
                  ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                          No appointments found for this filter.
                        </td>
                      </tr>
                    )
                      : data?.data?.map((appt: any) => {
                        const status = appointmentStatus(appt);
                        const transitions = STATUS_TRANSITIONS[status] ?? [];
                        const allowedStatuses = canOverrideTransitions
                          ? ALL_APPOINTMENT_STATUSES.filter((option) => option !== status)
                          : transitions;

                      return (
                      <tr
                        key={appt.id}
                        className={canOpenAppointmentDrawer ? 'border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors' : 'border-b last:border-b-0 hover:bg-muted/30 transition-colors'}
                        onClick={() => canOpenAppointmentDrawer && setSelectedAppointmentId(appt.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(appt.customer?.firstName ?? '', appt.customer?.lastName ?? '')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{appt.customer?.firstName} {appt.customer?.lastName}</p>
                              <p className="text-xs text-muted-foreground">{appt.customer?.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{appt.service?.name}</p>
                          <p className="text-xs text-muted-foreground">{appt.service?.duration}min</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {appt.staff?.user?.firstName} {appt.staff?.user?.lastName}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{format(new Date(appt.startTime), 'dd MMM yyyy')}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(appt.startTime), 'HH:mm')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(status)} variant="outline">
                            {status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {appt.bookingSource === 'STAFF_DASHBOARD'
                              ? 'Staff Dashboard'
                              : appt.bookingSource === 'ADMIN_DASHBOARD'
                              ? 'Admin Dashboard'
                              : 'Customer App'}
                          </Badge>
                          {appt.bookingReason && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[180px] truncate" title={appt.bookingReason}>
                              {appt.bookingReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(Number(appt.total))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManageAppointmentStatus && allowedStatuses.length > 0 && (
                            <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
                              <CustomSelect
                                value=""
                                placeholder="Change"
                                options={allowedStatuses.map((status) => ({
                                  value: status,
                                  label: formatStatusLabel(status),
                                }))}
                                className="w-[116px]"
                                menuClassName="right-0 left-auto w-[190px]"
                                buttonClassName="justify-between gap-2"
                                onChange={(nextValue) => handleChangeStatus(appt, nextValue as AppointmentStatus)}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.meta.totalPages}
                >
                  Show Next Page
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canAssistBooking && isBookingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !createAppointment.isPending && setIsBookingModalOpen(false)}
        >
          <div className="w-full max-w-3xl rounded-lg border bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">Quick Booking</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsBookingModalOpen(false)}
                disabled={createAppointment.isPending}
              >
                Close
              </Button>
            </div>

            <div className="space-y-3 p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Customer email</label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Customer first name (quick create)</label>
                  <Input
                    value={customerFirstName}
                    onChange={(e) => setCustomerFirstName(e.target.value)}
                    placeholder="Priya"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Customer last name (quick create)</label>
                  <Input
                    value={customerLastName}
                    onChange={(e) => setCustomerLastName(e.target.value)}
                    placeholder="Sharma"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Customer phone (optional)</label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+919876543210"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Service</label>
                  <CustomSelect
                    value={serviceId}
                    onChange={(nextValue) => {
                      setServiceId(nextValue);
                      setStaffId('');
                    }}
                    placeholder="Select service"
                    options={(services ?? []).map((service: any) => ({ value: service.id, label: service.name }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Staff</label>
                  <CustomSelect
                    value={staffId}
                    onChange={setStaffId}
                    placeholder="Select staff"
                    options={availableStaff.map((member: any) => ({
                      value: member.id,
                      label: `${member.user?.firstName ?? ''} ${member.user?.lastName ?? ''}`.trim(),
                    }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Start date & time</label>
                  <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Coupon code (optional)</label>
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="WELCOME20" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Walk-in customer" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Manual booking reason (optional)</label>
                  <Input
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="Phone booking requested by customer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBookingModalOpen(false)}
                  disabled={createAppointment.isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} loading={createAppointment.isPending}>Create Appointment</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedAppointmentId && canOpenAppointmentDrawer && (
        <>
          <button
            type="button"
            aria-label="Close appointment details"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setSelectedAppointmentId(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Appointment History</h2>
                <p className="text-xs text-muted-foreground">Status changes and booking details</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedAppointmentId(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-5 p-5">
              {appointmentDetailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-28 rounded-lg" />
                  <Skeleton className="h-40 rounded-lg" />
                </div>
              ) : appointmentDetail ? (
                <>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{appointmentDetail.customer?.firstName} {appointmentDetail.customer?.lastName}</p>
                        <p className="text-sm text-muted-foreground">{appointmentDetail.service?.name}</p>
                      </div>
                      <Badge className={getStatusColor(appointmentDetail.status)} variant="outline">
                        {String(appointmentDetail.status).replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Staff:</span> {appointmentDetail.staff?.user?.firstName} {appointmentDetail.staff?.user?.lastName}</p>
                      <p><span className="text-muted-foreground">When:</span> {format(new Date(appointmentDetail.startTime), 'dd MMM yyyy, hh:mm a')}</p>
                      <p><span className="text-muted-foreground">Total:</span> {formatCurrency(Number(appointmentDetail.total ?? 0))}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">Status Timeline</h3>
                    <div className="mt-3 space-y-3">
                      {(appointmentDetail.statusHistory ?? []).map((item: any, index: number, rows: any[]) => {
                        const previous = rows[index - 1];
                        const fromLabel = previous ? formatStatusLabel(previous.status) : 'Created';
                        const toLabel = formatStatusLabel(item.status);
                        const changedBy = `${item.changedBy?.firstName ?? ''} ${item.changedBy?.lastName ?? ''}`.trim() || 'System';

                        return (
                          <div key={item.id ?? `${item.status}-${index}`} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium">{fromLabel} to {toLabel}</p>
                              <span className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'dd MMM, hh:mm a')}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Changed by {changedBy}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No appointment details found.</p>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
