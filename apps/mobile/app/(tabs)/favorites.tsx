import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Favorite } from '@glowbook/shared-types';

export default function FavoritesScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await api.get('/favorites');
      return data as Favorite[];
    },
    enabled: !!user,
  });

  const remove = useMutation({
    mutationFn: (salonId: string) => api.delete(`/favorites/${salonId}`),
    onMutate: async (salonId) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const prev = qc.getQueryData<Favorite[]>(['favorites']);
      qc.setQueryData(['favorites'], (old: Favorite[] = []) => old.filter((f) => f.salonId !== salonId));
      return { prev };
    },
    onError: (_err, _id, context) => {
      qc.setQueryData(['favorites'], context?.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const renderItem = ({ item }: { item: Favorite }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/salon/${item.salonId}`)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.salon?.coverImageUrl ?? 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600' }}
        style={styles.image}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={styles.heartBtn}
        onPress={() => remove.mutate(item.salonId)}
      >
        <Heart size={18} color="#c0142f" fill="#c0142f" />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.name}>{item.salon?.name}</Text>
        <View style={styles.row}>
          <Star size={12} color="#f59e0b" fill="#f59e0b" />
          <Text style={styles.rating}>{item.salon?.rating.toFixed(1)}</Text>
          <Text style={styles.dot}>•</Text>
          <MapPin size={12} color="#9ca3af" />
          <Text style={styles.city}>{item.salon?.city}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Text style={styles.authTitle}>Sign in to see your favorites</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#c0142f" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row2}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Heart size={40} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySub}>Save salons you love to find them here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 12, paddingBottom: 16 },
  row2: { gap: 12 },
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  image: { width: '100%', height: 140 },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#fff', width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  info: { padding: 10 },
  name: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 11, fontWeight: '600', color: '#111827' },
  dot: { color: '#9ca3af' },
  city: { fontSize: 11, color: '#6b7280', flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySub: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  authTitle: { fontSize: 16, color: '#374151', marginBottom: 16 },
  signInBtn: { backgroundColor: '#c0142f', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  signInText: { color: '#fff', fontWeight: '700' },
});
