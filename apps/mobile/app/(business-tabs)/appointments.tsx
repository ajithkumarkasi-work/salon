import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';
import { AppointmentStatus, UserRole } from '@glowbook/shared-types';
import { useAuthStore } from '@/stores/auth.store';
import { format } from 'date-fns';

const STATUS_TRANSITIONS: Record<string, AppointmentStatus[]> = {
  PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  CONFIRMED: [AppointmentStatus.ARRIVED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  ARRIVED: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED],
  IN_PROGRESS: [AppointmentStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

function formatStatus(status: string) {
  return status.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export default function BusinessAppointmentsScreen() {
  const { user } = useAuthStore();
  const { activeSalonId } = useBusinessSalons();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
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
  const canOverride = user?.role === UserRole.ADMIN || user?.role === UserRole.SALON_OWNER;
  const canAssistBooking = user?.role === UserRole.ADMIN;

  const services = useQuery({
    queryKey: ['mobile-business-services-picker', activeSalonId],
    queryFn: async () => (await api.get(`/salons/${activeSalonId}/services`)).data,
    enabled: !!activeSalonId && canAssistBooking,
  });

  const staff = useQuery({
    queryKey: ['mobile-business-staff-picker', activeSalonId],
    queryFn: async () => (await api.get(`/salons/${activeSalonId}/staff`)).data,
    enabled: !!activeSalonId && canAssistBooking,
  });

  const availableStaff = useMemo(() => {
    if (!serviceId) return staff.data ?? [];
    return (staff.data ?? []).filter((member: any) => (member.services ?? []).some((item: any) => item.service?.id === serviceId || item.serviceId === serviceId));
  }, [serviceId, staff.data]);

  const appointments = useQuery({
    queryKey: ['mobile-business-appointments', activeSalonId, filter],
    queryFn: async () => (await api.get('/appointments', {
      params: { salonId: activeSalonId, status: filter === 'ALL' ? undefined : filter, limit: 100 },
    })).data,
    enabled: !!activeSalonId,
  });

  const selectedAppointment = useMemo(
    () => appointments.data?.data?.find((item: any) => item.id === selectedAppointmentId) ?? null,
    [appointments.data?.data, selectedAppointmentId],
  );

  const appointmentDetail = useQuery({
    queryKey: ['mobile-business-appointment-detail', selectedAppointmentId],
    queryFn: async () => (await api.get(`/appointments/${selectedAppointmentId}`)).data,
    enabled: !!selectedAppointmentId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      return (await api.patch(`/appointments/${id}/status`, { status })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-business-appointments'] });
      qc.invalidateQueries({ queryKey: ['mobile-business-appointment-detail'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (payload: any) => (await api.post('/appointments', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-business-appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const handleCreateBooking = async () => {
    if (!activeSalonId || !serviceId || !staffId || !startTime || !customerEmail.trim()) {
      return;
    }

    await createAppointment.mutateAsync({
      salonId: activeSalonId,
      serviceId,
      staffId,
      startTime: new Date(startTime).toISOString(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerFirstName: customerFirstName.trim() || undefined,
      customerLastName: customerLastName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      manualReason: manualReason.trim() || undefined,
      couponCode: couponCode.trim() || undefined,
      notes: notes.trim() || undefined,
    });

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
  };

  return (
    <View style={styles.container}>
      {canAssistBooking && (
        <View style={styles.topActionRow}>
          <TouchableOpacity style={styles.quickBookingButton} onPress={() => setIsBookingModalOpen(true)}>
            <Text style={styles.quickBookingText}>Quick Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={appointments.data?.data ?? []}
        keyExtractor={(item: any) => item.id}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map((item) => {
              const selected = item === filter;
              return (
                <TouchableOpacity key={item} style={[styles.filterChip, selected && styles.filterChipActive]} onPress={() => setFilter(item)}>
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{item === 'ALL' ? 'All' : formatStatus(item)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => setSelectedAppointmentId(item.id)}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.customer?.firstName} {item.customer?.lastName}</Text>
                <Text style={styles.meta}>{item.service?.name} • {item.staff?.user?.firstName} {item.staff?.user?.lastName}</Text>
              </View>
              <Text style={styles.amount}>₹{Number(item.total ?? 0).toLocaleString('en-IN')}</Text>
            </View>
            <Text style={styles.meta}>{format(new Date(item.startTime), 'dd MMM yyyy, hh:mm a')}</Text>
            <Text style={styles.status}>{formatStatus(item.status)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={appointments.isLoading ? <ActivityIndicator color="#c0142f" style={{ marginTop: 40 }} /> : <Text style={styles.empty}>No appointments found for this filter.</Text>}
      />

      <Modal visible={!!selectedAppointmentId} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedAppointmentId(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Appointment Details</Text>
            <TouchableOpacity onPress={() => setSelectedAppointmentId(null)}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View>
          {appointmentDetail.isLoading || !appointmentDetail.data ? (
            <ActivityIndicator color="#c0142f" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.detailCard}>
                <Text style={styles.name}>{appointmentDetail.data.customer?.firstName} {appointmentDetail.data.customer?.lastName}</Text>
                <Text style={styles.meta}>{appointmentDetail.data.service?.name}</Text>
                <Text style={styles.meta}>{format(new Date(appointmentDetail.data.startTime), 'dd MMM yyyy, hh:mm a')}</Text>
                <Text style={styles.meta}>Staff: {appointmentDetail.data.staff?.user?.firstName} {appointmentDetail.data.staff?.user?.lastName}</Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Change status</Text>
                <View style={styles.statusButtonsWrap}>
                  {(canOverride
                    ? Object.values(AppointmentStatus).filter((status) => status !== appointmentDetail.data.status)
                    : STATUS_TRANSITIONS[appointmentDetail.data.status] ?? []).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={styles.statusButton}
                      disabled={updateStatus.isPending}
                      onPress={() => updateStatus.mutate({ id: appointmentDetail.data.id, status })}
                    >
                      <Text style={styles.statusButtonText}>{formatStatus(status)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Status history</Text>
                <View style={{ gap: 10, marginTop: 10 }}>
                  {(appointmentDetail.data.statusHistory ?? []).map((item: any, index: number, rows: any[]) => {
                    const previous = rows[index - 1];
                    const fromLabel = previous ? formatStatus(previous.status) : 'Created';
                    const actor = `${item.changedBy?.firstName ?? ''} ${item.changedBy?.lastName ?? ''}`.trim() || 'System';
                    return (
                      <View key={item.id ?? `${item.status}-${index}`} style={styles.timelineCard}>
                        <Text style={styles.timelineTitle}>{fromLabel} to {formatStatus(item.status)}</Text>
                        <Text style={styles.timelineMeta}>By {actor}</Text>
                        <Text style={styles.timelineMeta}>{format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a')}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={isBookingModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsBookingModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quick Booking</Text>
            <TouchableOpacity onPress={() => setIsBookingModalOpen(false)} disabled={createAppointment.isPending}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput style={styles.input} placeholder="Customer email" autoCapitalize="none" value={customerEmail} onChangeText={setCustomerEmail} />
            <TextInput style={styles.input} placeholder="Customer first name" value={customerFirstName} onChangeText={setCustomerFirstName} />
            <TextInput style={styles.input} placeholder="Customer last name" value={customerLastName} onChangeText={setCustomerLastName} />
            <TextInput style={styles.input} placeholder="Customer phone" value={customerPhone} onChangeText={setCustomerPhone} />

            <Text style={styles.sectionTitle}>Service</Text>
            <View style={styles.chipsWrap}>
              {(services.data ?? []).map((item: any) => {
                const selected = item.id === serviceId;
                return (
                  <TouchableOpacity key={item.id} style={[styles.chip, selected && styles.chipActive]} onPress={() => { setServiceId(item.id); setStaffId(''); }}>
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Staff</Text>
            <View style={styles.chipsWrap}>
              {availableStaff.map((item: any) => {
                const selected = item.id === staffId;
                return (
                  <TouchableOpacity key={item.id} style={[styles.chip, selected && styles.chipActive]} onPress={() => setStaffId(item.id)}>
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item.user?.firstName} {item.user?.lastName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput style={styles.input} placeholder="Start date & time (YYYY-MM-DDTHH:mm)" value={startTime} onChangeText={setStartTime} />
            <TextInput style={styles.input} placeholder="Coupon code" value={couponCode} onChangeText={setCouponCode} />
            <TextInput style={styles.input} placeholder="Notes" value={notes} onChangeText={setNotes} />
            <TextInput style={styles.input} placeholder="Manual booking reason" value={manualReason} onChangeText={setManualReason} />

            <TouchableOpacity style={[styles.primaryButton, createAppointment.isPending && styles.disabledButton]} disabled={createAppointment.isPending} onPress={handleCreateBooking}>
              <Text style={styles.primaryButtonText}>{createAppointment.isPending ? 'Creating...' : 'Create Appointment'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  topActionRow: { paddingHorizontal: 16, paddingTop: 16 },
  quickBookingButton: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#c0142f', paddingHorizontal: 14, paddingVertical: 10 },
  quickBookingText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  filters: { gap: 8, padding: 16, paddingBottom: 8 },
  filterChip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  filterChipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  filterChipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  filterChipTextActive: { color: '#9f1239', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, gap: 5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280' },
  amount: { fontSize: 15, fontWeight: '800', color: '#c0142f' },
  status: { fontSize: 12, color: '#9f1239', fontWeight: '700', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  modalContainer: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  closeText: { color: '#c0142f', fontWeight: '700' },
  modalContent: { padding: 16, gap: 12, paddingBottom: 30 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#111827' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#9f1239', fontWeight: '700' },
  primaryButton: { backgroundColor: '#c0142f', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
  detailCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusButtonsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  statusButton: { borderRadius: 999, backgroundColor: '#c0142f', paddingHorizontal: 12, paddingVertical: 9 },
  statusButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  timelineCard: { borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 12, padding: 12, gap: 4 },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  timelineMeta: { fontSize: 12, color: '#6b7280' },
});
