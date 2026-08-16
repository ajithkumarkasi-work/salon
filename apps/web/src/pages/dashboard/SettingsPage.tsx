import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useAuthStore } from '@/shared/stores/auth.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { getInitials } from '@/shared/lib/utils';
import { useToast } from '@/shared/hooks/use-toast';
import { api } from '@/shared/lib/api';
import { ChangePasswordDto, ChangePasswordSchema, UpdateProfileDto, UpdateProfileSchema } from '@glowbook/validation';
import { Upload, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, accessToken, refreshToken, setAuth } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileDto>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      avatarUrl: user?.avatarUrl ?? undefined,
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordDto>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    reset({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      avatarUrl: user?.avatarUrl ?? undefined,
    });
  }, [reset, user]);

  const updateProfile = useMutation({
    mutationFn: async (dto: UpdateProfileDto) => {
      const { data } = await api.patch('/users/me', dto);
      return data;
    },
    onSuccess: (updatedUser) => {
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, ...updatedUser }, accessToken, refreshToken);
      }
      toast({ title: 'Settings saved', description: 'Your profile has been updated.', variant: 'success' as any });
      reset(
        {
          firstName: updatedUser.firstName ?? '',
          lastName: updatedUser.lastName ?? '',
          phone: updatedUser.phone ?? '',
          avatarUrl: updatedUser.avatarUrl ?? undefined,
        },
        { keepDirty: false },
      );
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.response?.data?.message ?? 'Unable to save your profile right now.',
      });
    },
  });

  const changePassword = useMutation({
    mutationFn: async (dto: ChangePasswordDto) => {
      const { data } = await api.post('/auth/change-password', dto);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Password changed', description: 'Your password was updated successfully.', variant: 'success' as any });
      resetPassword();
      setIsPasswordModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Password change failed',
        description: error?.response?.data?.message ?? 'Unable to change password right now.',
      });
    },
  });

  const onPickPhoto = () => fileInputRef.current?.click();

  const onRemovePhoto = () => {
    setValue('avatarUrl', undefined, { shouldDirty: true, shouldValidate: true });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onPhotoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please choose an image file.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Image too large', description: 'Upload an image smaller than 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result ?? '');
      setValue('avatarUrl', imageData, { shouldDirty: true, shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload: UpdateProfileDto = {
      firstName: values.firstName?.trim() || undefined,
      lastName: values.lastName?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      avatarUrl: values.avatarUrl,
    };
    await updateProfile.mutateAsync(payload);
  });

  const onSubmitPassword = handleSubmitPassword(async (values) => {
    await changePassword.mutateAsync(values);
  });

  const openPasswordModal = () => {
    resetPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    if (changePassword.isPending) return;
    setIsPasswordModalOpen(false);
    resetPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const avatarPreview = watch('avatarUrl') || user?.avatarUrl || undefined;
  const avatarFieldValue = watch('avatarUrl');
  const hasSavedAvatar = Boolean(user?.avatarUrl);
  const isAvatarRemoved = hasSavedAvatar && !avatarPreview;
  const isNewAvatarSelected = Boolean(avatarFieldValue) && avatarFieldValue !== user?.avatarUrl;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, security, and notification preferences.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 border">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="text-lg">{getInitials(user?.firstName ?? '', user?.lastName ?? '')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Profile photo</p>
                  <p className="text-xs text-muted-foreground">PNG/JPG, max 2MB</p>
                  {isNewAvatarSelected && <p className="text-xs text-primary mt-1">New photo selected. Save to apply.</p>}
                  {isAvatarRemoved && <p className="text-xs text-destructive mt-1">Photo will be removed when you save.</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onPickPhoto}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRemovePhoto}
                  disabled={!avatarPreview}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Remove
                </Button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoSelected}
            />
            {errors.avatarUrl && <p className="text-xs text-destructive mt-2">{errors.avatarUrl.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">First name</label>
              <Input {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Last name</label>
              <Input {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input defaultValue={user?.email} disabled />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone</label>
            <Input {...register('phone')} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <Button className="w-full sm:w-auto" type="submit" loading={updateProfile.isPending} disabled={!isDirty && !updateProfile.isPending}>Save changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Review your latest updates and booking alerts from one place.</p>
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/notifications')}>
            Open Notifications
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Update your account password securely.</p>
            </div>
            <Button className="w-full sm:w-auto" type="button" onClick={openPasswordModal}>Change password</Button>
          </div>
        </CardContent>
      </Card>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">Change Password</h2>
              <Button type="button" variant="ghost" size="sm" onClick={closePasswordModal} disabled={changePassword.isPending}>
                Close
              </Button>
            </div>
            <form className="space-y-3 p-5" onSubmit={onSubmitPassword} noValidate>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current password</label>
                <Input type="password" {...registerPassword('currentPassword')} />
                {passwordErrors.currentPassword && <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New password</label>
                <Input type="password" {...registerPassword('newPassword')} />
                {passwordErrors.newPassword && <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm new password</label>
                <Input type="password" {...registerPassword('confirmPassword')} />
                {passwordErrors.confirmPassword && <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={closePasswordModal} disabled={changePassword.isPending}>
                  Cancel
                </Button>
                <Button type="submit" loading={changePassword.isPending}>Update password</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
