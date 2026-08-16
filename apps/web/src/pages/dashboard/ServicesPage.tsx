import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Plus, Edit, Trash2, Clock, Tag } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useServices, useCreateService, useDeleteService, useUpdateService } from '@/features/services/hooks';
import { useStaff } from '@/features/staff/hooks';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { formatCurrency } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/shared/hooks/use-toast';
import { Service, UserRole } from '@glowbook/shared-types';
import { CreateServiceDto, UpdateServiceDto } from '@glowbook/validation';

const DEFAULT_SERVICE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f7e7d7'/%3E%3Cstop offset='1' stop-color='%23f3c7a7'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' fill='url(%23g)'/%3E%3Ccircle cx='130' cy='80' r='56' fill='%23ffffff88'/%3E%3Ccircle cx='560' cy='300' r='74' fill='%23ffffff66'/%3E%3Ctext x='320' y='185' text-anchor='middle' font-size='28' font-family='Arial,sans-serif' fill='%237a4b2f'%3EService Image%3C/text%3E%3C/svg%3E";

export default function ServicesPage() {
  const { activeSalonId } = useSalonStore();
  const { user } = useAuthStore();
  const { data: services, isLoading } = useServices(activeSalonId ?? '');
  const { data: staff } = useStaff(activeSalonId ?? '');
  const createService = useCreateService(activeSalonId ?? '');
  const updateService = useUpdateService(activeSalonId ?? '');
  const deleteService = useDeleteService(activeSalonId ?? '');
  const { toast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [bufferTime, setBufferTime] = useState('0');
  const [serviceToDeactivate, setServiceToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const canManageServices = user?.role === UserRole.SALON_OWNER || user?.role === UserRole.ADMIN;
  const myStaffProfile = (staff ?? []).find((member: any) => member.user?.id === user?.id);
  const assignedServiceIds = new Set(
    (myStaffProfile?.services ?? [])
      .map((item: any) => item?.service?.id ?? item?.serviceId ?? item?.id)
      .filter(Boolean),
  );
  const visibleServices = user?.role === UserRole.STAFF
    ? (services ?? []).filter((service: Service) => assignedServiceIds.has(service.id))
    : (services ?? []);
  const activeServicesCount = visibleServices.filter((service: Service) => service.isActive).length;
  const averagePrice = visibleServices.length
    ? visibleServices.reduce((sum: number, service: Service) => sum + Number(service.price ?? 0), 0) / visibleServices.length
    : 0;

  const resetForm = () => {
    setName('');
    setDescription('');
    setImageUrl('');
    setPrice('');
    setDuration('60');
    setBufferTime('0');
  };

  const startCreate = () => {
    if (!canManageServices) return;
    setEditingService(null);
    resetForm();
    setIsEditorOpen(true);
  };

  const startEdit = (service: Service) => {
    if (!canManageServices) return;
    setEditingService(service);
    setName(service.name);
    setDescription(service.description ?? '');
    setImageUrl(service.imageUrl ?? '');
    setPrice(String(service.price ?? ''));
    setDuration(String(service.duration ?? 60));
    setBufferTime(String(service.bufferTime ?? 0));
    setIsEditorOpen(true);
  };

  const onPickImage = () => imageInputRef.current?.click();

  const onImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
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
    reader.onload = () => setImageUrl(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!canManageServices) return;
    if (!activeSalonId) {
      toast({ variant: 'destructive', title: 'No salon selected', description: 'Select a salon before managing services.' });
      return;
    }

    const payload: CreateServiceDto = {
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      price: Number(price),
      duration: Number(duration),
      bufferTime: Number(bufferTime || 0),
      displayOrder: editingService?.displayOrder ?? (services?.length ?? 0),
    };

    if (!payload.name) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a service name.' });
      return;
    }
    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      toast({ variant: 'destructive', title: 'Invalid price', description: 'Enter a valid service price.' });
      return;
    }
    if (!Number.isFinite(payload.duration) || payload.duration < 5) {
      toast({ variant: 'destructive', title: 'Invalid duration', description: 'Duration must be at least 5 minutes.' });
      return;
    }
    if (!Number.isFinite(payload.bufferTime) || payload.bufferTime < 0) {
      toast({ variant: 'destructive', title: 'Invalid buffer time', description: 'Buffer time cannot be negative.' });
      return;
    }

    try {
      if (editingService) {
        await updateService.mutateAsync({ id: editingService.id, dto: payload as UpdateServiceDto });
        toast({ title: 'Service updated', variant: 'success' as any });
      } else {
        await createService.mutateAsync(payload);
        toast({ title: 'Service created', variant: 'success' as any });
      }
      setIsEditorOpen(false);
      setEditingService(null);
      resetForm();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: editingService ? 'Failed to update service' : 'Failed to add service',
        description: error?.response?.data?.message ?? 'Please try again.',
      });
    }
  };

  const handleDeleteRequest = (id: string, name: string) => {
    if (!canManageServices) return;
    setServiceToDeactivate({ id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!canManageServices || !serviceToDeactivate) return;
    try {
      await deleteService.mutateAsync(serviceToDeactivate.id);
      toast({ title: 'Service deactivated', variant: 'success' as any });
      setServiceToDeactivate(null);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to deactivate service.' });
    }
  };

  useEffect(() => {
    if (!isEditorOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(createService.isPending || updateService.isPending)) {
        setIsEditorOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isEditorOpen, createService.isPending, updateService.isPending]);

  useEffect(() => {
    if (!serviceToDeactivate) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleteService.isPending) {
        setServiceToDeactivate(null);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [serviceToDeactivate, deleteService.isPending]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground text-sm">{visibleServices.length} services configured</p>
          {!canManageServices && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing only services this staff member provides.
            </p>
          )}
        </div>
        {canManageServices && (
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Service
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Visible services</p>
            <p className="text-xl font-semibold mt-1">{visibleServices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active services</p>
            <p className="text-xl font-semibold mt-1">{activeServicesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Average price</p>
            <p className="text-xl font-semibold mt-1">{formatCurrency(averagePrice)}</p>
          </CardContent>
        </Card>
      </div>

      {isEditorOpen && canManageServices && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !(createService.isPending || updateService.isPending) && setIsEditorOpen(false)}
        >
          <div className="w-full max-w-3xl rounded-lg border bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">{editingService ? 'Edit service' : 'Add service'}</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)} disabled={createService.isPending || updateService.isPending}>Close</Button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Service name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Haircut and styling" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Price</label>
                  <Input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1200" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input type="number" min="5" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Buffer time (minutes)</label>
                  <Input type="number" min="0" value={bufferTime} onChange={(e) => setBufferTime(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional short description" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Service image</label>
                <div className="h-36 overflow-hidden rounded-md border">
                  <img src={imageUrl || DEFAULT_SERVICE_IMAGE} alt="Service preview" className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={onPickImage}>Upload image</Button>
                  {imageUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl('')}>Use default</Button>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImageSelected} />
                <p className="text-xs text-muted-foreground">PNG/JPG/WebP up to 2MB</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)} disabled={createService.isPending || updateService.isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={createService.isPending || updateService.isPending}>
                  {editingService ? 'Save changes' : 'Create service'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {serviceToDeactivate && canManageServices && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleteService.isPending && setServiceToDeactivate(null)}
        >
          <div className="w-full max-w-md rounded-lg border bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold">Confirm deactivation</h2>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to deactivate "{serviceToDeactivate.name}"?
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setServiceToDeactivate(null)}
                  disabled={deleteService.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  loading={deleteService.isPending}
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
            <div key={i} className="rounded-xl border p-5 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleServices.map((service: Service) => (
            <Card key={service.id} className="group hover:shadow-md transition-shadow">
              <div className="h-36 overflow-hidden rounded-t-xl">
                <img src={service.imageUrl || DEFAULT_SERVICE_IMAGE} alt={service.name} className="h-full w-full object-cover" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    {service.category && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        <Tag className="h-3 w-3 mr-1" />
                        {service.category.name}
                      </Badge>
                    )}
                  </div>
                  {canManageServices && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(service)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteRequest(service.id, service.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {service.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{service.duration}min</span>
                    </div>
                    {service.bufferTime > 0 && (
                      <span className="text-xs text-muted-foreground">+{service.bufferTime}min buffer</span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-primary">{formatCurrency(Number(service.price))}</span>
                </div>

                {!service.isActive && (
                  <Badge variant="outline" className="mt-2 text-xs text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}

          {!visibleServices.length && (
            <Card>
              <CardContent className="p-5">
                <p className="font-medium">No services to show</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.role === UserRole.STAFF
                    ? 'No services are assigned to this staff member yet.'
                    : 'No services have been created for this salon yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
