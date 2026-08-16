import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@glowbook/shared-types';

export default function BusinessReviewsScreen() {
  const { activeSalonId } = useBusinessSalons();
  const { user } = useAuthStore();

  const reviews = useQuery({
    queryKey: ['mobile-business-reviews', activeSalonId],
    queryFn: async () => (await api.get(`/salons/${activeSalonId}/reviews`)).data,
    enabled: !!activeSalonId,
  });

  const data = (reviews.data?.data ?? []).filter((review: any) => {
    if (user?.role !== UserRole.STAFF) return true;
    return review.staff?.user?.id === user.id || review.staffId === user.id;
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.customer?.firstName} {item.customer?.lastName}</Text>
                <Text style={styles.meta}>{item.service?.name}</Text>
                <Text style={styles.meta}>Staff: {item.staff?.user?.firstName} {item.staff?.user?.lastName}</Text>
              </View>
              <Text style={styles.rating}>{Number(item.rating ?? 0).toFixed(1)}</Text>
            </View>
            <Text style={styles.comment}>{item.comment?.trim() || 'No written message.'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{reviews.isLoading ? 'Loading reviews...' : 'No reviews found.'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rating: { fontSize: 15, fontWeight: '800', color: '#c0142f' },
  comment: { fontSize: 13, color: '#374151' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
});