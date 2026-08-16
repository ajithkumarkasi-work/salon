import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';

export default function BusinessCustomersScreen() {
  const { activeSalonId } = useBusinessSalons();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ['mobile-business-customers', activeSalonId],
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: { salonId: activeSalonId, limit: 100, status: 'COMPLETED' } });
      const customerMap = new Map<string, any>();
      data.data.forEach((appt: any) => {
        const c = appt.customer;
        if (!c) return;
        const existing = customerMap.get(c.id) ?? { ...c, totalBookings: 0, totalSpent: 0, lastVisit: null, visits: [] };
        existing.totalBookings += 1;
        existing.totalSpent += Number(appt.total);
        existing.visits.push(appt);
        if (!existing.lastVisit || new Date(appt.startTime) > new Date(existing.lastVisit)) {
          existing.lastVisit = appt.startTime;
        }
        customerMap.set(c.id, existing);
      });
      return Array.from(customerMap.values())
        .map((customer: any) => ({
          ...customer,
          visits: [...customer.visits].sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
        }))
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent);
    },
    enabled: !!activeSalonId,
  });

  const selectedCustomer = useMemo(
    () => customers.data?.find((item: any) => item.id === selectedCustomerId) ?? null,
    [customers.data, selectedCustomerId],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={customers.data ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => setSelectedCustomerId(item.id)}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.meta}>{item.email}</Text>
              </View>
              <Text style={styles.amount}>₹{Number(item.totalSpent).toLocaleString('en-IN')}</Text>
            </View>
            <Text style={styles.meta}>Visits: {item.totalBookings} • Last visit: {item.lastVisit ? new Date(item.lastVisit).toLocaleDateString('en-IN') : '—'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{customers.isLoading ? 'Loading customers...' : 'No customers found yet.'}</Text>}
      />

      <Modal visible={!!selectedCustomer} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedCustomerId(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Customer History</Text>
            <TouchableOpacity onPress={() => setSelectedCustomerId(null)}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View>
          {selectedCustomer && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.detailCard}>
                <Text style={styles.name}>{selectedCustomer.firstName} {selectedCustomer.lastName}</Text>
                <Text style={styles.meta}>{selectedCustomer.email}</Text>
                <Text style={styles.meta}>{selectedCustomer.phone ?? '—'}</Text>
                <Text style={[styles.meta, { marginTop: 6 }]}>Visits: {selectedCustomer.totalBookings} • Paid: ₹{Number(selectedCustomer.totalSpent).toLocaleString('en-IN')}</Text>
              </View>

              {(selectedCustomer.visits ?? []).map((visit: any, index: number) => (
                <View key={visit.id} style={styles.detailCard}>
                  <Text style={styles.visitTitle}>Visit #{(selectedCustomer.visits?.length ?? 0) - index}</Text>
                  <Text style={styles.name}>{visit.service?.name}</Text>
                  <Text style={styles.meta}>Staff: {visit.staff?.user?.firstName} {visit.staff?.user?.lastName}</Text>
                  <Text style={styles.meta}>{new Date(visit.startTime).toLocaleDateString('en-IN')} • {new Date(visit.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.meta}>Paid: ₹{Number(visit.total ?? 0).toLocaleString('en-IN')} • Status: {String(visit.status ?? 'COMPLETED').replace('_', ' ')}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, gap: 5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  meta: { fontSize: 12, color: '#6b7280' },
  amount: { fontSize: 15, fontWeight: '800', color: '#c0142f' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  modalContainer: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  closeText: { color: '#c0142f', fontWeight: '700' },
  modalContent: { padding: 16, gap: 12, paddingBottom: 30 },
  detailCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, gap: 4 },
  visitTitle: { fontSize: 12, color: '#9f1239', fontWeight: '700' },
});
