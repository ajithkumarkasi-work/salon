import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { CustomSelect } from '@/shared/components/ui/custom-select';
import { CreateAppointmentDto } from '@glowbook/validation';

function toArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.slots)) return payload.slots;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

type SlotOption = {
  value: string;
  label: string;
  staffId?: string;
  staffName?: string;
  isAvailable?: boolean;
};

type StaffOption = {
  id: string;
  name: string;
  serviceIds: string[];
};

function normalizeSlots(payload: any): SlotOption[] {
  const rawSlots: any[] = (() => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.slots)) return payload.slots;
    if (payload && typeof payload === 'object') {
      // Some environments return a single slot object instead of an array.
      if (payload.time || payload.startTime || payload.slot || payload.value) return [payload];
      if (payload.data && (payload.data.time || payload.data.startTime || payload.data.slot || payload.data.value)) return [payload.data];
    }
    return [];
  })();

  return rawSlots
    .map((slot) => {
      if (typeof slot === 'string' || typeof slot === 'number') {
        const value = String(slot);
        return { value, label: value };
      }

      if (slot && typeof slot === 'object') {
        const timeValue = slot.time ?? slot.startTime ?? slot.slot ?? slot.value;
        if (!timeValue) return null;
        const value = String(timeValue);
        const staffName = slot.staffName ?? slot.staff?.name ?? slot.staff?.fullName;
        return {
          value,
          label: staffName ? `${value} · ${String(staffName)}` : value,
          staffId: slot.staffId ? String(slot.staffId) : undefined,
          staffName: staffName ? String(staffName) : undefined,
          isAvailable: typeof slot.isAvailable === 'boolean' ? slot.isAvailable : undefined,
        };
      }

      return null;
    })
    .filter((slot): slot is SlotOption => !!slot && slot.isAvailable !== false);
}

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
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(nextDays(7)[0]);
  const [time, setTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');

  const { data: salon } = useQuery({
    queryKey: ['book-salon', salonId],
    queryFn: async () => (await api.get(`/salons/${salonId}`)).data,
    enabled: !!salonId,
  });

  const { data: servicesRaw } = useQuery({
    queryKey: ['book-services', salonId],
    queryFn: async () => (await api.get(`/salons/${salonId}/services`)).data,
    enabled: !!salonId,
  });

  const services = useMemo(() => toArray<any>(servicesRaw), [servicesRaw]);

  const { data: staffRaw } = useQuery({
    queryKey: ['book-staff', salonId],
    queryFn: async () => (await api.get(`/salons/${salonId}/staff`)).data,
    enabled: !!salonId,
  });

  const staff = useMemo(() => toArray<any>(staffRaw), [staffRaw]);

  const staffOptions = useMemo<StaffOption[]>(() => {
    return staff
      .map((member: any) => {
        const id = member?.id ? String(member.id) : '';
        if (!id) return null;

        const firstName = member?.user?.firstName ?? member?.firstName ?? '';
        const lastName = member?.user?.lastName ?? member?.lastName ?? '';
        const fallbackName = member?.name ?? member?.user?.name ?? 'Staff';
        const composedName = `${firstName} ${lastName}`.trim() || String(fallbackName);

        const serviceIds = (member?.services ?? [])
          .map((s: any) => s?.serviceId ?? s?.id ?? s?.service?.id)
          .filter(Boolean)
          .map((s: any) => String(s));

        return { id, name: composedName, serviceIds };
      })
      .filter((member): member is StaffOption => !!member);
  }, [staff]);

  const filteredStaff = useMemo(() => {
    if (!serviceId) return staffOptions;

    const matching = staffOptions.filter((member) => member.serviceIds.includes(serviceId));

    // If service relation data is missing, avoid blank dropdown by showing all staff.
    return matching.length ? matching : staffOptions;
  }, [staffOptions, serviceId]);

  const { data: slotsRaw } = useQuery({
    queryKey: ['book-slots', salonId, serviceId, staffId, date],
    queryFn: async () =>
      (
        await api.get('/availability', {
          params: { salonId, serviceId, staffId: staffId || undefined, date },
        })
      ).data,
    enabled: !!salonId && !!serviceId && !!date,
  });

  const slots = useMemo(() => normalizeSlots(slotsRaw), [slotsRaw]);

  const selectedService = services.find((s: any) => s.id === serviceId);
  const subtotal = selectedService ? Number(selectedService.price) : 0;
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const createBooking = useMutation({
    mutationFn: async () => {
      const payload: CreateAppointmentDto = {
        salonId: salonId!,
        serviceId,
        staffId,
        startTime: new Date(`${date}T${time}:00`).toISOString(),
        couponCode: couponCode.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      return (await api.post('/appointments', payload)).data;
    },
    onSuccess: (appt) => {
      // Mark customer appointment lists/details stale so back navigation shows latest booking.
      qc.invalidateQueries({ queryKey: ['customer-appointments-web'] });
      qc.invalidateQueries({ queryKey: ['customer-appointment-detail'] });
      navigate(`/dashboard/appointments/${appt.id}`);
    },
  });

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
            options={filteredStaff.map((member) => ({ value: member.id, label: member.name }))}
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
            {slots.map((slot, index) => {
              const slotValue = String(slot.value ?? '');
              const slotLabel = typeof slot.label === 'string' ? slot.label : slotValue;

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
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Checkout</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax (18%)</span><span>₹{tax.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          <p className="text-muted-foreground">Pay at salon: enabled</p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={() => createBooking.mutate()}
        disabled={!serviceId || !staffId || !time}
        loading={createBooking.isPending}
      >
        Confirm Booking
      </Button>
    </div>
  );
}
