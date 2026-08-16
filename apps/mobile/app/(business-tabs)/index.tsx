import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@glowbook/shared-types';

type RangeKey = '7d' | '30d' | '90d';

function getRange(range: RangeKey) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return {
    startDate: format(subDays(new Date(), days), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  };
}

export default function BusinessOverviewScreen() {
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const { user } = useAuthStore();
  const { salons, activeSalonId, setActiveSalonId, isLoading: salonsLoading } = useBusinessSalons();
  const range = getRange(rangeKey);
  const isOwner = user?.role === UserRole.SALON_OWNER;

  const summary = useQuery({
    queryKey: ['mobile-business-summary', activeSalonId, range.startDate, range.endDate],
    queryFn: async () => (await api.get('/analytics/summary', { params: { salonId: activeSalonId, ...range } })).data,
    enabled: !!activeSalonId,
  });

  const todayAppointments = useQuery({
    queryKey: ['mobile-business-today', activeSalonId],
    queryFn: async () => (await api.get('/appointments', {
      params: {
        salonId: activeSalonId,
        startDate: startOfDay(new Date()).toISOString(),
        endDate: endOfDay(new Date()).toISOString(),
        limit: 10,
      },
    })).data,
    enabled: !!activeSalonId,
  });

  const stats = useMemo(() => ([
    ...(isOwner ? [{ label: 'Revenue', value: `₹${Number(summary.data?.totalRevenue ?? 0).toLocaleString('en-IN')}` }] : []),
    { label: 'Bookings', value: String(summary.data?.totalBookings ?? 0) },
    { label: 'New Customers', value: String(summary.data?.newCustomers ?? 0) },
    { label: 'Avg Rating', value: summary.data?.averageRating ? Number(summary.data.averageRating).toFixed(1) : '—' },
  ]), [isOwner, summary.data]);

  if (salonsLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#c0142f" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Overview</Text>
      <Text style={styles.subtitle}>Track your salon performance and today&apos;s activity.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {salons.map((salon: any) => {
          const selected = salon.id === activeSalonId;
          return (
            <TouchableOpacity key={salon.id} style={[styles.chip, selected && styles.chipActive]} onPress={() => setActiveSalonId(salon.id)}>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{salon.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.rangeRow}>
        {(['7d', '30d', '90d'] as RangeKey[]).map((item) => {
          const selected = item === rangeKey;
          return (
            <TouchableOpacity key={item} style={[styles.rangeButton, selected && styles.rangeButtonActive]} onPress={() => setRangeKey(item)}>
              <Text style={[styles.rangeButtonText, selected && styles.rangeButtonTextActive]}>{item === '7d' ? '7 days' : item === '30d' ? '30 days' : '90 days'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Appointments</Text>
          <Text style={styles.sectionCount}>{todayAppointments.data?.meta?.total ?? 0}</Text>
        </View>

        {todayAppointments.isLoading ? (
          <ActivityIndicator color="#c0142f" style={{ marginVertical: 18 }} />
        ) : !(todayAppointments.data?.data?.length) ? (
          <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {todayAppointments.data.data.map((item: any) => (
              <View key={item.id} style={styles.appointmentCard}>
                <View style={styles.appointmentTop}>
                  <Text style={styles.appointmentName}>{item.customer?.firstName} {item.customer?.lastName}</Text>
                  <Text style={styles.appointmentTotal}>₹{Number(item.total ?? 0).toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.appointmentSub}>{item.service?.name} • {item.staff?.user?.firstName} {item.staff?.user?.lastName}</Text>
                <Text style={styles.appointmentSub}>{format(new Date(item.startTime), 'dd MMM, hh:mm a')} • {String(item.status).replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  chipsRow: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#9f1239', fontWeight: '700' },
  rangeRow: { flexDirection: 'row', gap: 8 },
  rangeButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 10, backgroundColor: '#fff' },
  rangeButtonActive: { borderColor: '#c0142f', backgroundColor: '#c0142f' },
  rangeButtonText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  rangeButtonTextActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14 },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { marginTop: 6, fontSize: 22, fontWeight: '800', color: '#111827' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionCount: { fontSize: 13, fontWeight: '700', color: '#c0142f' },
  appointmentCard: { borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 12, padding: 12, gap: 4 },
  appointmentTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  appointmentName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  appointmentTotal: { fontSize: 14, fontWeight: '800', color: '#c0142f' },
  appointmentSub: { fontSize: 12, color: '#6b7280' },
  emptyText: { fontSize: 13, color: '#6b7280' },
});
