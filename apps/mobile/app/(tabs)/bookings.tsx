import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Appointment, AppointmentStatus } from '@glowbook/shared-types';
import { format } from 'date-fns';

const TABS = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'] },
  { key: 'past', label: 'Past', statuses: ['COMPLETED'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED', 'NO_SHOW'] },
];

const STATUS_ICONS: Record<string, any> = {
  PENDING: { Icon: Clock, color: '#f59e0b' },
  CONFIRMED: { Icon: CalendarDays, color: '#3b82f6' },
  ARRIVED: { Icon: CheckCircle, color: '#8b5cf6' },
  IN_PROGRESS: { Icon: CheckCircle, color: '#6366f1' },
  COMPLETED: { Icon: CheckCircle, color: '#10b981' },
  CANCELLED: { Icon: XCircle, color: '#ef4444' },
  NO_SHOW: { Icon: AlertCircle, color: '#6b7280' },
};

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuthStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'mine', activeTab],
    queryFn: async () => {
      const statuses = TABS[activeTab].statuses;
      const requests = statuses.map((s) =>
        api.get('/appointments', { params: { status: s, limit: 50 } }).then((r) => r.data.data)
      );
      const results = await Promise.all(requests);
      return results.flat().sort((a: any, b: any) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ) as Appointment[];
    },
    enabled: !!user,
  });

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const { Icon, color } = STATUS_ICONS[item.status] ?? { Icon: Clock, color: '#6b7280' };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/appointment/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusIcon, { backgroundColor: color + '20' }]}>
            <Icon size={18} color={color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.salonName}>{item.salon?.name}</Text>
            <Text style={styles.serviceName}>{item.service?.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color + '15' }]}>
            <Text style={[styles.statusText, { color }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <CalendarDays size={14} color="#9ca3af" />
            <Text style={styles.detailText}>
              {format(new Date(item.startTime), 'EEE, dd MMM yyyy')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={14} color="#9ca3af" />
            <Text style={styles.detailText}>
              {format(new Date(item.startTime), 'hh:mm a')}  •  {item.service?.duration}min
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.staffName}>
            {item.staff ? `${(item.staff as any).user?.firstName} ${(item.staff as any).user?.lastName}` : ''}
          </Text>
          <Text style={styles.price}>
            ₹{Number(item.total).toLocaleString('en-IN')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, i === activeTab && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabLabel, i === activeTab && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#c0142f" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CalendarDays size={40} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No {TABS[activeTab].label.toLowerCase()} appointments</Text>
              <Text style={styles.emptySub}>
                {activeTab === 0 ? 'Book a service to get started' : 'Your history will appear here'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#c0142f' },
  tabLabel: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabLabelActive: { color: '#c0142f', fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  salonName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  serviceName: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  cardDetails: { padding: 16, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#374151' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  staffName: { fontSize: 13, color: '#6b7280' },
  price: { fontSize: 16, fontWeight: '700', color: '#c0142f' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
});
