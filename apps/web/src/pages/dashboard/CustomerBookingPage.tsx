import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getAvailability,
  findCouponByCode,
  listServicesBySalon,
  listStaffBySalon,
  isOnStaffLeave,
  listStaffLeaves,
  salonsService,
  withStaffUserProfiles,
} from '@/shared/lib/firebase';
import { useCreateAppointment } from '@/features/appointments/hooks';
import { getFirebaseErrorMessage } from '@/shared/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { CustomSelect } from '@/shared/components/ui/custom-select';
import { useToast } from '@/shared/hooks/use-toast';

type StaffOption = {
  id: string;
  name: string;
  serviceIds: string[];
  isOnLeave: boolean;
};

function nextDays(days: number) {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

export default function CustomerBookingPage() {
  const { salonId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(nextDays(7)[0]);
  const [time, setTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');

  const { data: salon } = useQuery({
    queryKey: ['book-salon', salonId],
    queryFn: () => salonsService.getById(salonId!),
    enabled: !!salonId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['book-services', salonId],
    queryFn: () => listServicesBySalon(salonId!),
    enabled: !!salonId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['book-staff', salonId, date],
    queryFn: async () => {
      const members = await withStaffUserProfiles(await listStaffBySalon(salonId!));
      return Promise.all(
        members.map(async (member) => ({
          ...member,
          isOnLeave: isOnStaffLeave(await listStaffLeaves(member.id), date),
        })),
      );
    },
    enabled: !!salonId,
  });

  const staffOptions = useMemo<StaffOption[]>(() => {
    return staff.map((member: any) => {
      const firstName = member?.user?.firstName ?? '';
      const lastName = member?.user?.lastName ?? '';
      const composedName = `${firstName} ${lastName}`.trim() || member.role || 'Staff';
      return { id: member.id, name: composedName, serviceIds: member.serviceIds ?? [], isOnLeave: member.isOnLeave };
    });
  }, [staff]);

  const filteredStaff = useMemo(() => {
    if (!serviceId) return staffOptions;
    const matching = staffOptions.filter((member) => member.serviceIds.includes(serviceId));
    // If service relation data is missing, avoid blank dropdown by showing all staff.
    return matching.length ? matching : staffOptions;
  }, [staffOptions, serviceId]);

  const { data: slots = [] } = useQuery({
    queryKey: ['book-slots', salonId, serviceId, staffId, date],
    queryFn: () => getAvailability({ salonId: salonId!, serviceId, staffId: staffId || undefined, date }),
    enabled: !!salonId && !!serviceId && !!date,
  });

  const selectedService = services.find((s: any) => s.id === serviceId);
  const subtotal = selectedService ? Number(selectedService.price) : 0;
  const normalizedCouponCode = couponCode.trim().toUpperCase();
  const { data: coupon, isFetching: isCouponChecking } = useQuery({
    queryKey: ['book-coupon', salonId, normalizedCouponCode],
    queryFn: () => findCouponByCode(salonId!, normalizedCouponCode),
    enabled: !!salonId && !!normalizedCouponCode,
  });

  const couponResult = useMemo(() => {
    if (!normalizedCouponCode) return { discount: 0, message: '' };
    if (isCouponChecking) return { discount: 0, message: 'Checking coupon...' };
    if (!coupon) return { discount: 0, message: 'Coupon not found.' };

    const now = Date.now();
    const validFrom = Date.parse(coupon.validFrom);
    const validUntil = Date.parse(coupon.validUntil);
    if (!coupon.isActive || (Number.isFinite(validFrom) && now < validFrom) || (Number.isFinite(validUntil) && now > validUntil)) {
      return { discount: 0, message: 'This coupon is not currently valid.' };
    }
    if (subtotal < Number(coupon.minAmount ?? 0)) {
      return { discount: 0, message: `Minimum booking amount is ₹${Number(coupon.minAmount).toFixed(2)}.` };
    }

    const rawDiscount = coupon.type === 'PERCENTAGE' ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
    const discount = coupon.maxDiscount == null ? rawDiscount : Math.min(rawDiscount, Number(coupon.maxDiscount));
    return { discount: Math.min(discount, subtotal), message: `Coupon applied: ₹${Math.min(discount, subtotal).toFixed(2)} off.` };
  }, [coupon, isCouponChecking, normalizedCouponCode, subtotal]);

  const discount = couponResult.discount;
  const tax = Math.round((subtotal - discount) * 0.18 * 100) / 100;
  const total = Math.round((subtotal - discount + tax) * 100) / 100;

  const createBooking = useCreateAppointment();

  const handleConfirm = async () => {
    try {
      const appt = await createBooking.mutateAsync({
        salonId: salonId!,
        serviceId,
        staffId,
        startTime: new Date(`${date}T${time}:00`).toISOString(),
        couponCode: couponCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      // Mark customer appointment lists/details stale so back navigation shows latest booking.
      qc.invalidateQueries({ queryKey: ['customer-appointments-web'] });
      qc.invalidateQueries({ queryKey: ['customer-appointment-detail'] });
      navigate(`/dashboard/appointments/${appt.id}`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Booking failed', description: getFirebaseErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book Appointment</h1>
          <p className="text-sm text-muted-foreground mt-1">{salon?.name ?? 'Select your booking details'}</p>
        </div>
        <Button variant="outline" type="button" onClick={() => navigate(`/dashboard/salons/${salonId}`)}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Service</CardTitle></CardHeader>
        <CardContent>
          <CustomSelect
            value={serviceId}
            onChange={(nextValue) => {
              setServiceId(nextValue);
              setStaffId('');
              setTime('');
            }}
            placeholder="Select service"
            options={services.map((service: any) => ({
              value: service.id,
              label: `${service.name} - ₹${Number(service.price).toFixed(0)}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Staff & Date</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CustomSelect
            value={staffId}
            onChange={(nextValue) => {
              setStaffId(nextValue);
              setTime('');
            }}
            placeholder="Any available staff"
            options={filteredStaff.map((member) => ({
              value: member.id,
              label: member.name,
              disabled: member.isOnLeave,
              indicator: member.isOnLeave ? 'leave' as const : undefined,
              description: member.isOnLeave ? 'On leave' : undefined,
            }))}
          />
          <CustomSelect
            value={date}
            onChange={(nextValue) => {
              setDate(nextValue);
              setTime('');
            }}
            options={nextDays(7).map((d) => ({ value: d, label: d }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Slot</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {slots.filter((slot) => slot.isAvailable).map((slot, index) => {
              const slotValue = slot.time;
              const slotLabel = slot.staffName ? `${slotValue} · ${slot.staffName}` : slotValue;

              return (
              <button
                key={`${slotValue}-${slot.staffId ?? 'any'}-${index}`}
                type="button"
                className={`px-3 py-1.5 rounded-full text-sm border ${time === slotValue ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}
                onClick={() => {
                  if (time === slotValue) {
                    setTime('');
                    return;
                  }

                  setTime(slotValue);

                  if (!staffId && slot.staffId) {
                    setStaffId(slot.staffId);
                  }
                }}
              >
                {slotLabel}
              </button>
              );
            })}
            {!slots.length && <p className="text-sm text-muted-foreground">No slots available.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Offers & Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon code (optional)" />
          {!!normalizedCouponCode && <p className={`text-sm ${couponResult.discount > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>{couponResult.message}</p>}
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Checkout</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discount.toFixed(2)}</span></div>}
          <div className="flex justify-between"><span>Tax (18%)</span><span>₹{tax.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          <p className="text-muted-foreground">Pay at salon: enabled</p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleConfirm}
        disabled={!serviceId || !staffId || !time}
        loading={createBooking.isPending}
      >
        Confirm Booking
      </Button>
    </div>
  );
}
