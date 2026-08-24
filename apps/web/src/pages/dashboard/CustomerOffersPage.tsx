import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Percent, Sparkles, Tag } from 'lucide-react';
import { listActiveSalons, listCouponsBySalon } from '@/shared/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { CustomSelect } from '@/shared/components/ui/custom-select';
import { Skeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/shared/hooks/use-toast';
import { formatCurrency, formatDate } from '@/shared/lib/utils';

export default function CustomerOffersPage() {
  const [salonId, setSalonId] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const { toast } = useToast();

  const { data: salons, isLoading: isLoadingSalons } = useQuery({
    queryKey: ['offers-salons'],
    queryFn: () => listActiveSalons(),
  });

  const { data: coupons, isLoading: isLoadingCoupons } = useQuery({
    queryKey: ['offers-coupons', salonId],
    queryFn: () => listCouponsBySalon(salonId),
    enabled: !!salonId,
  });

  const selectedSalon = useMemo(
    () => (salons ?? []).find((salon: any) => salon.id === salonId),
    [salonId, salons],
  );

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({ title: 'Coupon copied', description: `${code} copied to clipboard.`, variant: 'success' as any });
      window.setTimeout(() => {
        setCopiedCode((current) => (current === code ? '' : current));
      }, 1400);
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy code right now.' });
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Offers</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick a salon and copy promo codes instantly.</p>
      </div>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <label className="mb-2 block text-sm font-medium">Salon</label>
          <CustomSelect
            value={salonId}
            onChange={setSalonId}
            disabled={isLoadingSalons}
            placeholder="Choose salon"
            options={(salons ?? []).map((salon: any) => ({
              value: salon.id,
              label: salon.name,
              description: salon.city,
            }))}
          />
          {selectedSalon && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                {selectedSalon.name}
              </Badge>
              <span className="text-muted-foreground">{selectedSalon.city}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {!salonId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Sparkles className="h-7 w-7 text-primary/70" />
            <p className="text-sm font-medium">Choose a salon to view offers</p>
            <p className="text-xs text-muted-foreground">You will see active discount coupons here.</p>
          </CardContent>
        </Card>
      )}

      {salonId && isLoadingCoupons && (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array(6).fill(0).map((_, idx) => (
            <div key={idx} className="rounded-xl border p-4 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {!!salonId && !isLoadingCoupons && (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(coupons ?? []).map((coupon: any) => {
            const isPercent = coupon.type === 'PERCENTAGE';
            const isCopied = copiedCode === coupon.code;

            return (
              <Card key={coupon.id} className="h-full overflow-hidden border-primary/20 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="border-b border-dashed px-3 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-5">
                  <div className="flex items-center justify-between gap-2 sm:items-start">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Tag className="h-4 w-4" />
                      </div>
                      <CardTitle className="min-w-0 truncate text-sm tracking-wide sm:text-base">{coupon.code}</CardTitle>
                    </div>
                    <Badge variant="success" className="h-6 px-2 text-[10px] sm:text-xs">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex h-full flex-col space-y-2.5 px-3 pb-3 sm:space-y-3 sm:px-6 sm:pb-6">
                  <div className="rounded-md bg-primary/[0.06] p-3 text-primary sm:p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70">Special offer</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{isPercent ? `${coupon.value}%` : formatCurrency(Number(coupon.value))}</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">discount on your booking</p>
                  </div>

                  <div className="min-h-[52px] space-y-1 text-xs text-muted-foreground">
                    {Number(coupon.minAmount) > 0 && <p>Minimum booking: {formatCurrency(Number(coupon.minAmount))}</p>}
                    {coupon.maxDiscount != null && <p>Maximum saving: {formatCurrency(Number(coupon.maxDiscount))}</p>}
                    {coupon.newCustomersOnly && <p className="font-medium text-blue-600">For new customers only</p>}
                    <p>Valid until {formatDate(coupon.validUntil)}</p>
                  </div>

                  <Button
                    type="button"
                    variant={isCopied ? 'secondary' : 'outline'}
                    className="mt-auto h-8 w-full text-xs sm:h-9 sm:text-sm"
                    onClick={() => copyCode(coupon.code)}
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {isCopied ? 'Copied' : 'Copy code'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {!(coupons ?? []).length && (
            <Card className="md:col-span-2 xl:col-span-3 border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Tag className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium">No active offers</p>
                <p className="text-xs text-muted-foreground">Try another salon to find available coupons.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
