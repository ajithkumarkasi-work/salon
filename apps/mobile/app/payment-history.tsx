import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function PaymentHistoryScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments', 'history'],
    queryFn: async () => (await api.get('/payments/history', { params: { limit: 50 } })).data,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Payment History</Text>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#c0142f" />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.card}>
              <Text style={styles.amount}>INR {Number(item.amount).toFixed(2)}</Text>
              <Text style={styles.meta}>Status: {item.status}</Text>
              <Text style={styles.meta}>Provider: {item.provider}</Text>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No payments yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', gap: 4 },
  amount: { color: '#111827', fontSize: 16, fontWeight: '800' },
  meta: { color: '#6b7280', fontSize: 12 },
  empty: { marginTop: 40, textAlign: 'center', color: '#6b7280' },
});
