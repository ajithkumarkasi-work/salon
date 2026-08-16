import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';

function getRange() {
  return {
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  };
}

export default function BusinessAnalyticsScreen() {
  const { activeSalonId } = useBusinessSalons();
  const range = getRange();

  const summary = useQuery({
    queryKey: ['mobile-business-analytics-summary', activeSalonId],
    queryFn: async () => (await api.get('/analytics/summary', { params: { salonId: activeSalonId, ...range } })).data,
    enabled: !!activeSalonId,
  });

  const popularServices = useQuery({
    queryKey: ['mobile-business-analytics-services', activeSalonId],
    queryFn: async () => (await api.get('/analytics/services', { params: { salonId: activeSalonId, ...range } })).data,
    enabled: !!activeSalonId,
  });

  const staffPerformance = useQuery({
    queryKey: ['mobile-business-analytics-staff', activeSalonId],
    queryFn: async () => (await api.get('/analytics/staff-performance', { params: { salonId: activeSalonId, ...range } })).data,
    enabled: !!activeSalonId,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Bookings</Text><Text style={styles.kpiValue}>{summary.data?.totalBookings ?? 0}</Text></View>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Revenue</Text><Text style={styles.kpiValue}>₹{Number(summary.data?.totalRevenue ?? 0).toLocaleString('en-IN')}</Text></View>
      </View>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Customers</Text><Text style={styles.kpiValue}>{summary.data?.newCustomers ?? 0}</Text></View>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Rating</Text><Text style={styles.kpiValue}>{summary.data?.averageRating ? Number(summary.data.averageRating).toFixed(1) : '—'}</Text></View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Popular Services</Text>
        {(popularServices.data ?? []).slice(0, 6).map((item: any) => (
          <View key={item.serviceId} style={styles.rowItem}>
            <Text style={styles.rowTitle}>{item.serviceName}</Text>
            <Text style={styles.rowMeta}>{item.bookings} bookings</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Staff Performance</Text>
        {(staffPerformance.data ?? []).slice(0, 6).map((item: any) => (
          <View key={item.staffId} style={styles.rowItem}>
            <Text style={styles.rowTitle}>{item.staffName}</Text>
            <Text style={styles.rowMeta}>{item.bookings} bookings • {Number(item.rating ?? 0).toFixed(1)} rating</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14 },
  kpiLabel: { fontSize: 12, color: '#6b7280' },
  kpiValue: { marginTop: 6, fontSize: 20, fontWeight: '800', color: '#111827' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowItem: { gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowMeta: { fontSize: 12, color: '#6b7280' },
});