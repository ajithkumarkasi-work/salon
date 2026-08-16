import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, User, QrCode } from 'lucide-react-native';
import { api } from '@/lib/api';

export default function AppointmentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState('');

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data } = await api.get(`/appointments/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/appointments/${id}/cancel`, {
        reason: cancelReason.trim() || 'Cancelled by customer',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointment', id] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      Alert.alert('Cancelled', 'Your appointment has been cancelled.');
    },
  });

  if (isLoading || !appt) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#c0142f" />;
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(appt.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
      <View style={styles.card}>
        <Text style={styles.title}>{appt.service?.name}</Text>
        <Text style={styles.salon}>{appt.salon?.name}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{appt.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row icon={<CalendarDays size={14} color="#6b7280" />} label="Date" value={new Date(appt.startTime).toDateString()} />
        <Row icon={<Clock size={14} color="#6b7280" />} label="Time" value={new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        <Row icon={<User size={14} color="#6b7280" />} label="Staff" value={`${appt.staff?.user?.firstName ?? ''} ${appt.staff?.user?.lastName ?? ''}`} />
        <Row label="Total" value={`INR ${Number(appt.total).toFixed(2)}`} />
      </View>

      <View style={styles.card}>
        <View style={styles.qrHeader}>
          <QrCode size={16} color="#111827" />
          <Text style={styles.cardTitle}>Check-in Code</Text>
        </View>
        <Text style={styles.qrText}>{appt.qrCode}</Text>
        <Text style={styles.muted}>Show this code at salon for quick check-in.</Text>
      </View>

      {canCancel && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cancel appointment</Text>
          <TextInput
            style={styles.input}
            placeholder="Reason (optional)"
            placeholderTextColor="#9ca3af"
            value={cancelReason}
            onChangeText={setCancelReason}
          />
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            <Text style={styles.cancelBtnText}>{cancelMutation.isPending ? 'Cancelling...' : 'Cancel Appointment'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  salon: { color: '#6b7280', fontSize: 14 },
  statusPill: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#3730a3' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: '#6b7280', fontSize: 13 },
  value: { color: '#111827', fontSize: 13, fontWeight: '600' },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  qrText: { fontSize: 13, fontWeight: '700', color: '#c0142f' },
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
  cancelBtn: { backgroundColor: '#ef4444', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
