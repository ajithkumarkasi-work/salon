import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { CustomSelect } from '@/shared/components/ui/custom-select';
import { Skeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuthStore } from '@/shared/stores/auth.store';
import { getInitials } from '@/shared/lib/utils';
import { useAdminUsers, useUpdateUserRole } from '@/features/admin/hooks';
import { UserRole } from '@glowbook/shared-types';

const roleOptions = [
  { value: UserRole.CUSTOMER, label: 'Customer' },
  { value: UserRole.SALON_OWNER, label: 'Salon Owner' },
  { value: UserRole.STAFF, label: 'Staff' },
  { value: UserRole.ADMIN, label: 'Admin' },
];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const { data, isLoading } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const [pendingSalonId, setPendingSalonId] = useState<{ userId: string; role: UserRole } | null>(null);
  const [salonIdInput, setSalonIdInput] = useState('');

  const handleRoleChange = async (userId: string, role: UserRole) => {
    if (role === UserRole.STAFF) {
      setPendingSalonId({ userId, role });
      setSalonIdInput('');
      return;
    }

    try {
      await updateRole.mutateAsync({ id: userId, role });
      toast({ title: 'Role updated', variant: 'success' as any });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update role',
        description: error?.response?.data?.message ?? 'Please try again.',
      });
    }
  };

  const confirmStaffPromotion = async () => {
    if (!pendingSalonId || !salonIdInput.trim()) return;
    try {
      await updateRole.mutateAsync({ id: pendingSalonId.userId, role: UserRole.STAFF, salonId: salonIdInput.trim() });
      toast({ title: 'Role updated', variant: 'success' as any });
      setPendingSalonId(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update role',
        description: error?.response?.data?.message ?? 'Please try again.',
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">{data?.meta?.total ?? 0} total users</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(u.firstName, u.lastName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {!u.isActive && <Badge variant="secondary">Suspended</Badge>}
                  </div>

                  <div className="w-40 shrink-0">
                    <CustomSelect
                      value={u.role}
                      onChange={(value) => handleRoleChange(u.id, value as UserRole)}
                      options={roleOptions}
                      disabled={u.id === currentUser?.id || updateRole.isPending}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingSalonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="font-semibold">Assign salon</h2>
                <p className="text-sm text-muted-foreground">Enter the salon ID this staff member belongs to.</p>
              </div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Salon ID"
                value={salonIdInput}
                onChange={(e) => setSalonIdInput(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-2 text-sm rounded-md border"
                  onClick={() => setPendingSalonId(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                  disabled={!salonIdInput.trim() || updateRole.isPending}
                  onClick={confirmStaffPromotion}
                >
                  Confirm
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
