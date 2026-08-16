import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

function next7Days() {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function BookingScreen() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState(next7Days()[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');

  const { data: salon, isLoading: salonLoading } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: async () => (await api.get(`/salons/${salonId}`)).data,
    enabled: !!salonId,
  });

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', salonId],
    queryFn: async () => (await api.get(`/salons/${salonId}/services`)).data,
    enabled: !!salonId,
  });

  const { data: staff } = useQuery({
    queryKey: ['staff', salonId],
    queryFn: async () => (await api.get(`/salons/${salonId}/staff`)).data,
    enabled: !!salonId,
  });

  const { data: slots, isLoading: slotLoading } = useQuery({
    queryKey: ['slots', salonId, serviceId, selectedDate, staffId],
    queryFn: async () => {
      const { data } = await api.get('/availability', {
        params: {
          salonId,
          serviceId,
          date: selectedDate,
          staffId: staffId || undefined,
        },
      });
      return data as string[];
    },
    enabled: !!salonId && !!serviceId && !!selectedDate,
  });

  const filteredStaff = useMemo(() => {
    if (!serviceId) return staff ?? [];
    return (staff ?? []).filter((member: any) =>
      (member.services ?? []).some((s: any) => s.serviceId === serviceId)
    );
  }, [staff, serviceId]);

  const createBooking = useMutation({
    mutationFn: async () => {
      const startTime = `${selectedDate}T${selectedTime}:00.000Z`;
      const { data } = await api.post('/appointments', {
        salonId,
        serviceId,
        staffId,
        startTime,
        couponCode: couponCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      return data;
    },
    onSuccess: (appt) => {
      router.replace(`/appointment/${appt.id}`);
    },
  });

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Sign in required</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (salonLoading || servicesLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#c0142f" />;
  }

  const selectedService = (services ?? []).find((s: any) => s.id === serviceId);
  const subTotal = selectedService ? Number(selectedService.price) : 0;
  const tax = subTotal * 0.18;
  const total = subTotal + tax;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
      <Text style={styles.heading}>Book at {salon?.name}</Text>

      <Card title="1. Select Service">
        <View style={styles.chipsWrap}>
          {(services ?? []).map((service: any) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.chip, serviceId === service.id && styles.chipActive]}
              onPress={() => {
                setServiceId(service.id);
                setStaffId('');
                setSelectedTime('');
              }}
            >
              <Text style={[styles.chipText, serviceId === service.id && styles.chipTextActive]}>
                {service.name} - INR {Number(service.price).toFixed(0)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card title="2. Choose Staff">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineList}>
          {filteredStaff.map((member: any) => (
            <TouchableOpacity
              key={member.id}
              style={[styles.smallChip, staffId === member.id && styles.smallChipActive]}
              onPress={() => {
                setStaffId(member.id);
                setSelectedTime('');
              }}
            >
              <Text style={[styles.smallChipText, staffId === member.id && styles.smallChipTextActive]}>
                {member.user?.firstName} {member.user?.lastName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Card>

      <Card title="3. Pick Date">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineList}>
          {next7Days().map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.smallChip, selectedDate === day && styles.smallChipActive]}
              onPress={() => {
                setSelectedDate(day);
                setSelectedTime('');
              }}
            >
              <Text style={[styles.smallChipText, selectedDate === day && styles.smallChipTextActive]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Card>

      <Card title="4. Choose Slot">
        {slotLoading ? (
          <ActivityIndicator color="#c0142f" />
        ) : (
          <View style={styles.chipsWrap}>
            {(slots ?? []).map((slot: string) => (
              <TouchableOpacity
                key={slot}
                style={[styles.smallChip, selectedTime === slot && styles.smallChipActive]}
                onPress={() => setSelectedTime(slot)}
              >
                <Text style={[styles.smallChipText, selectedTime === slot && styles.smallChipTextActive]}>{slot}</Text>
              </TouchableOpacity>
            ))}
            {(slots ?? []).length === 0 && <Text style={styles.muted}>No slots available for selected options.</Text>}
          </View>
        )}
      </Card>

      <Card title="5. Offers & Notes">
        <TextInput
          value={couponCode}
          onChangeText={setCouponCode}
          placeholder="Coupon code (optional)"
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes for salon (optional)"
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />
      </Card>

      <Card title="6. Checkout">
        <Row label="Service total" value={`INR ${subTotal.toFixed(2)}`} />
        <Row label="Tax (18%)" value={`INR ${tax.toFixed(2)}`} />
        <Row label="Pay at salon" value="Enabled" />
        <View style={styles.divider} />
        <Row label="Total" value={`INR ${total.toFixed(2)}`} bold />
      </Card>

      <TouchableOpacity
        style={styles.primaryBtn}
        disabled={!serviceId || !staffId || !selectedTime || createBooking.isPending}
        onPress={() => createBooking.mutate()}
      >
        <Text style={styles.primaryBtnText}>{createBooking.isPending ? 'Booking...' : 'Confirm Booking'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '700', color: '#111827' }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '700', color: '#111827' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  chipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#9f1239', fontWeight: '600' },
  inlineList: { gap: 8, paddingVertical: 2 },
  smallChip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  smallChipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  smallChipText: { fontSize: 12, color: '#374151' },
  smallChipTextActive: { color: '#9f1239', fontWeight: '600' },
  muted: { color: '#6b7280', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: '#4b5563', fontSize: 13 },
  rowValue: { color: '#4b5563', fontSize: 13 },
  divider: { borderTopWidth: 1, borderTopColor: '#f3f4f6', marginVertical: 6 },
  primaryBtn: { backgroundColor: '#c0142f', borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
