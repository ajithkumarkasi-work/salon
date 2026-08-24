import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Edit, Trash2, Users, CalendarOff } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { getInitials } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/shared/hooks/use-toast';
import { useCreateStaff, useDeleteStaff, useStaff, useUpdateStaff } from '@/features/staff/hooks';
import { useServices } from '@/features/services/hooks';
import { UserRole } from '@glowbook/shared-types';
import { isOnStaffLeave, listStaffLeaves, staffLeavesService } from '@/shared/lib/firebase';
import { CreateStaffDto, UpdateStaffDto } from '@glowbook/validation';

export default function StaffPage() {
  const { activeSalonId } = useSalonStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: staff, isLoading } = useStaff(activeSalonId ?? '');
  const { data: services } = useServices(activeSalonId ?? '');
  const createStaff = useCreateStaff(activeSalonId ?? '');
  const updateStaff = useUpdateStaff(activeSalonId ?? '');
  const deleteStaff = useDeleteStaff(activeSalonId ?? '');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Stylist');
  const [bio, setBio] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staffToDeactivate, setStaffToDeactivate] = useState<any | null>(null);
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const canManageStaff = user?.role === UserRole.SALON_OWNER || user?.role === UserRole.ADMIN;
  const staffTitle = 'Staff';
  const today = new Date().toISOString().slice(0, 10);
  const { data: activeLeaves = {} } = useQuery({
    queryKey: ['staff-leaves', activeSalonId],
    queryFn: async () => {
      const entries = await Promise.all((staff ?? []).map(async (member: any) => [member.id, await listStaffLeaves(member.id)] as const));
      return Object.fromEntries(entries);
    },
    enabled: !!activeSalonId && !!staff?.length,
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('Stylist');
    setBio('');
    setSelectedServiceIds([]);
  };

  const openCreate = () => {
    if (!canManageStaff) return;
    setEditingStaff(null);
    resetForm();
    setIsEditorOpen(true);
  };

  const openEdit = (member: any) => {
    if (!canManageStaff) return;
    setEditingStaff(member);
    setFirstName(member.user?.firstName ?? '');
    setLastName(member.user?.lastName ?? '');
    setEmail(member.user?.email ?? '');
    setPhone(member.user?.phone ?? '');
    setRole(member.role ?? 'Stylist');
    setBio(member.bio ?? '');
    setSelectedServiceIds((member.serviceIds ?? []).filter(Boolean));
    setIsEditorOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  const handleSave = async () => {
    if (!canManageStaff) return;
    if (!activeSalonId) {
      toast({ variant: 'destructive', title: 'No salon selected', description: 'Select a salon before managing staff.' });
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ variant: 'destructive', title: 'Missing details', description: 'First name, last name and email are required.' });
      return;
    }

    if (!editingStaff && !password.trim()) {
      toast({ variant: 'destructive', title: 'Password required', description: 'Set an initial password for staff login.' });
      return;
    }

    if (selectedServiceIds.length === 0) {
      toast({ variant: 'destructive', title: 'No services assigned', description: 'Select at least one service.' });
      return;
    }

    try {
      if (editingStaff) {
        const dto: UpdateStaffDto = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role: role.trim() || undefined,
          bio: bio.trim() || undefined,
          serviceIds: selectedServiceIds,
        };
        await updateStaff.mutateAsync({ id: editingStaff.id, dto, userId: editingStaff.userId });
        toast({ title: 'Staff updated', variant: 'success' as any });
      } else {
        const dto: CreateStaffDto = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          phone: phone.trim() || undefined,
          role: role.trim() || 'Stylist',
          bio: bio.trim() || undefined,
          serviceIds: selectedServiceIds,
        };
        await createStaff.mutateAsync(dto);
        toast({ title: 'Staff added', variant: 'success' as any });
      }

      setIsEditorOpen(false);
      setEditingStaff(null);
      resetForm();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: editingStaff ? 'Failed to update staff' : 'Failed to add staff',
        description: error?.response?.data?.message ?? 'Please try again.',
      });
    }
  };

  const handleDeactivateRequest = (member: any) => {
    if (!canManageStaff) return;
    setStaffToDeactivate(member);
  };

  const handleDeactivateConfirm = async () => {
    if (!canManageStaff || !staffToDeactivate) return;
    try {
      await deleteStaff.mutateAsync(staffToDeactivate.id);
      toast({ title: 'Staff deactivated', variant: 'success' as any });
      setStaffToDeactivate(null);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to deactivate staff member.' });
    }
  };

  const handleSubmitLeave = async () => {
    const ownStaff = staff?.find((member: any) => member.userId === user?.id);
    if (!user || !ownStaff || !activeSalonId || leaveEndDate < leaveStartDate) {
      toast({ variant: 'destructive', title: 'Invalid leave dates', description: 'Select a valid leave date range.' });
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await staffLeavesService.create({
        staffId: ownStaff.id,
        userId: user.id,
        salonId: activeSalonId,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason.trim() || null,
        isApproved: true,
      });
      toast({ title: 'Leave added', description: 'You will be unavailable for bookings during these dates.', variant: 'success' as any });
      setLeaveReason('');
      await queryClient.invalidateQueries({ queryKey: ['staff-leaves', activeSalonId] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not add leave', description: error?.message ?? 'Please try again.' });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  useEffect(() => {
    if (!isEditorOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(createStaff.isPending || updateStaff.isPending)) {
        setIsEditorOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isEditorOpen, createStaff.isPending, updateStaff.isPending]);

  useEffect(() => {
    if (!staffToDeactivate) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleteStaff.isPending) {
        setStaffToDeactivate(null);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [staffToDeactivate, deleteStaff.isPending]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{staffTitle}</h1>
          <p className="text-muted-foreground text-sm">{staff?.length ?? 0} team members</p>
          {!canManageStaff && <p className="text-xs text-muted-foreground mt-1">Read-only access for staff</p>}
        </div>
        {canManageStaff && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Staff
          </Button>
        )}
      </div>

      {user?.role === UserRole.STAFF && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <CalendarOff className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">Add leave</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input type="date" value={leaveStartDate} onChange={(event) => setLeaveStartDate(event.target.value)} />
              <Input type="date" value={leaveEndDate} onChange={(event) => setLeaveEndDate(event.target.value)} />
              <Input value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} placeholder="Reason (optional)" />
            </div>
            <Button type="button" onClick={handleSubmitLeave} loading={isSubmittingLeave}>
              Add leave
            </Button>
          </CardContent>
        </Card>
      )}

      {isEditorOpen && canManageStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !(createStaff.isPending || updateStaff.isPending) && setIsEditorOpen(false)}
        >
          <div className="w-full max-w-3xl rounded-lg border bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">{editingStaff ? 'Edit staff member' : 'Add staff member'}</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)} disabled={createStaff.isPending || updateStaff.isPending}>Close</Button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">First name</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ananya" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Last name</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sharma" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@salon.com" />
                </div>
                {!editingStaff && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Login password</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Role</label>
                  <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Stylist" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bio</label>
                  <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio (optional)" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned services</label>
                <div className="flex flex-wrap gap-2">
                  {services?.map((service: any) => {
                    const active = selectedServiceIds.includes(service.id);
                    return (
                      <button
                        type="button"
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                      >
                        {service.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)} disabled={createStaff.isPending || updateStaff.isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={createStaff.isPending || updateStaff.isPending}>
                  {editingStaff ? 'Save changes' : 'Create staff'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {staffToDeactivate && canManageStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleteStaff.isPending && setStaffToDeactivate(null)}
        >
          <div className="w-full max-w-md rounded-lg border bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold">Confirm deactivation</h2>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to deactivate {staffToDeactivate.user?.firstName} {staffToDeactivate.user?.lastName}?
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStaffToDeactivate(null)}
                  disabled={deleteStaff.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeactivateConfirm}
                  loading={deleteStaff.isPending}
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4" /><Skeleton className="h-3 w-2/3" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : !staff?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card border rounded-xl">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No staff members found</p>
          <p className="text-sm mt-1">
            {canManageStaff
              ? 'Add your first staff member to start assigning services and taking bookings.'
              : 'No staff profile data is available right now.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff?.map((member: any) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(member.user?.firstName ?? '', member.user?.lastName ?? '')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{member.user?.firstName} {member.user?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                    {isOnStaffLeave(activeLeaves[member.id] ?? [], today) && (
                      <Badge variant="destructive" className="mt-1">On leave</Badge>
                    )}
                  </div>
                  {canManageStaff && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(member)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeactivateRequest(member)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {member.bio && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{member.bio}</p>}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Services she provides</p>
                  <div className="flex gap-1 flex-wrap">
                    {member.serviceIds?.length ? member.serviceIds.map((id: string) => {
                      const service = (services ?? []).find((s: any) => s.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs">{service?.name ?? 'Unknown service'}</Badge>
                      );
                    }) : <Badge variant="outline" className="text-xs">No services assigned</Badge>}
                  </div>
                </div>

                <div className="flex items-center justify-end mt-2">
                  {member.rating > 0 && (
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-sm font-medium">{member.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
