import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Percent, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { CustomSelect } from '@/shared/components/ui/custom-select';
import { couponsService, getFirebaseErrorMessage, listAllCouponsBySalon } from '@/shared/lib/firebase';
import { useSalonStore } from '@/shared/stores/salon.store';
import { formatCurrency, formatDate } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/shared/hooks/use-toast';
import { Coupon } from '@glowbook/shared-types';
import { CouponType } from '@glowbook/shared-types';

export default function OffersPage() {
  const { activeSalonId } = useSalonStore();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>(CouponType.PERCENTAGE);
  const [value, setValue] = useState('');
  const [minAmount, setMinAmount] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [newCustomersOnly, setNewCustomersOnly] = useState(false);
  const [validUntil, setValidUntil] = useState('');

  const resetForm = () => {
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setCode('');
    setType(CouponType.PERCENTAGE);
    setValue('');
    setMinAmount('0');
    setMaxDiscount('');
    setUsageLimit('');
    setNewCustomersOnly(false);
    setValidUntil(nextMonth);
  };

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons', activeSalonId],
    queryFn: () => listAllCouponsBySalon(activeSalonId!),
    enabled: !!activeSalonId,
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => couponsService.update(id, { isActive: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons', activeSalonId] }),
  });

  const createCoupon = useMutation({
    mutationFn: (payload: any) =>
      couponsService.create({
        ...payload,
        salonId: activeSalonId,
        usageCount: 0,
        isActive: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons', activeSalonId] });
      toast({ title: 'Coupon created', variant: 'success' as any });
      setIsEditorOpen(false);
      setEditingCoupon(null);
      resetForm();
    },
  });

  const updateCoupon = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => couponsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons', activeSalonId] });
      toast({ title: 'Coupon updated', variant: 'success' as any });
      setIsEditorOpen(false);
      setEditingCoupon(null);
      resetForm();
    },
  });

  const startCreate = () => {
    setEditingCoupon(null);
    resetForm();
    setIsEditorOpen(true);
  };

  const startEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(String(coupon.value));
    setMinAmount(String(coupon.minAmount ?? 0));
    setMaxDiscount(coupon.maxDiscount == null ? '' : String(coupon.maxDiscount));
    setUsageLimit(coupon.usageLimit == null ? '' : String(coupon.usageLimit));
    setNewCustomersOnly(coupon.newCustomersOnly);
    setValidUntil(coupon.validUntil.slice(0, 10));
    setIsEditorOpen(true);
  };

  const onSave = async () => {
    if (!activeSalonId) return;
    const normalizedCode = code.trim().toUpperCase();
    const numericValue = Number(value);
    const numericMin = Number(minAmount || 0);
    const numericMax = maxDiscount ? Number(maxDiscount) : undefined;
    const numericUsageLimit = usageLimit ? Number(usageLimit) : undefined;

    if (!normalizedCode) {
      toast({ variant: 'destructive', title: 'Coupon code required' });
      return;
    }
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast({ variant: 'destructive', title: 'Enter a valid discount value' });
      return;
    }
    if (!validUntil) {
      toast({ variant: 'destructive', title: 'Select a valid end date' });
      return;
    }

    const payload = {
      code: normalizedCode,
      type,
      value: numericValue,
      minAmount: numericMin,
      maxDiscount: numericMax,
      usageLimit: numericUsageLimit,
      newCustomersOnly,
      validFrom: new Date().toISOString(),
      validUntil: new Date(`${validUntil}T23:59:59.000Z`).toISOString(),
    };

    try {
      if (editingCoupon) {
        await updateCoupon.mutateAsync({ id: editingCoupon.id, payload });
      } else {
        await createCoupon.mutateAsync(payload);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: editingCoupon ? 'Failed to update coupon' : 'Failed to create coupon',
        description: getFirebaseErrorMessage(error),
      });
    }
  };

  useEffect(() => {
    if (!isEditorOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(createCoupon.isPending || updateCoupon.isPending)) {
        setIsEditorOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isEditorOpen, createCoupon.isPending, updateCoupon.isPending]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offers & Coupons</h1>
          <p className="text-muted-foreground text-sm">Create discount campaigns for your customers</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Create Coupon
        </Button>
      </div>

      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !(createCoupon.isPending || updateCoupon.isPending) && setIsEditorOpen(false)}
        >
          <div className="w-full max-w-3xl rounded-lg border bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">{editingCoupon ? 'Edit coupon' : 'Create coupon'}</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)} disabled={createCoupon.isPending || updateCoupon.isPending}>Close</Button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Coupon code</label>
                  <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME20" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <CustomSelect
                    value={type}
                    onChange={(nextValue) => setType(nextValue as CouponType)}
                    options={[
                      { value: CouponType.PERCENTAGE, label: 'Percentage' },
                      { value: CouponType.FIXED, label: 'Fixed amount' },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Discount value</label>
                  <Input type="number" min="1" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === 'PERCENTAGE' ? '20' : '300'} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Minimum order amount</label>
                  <Input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Maximum discount (optional)</label>
                  <Input type="number" min="1" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="500" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Usage limit (optional)</label>
                  <Input type="number" min="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="100" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Valid until</label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>

                <label className="mt-7 inline-flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={newCustomersOnly} onChange={(e) => setNewCustomersOnly(e.target.checked)} />
                  New customers only
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)} disabled={createCoupon.isPending || updateCoupon.isPending}>
                  Cancel
                </Button>
                <Button onClick={onSave} loading={createCoupon.isPending || updateCoupon.isPending}>
                  {editingCoupon ? 'Save changes' : 'Create coupon'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="rounded-xl border p-5 space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></div>)}
        </div>
      ) : coupons?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card border rounded-xl text-center">
          <Tag className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No coupons yet</p>
          <p className="text-sm">Create your first discount coupon to attract customers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons?.map((coupon: Coupon) => (
            <Card key={coupon.id} className={`h-full overflow-hidden border ${coupon.isActive ? 'border-primary/40' : 'border-muted opacity-60'}`}>
              <CardContent className="flex h-full flex-col p-0">
                <div className="flex items-start justify-between gap-3 border-b border-dashed px-3 py-3 sm:px-5 sm:py-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <code className="block truncate text-sm font-bold tracking-wide sm:text-base">{coupon.code}</code>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Valid until {formatDate(coupon.validUntil)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={coupon.isActive ? 'default' : 'secondary'} className="h-6 px-2 text-[10px] sm:text-xs">
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(coupon)} title="Edit coupon">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-primary/[0.04] px-3 py-4 sm:px-5 sm:py-5">
                  {coupon.type === 'PERCENTAGE' && <Percent className="h-5 w-5 shrink-0 text-primary" />}
                  <span className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                    {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatCurrency(Number(coupon.value))}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">discount</span>
                </div>

                <div className="min-h-[104px] space-y-1.5 px-3 py-3 text-xs text-muted-foreground sm:px-5">
                  {Number(coupon.minAmount) > 0 && <p>Minimum order: {formatCurrency(Number(coupon.minAmount))}</p>}
                  {coupon.maxDiscount != null && <p>Maximum discount: {formatCurrency(Number(coupon.maxDiscount))}</p>}
                  {coupon.newCustomersOnly && <p className="font-medium text-blue-600">New customers only</p>}
                  {coupon.usageLimit != null && <p>Used: {coupon.usageCount}/{coupon.usageLimit}</p>}
                </div>

                <div className="mt-auto px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                  {coupon.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full border-destructive/30 text-xs text-destructive hover:bg-destructive/10 sm:h-9 sm:text-sm"
                      onClick={() => deactivate.mutate(coupon.id)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <div className="h-8 sm:h-9" />
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
