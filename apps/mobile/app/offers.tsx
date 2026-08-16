import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function OffersScreen() {
  const [salonId, setSalonId] = useState('');

  const { data: salons } = useQuery({
    queryKey: ['salons', 'for-offers'],
    queryFn: async () => (await api.get('/salons', { params: { limit: 20 } })).data?.data ?? [],
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons', salonId],
    queryFn: async () => (await api.get(`/coupons/salon/${salonId}`)).data,
    enabled: !!salonId,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Offers & Coupons</Text>
      <Text style={styles.sub}>Choose a salon to view active offers</Text>

      <FlatList
        data={salons ?? []}
        horizontal
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={[styles.chip, salonId === item.id && styles.chipActive]}
            onPress={() => setSalonId(item.id)}
          >
            <Text style={[styles.chipText, salonId === item.id && styles.chipTextActive]}>{item.name}</Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
      />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#c0142f" />
      ) : (
        <FlatList
          data={coupons ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingTop: 12, gap: 10, paddingBottom: 20 }}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.card}>
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.value}>
                {item.type === 'PERCENTAGE' ? `${item.value}% OFF` : `INR ${item.value} OFF`}
              </Text>
              <Text style={styles.meta}>Valid till {new Date(item.validUntil).toDateString()}</Text>
              <Text style={styles.meta}>Min amount: INR {Number(item.minAmount).toFixed(0)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No offers available for selected salon.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  sub: { color: '#6b7280', marginTop: 2, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  chipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  chipText: { color: '#374151', fontSize: 12 },
  chipTextActive: { color: '#9f1239', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', gap: 4 },
  code: { color: '#c0142f', fontWeight: '800', fontSize: 16 },
  value: { color: '#111827', fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 12 },
  empty: { marginTop: 30, color: '#6b7280', textAlign: 'center' },
});
