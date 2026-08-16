import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PaymentStatus } from '@glowbook/shared-types';

const STATUS_ORDER: PaymentStatus[] = [
  PaymentStatus.SUCCEEDED,
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.FAILED,
];

const STATUS_META: Record<string, { label: string; backgroundColor: string; color: string }> = {
  ALL: { label: 'All', backgroundColor: '#fff', color: '#374151' },
  SUCCEEDED: { label: 'Succeeded', backgroundColor: '#dcfce7', color: '#166534' },
  PENDING: { label: 'Pending', backgroundColor: '#fef3c7', color: '#92400e' },
  PROCESSING: { label: 'Processing', backgroundColor: '#dbeafe', color: '#1d4ed8' },
  REFUNDED: { label: 'Refunded', backgroundColor: '#f3f4f6', color: '#374151' },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', backgroundColor: '#e0e7ff', color: '#4338ca' },
  FAILED: { label: 'Failed', backgroundColor: '#fee2e2', color: '#b91c1c' },
};

export default function BusinessPaymentsScreen() {
  const payments = useQuery({
    queryKey: ['mobile-business-payments'],
    queryFn: async () => (await api.get('/payments/history')).data,
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={payments.data?.data ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: any }) => {
          const statusMeta = STATUS_META[item.status] ?? STATUS_META.FAILED;
          const refundAmount = Number(item.refundAmount ?? 0);

          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name}>{item.appointment?.salon?.name ?? 'Salon'}</Text>
                  <Text style={styles.meta}>{item.appointment?.service?.name ?? 'Service'}</Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusMeta.backgroundColor }]}>
                  <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <View>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.amount}>₹{Number(item.amount ?? 0).toLocaleString('en-IN')}</Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>Refunded</Text>
                  <Text style={styles.detailValue}>{refundAmount > 0 ? `₹${refundAmount.toLocaleString('en-IN')}` : '—'}</Text>
                </View>
                <View style={styles.detailSpan}>
                  <Text style={styles.detailLabel}>Provider ID</Text>
                  <Text style={styles.codeValue}>{item.providerPaymentId ?? '—'}</Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>Provider</Text>
                  <Text style={styles.detailValue}>{item.provider ?? '—'}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>{payments.isLoading ? 'Loading payments...' : 'No payments found.'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280' },
  amount: { fontSize: 15, fontWeight: '800', color: '#c0142f' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  detailLabel: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  detailValue: { fontSize: 13, color: '#111827', fontWeight: '600' },
  codeValue: { fontSize: 12, color: '#111827', fontWeight: '700', fontFamily: 'monospace' },
  detailSpan: { width: '100%' },
});
