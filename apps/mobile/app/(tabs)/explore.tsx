import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, Star, MapPin, SlidersHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Salon } from '@glowbook/shared-types';

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ExploreScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['salons', 'explore', debouncedSearch, page],
    queryFn: async () => {
      const { data } = await api.get('/salons', {
        params: { search: debouncedSearch || undefined, page, limit: 20 },
      });
      return data;
    },
  });

  const renderSalon = ({ item }: { item: Salon }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/salon/${item.id}`)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.coverImageUrl ?? 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.ratingBadge}>
            <Star size={11} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <MapPin size={12} color="#9ca3af" />
          <Text style={styles.location}>{item.address}, {item.city}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.priceRange}>{'₹'.repeat(item.priceRange)}</Text>
          <Text style={styles.category}>{item.category?.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search salons, services, cities..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
          autoCorrect={false}
        />
        {isLoading && <ActivityIndicator size="small" color="#c0142f" />}
      </View>

      <FlatList
        data={data?.data}
        keyExtractor={(item) => item.id}
        renderItem={renderSalon}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (data?.meta && page < data.meta.totalPages) setPage((p) => p + 1);
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No salons found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          ) : null
        }
        ListFooterComponent={isFetching && page > 1 ? <ActivityIndicator style={{ padding: 16 }} color="#c0142f" /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  image: { width: '100%', height: 180 },
  info: { padding: 14 },
  infoTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  location: { fontSize: 13, color: '#6b7280', flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceRange: { fontSize: 13, color: '#c0142f', fontWeight: '600' },
  category: {
    fontSize: 12, color: '#6b7280', backgroundColor: '#f3f4f6',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
  },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
});
