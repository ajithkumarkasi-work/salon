import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Star, Clock, Heart } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export default function SalonDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: salon, isLoading } = useQuery({
    queryKey: ['salon', id],
    queryFn: async () => {
      const { data } = await api.get(`/salons/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: services } = useQuery({
    queryKey: ['salon-services', id],
    queryFn: async () => {
      const { data } = await api.get(`/salons/${id}/services`);
      return data as any[];
    },
    enabled: !!id,
  });

  const { data: staff } = useQuery({
    queryKey: ['salon-staff', id],
    queryFn: async () => {
      const { data } = await api.get(`/salons/${id}/staff`);
      return data as any[];
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['salon-reviews', id],
    queryFn: async () => {
      const { data } = await api.get(`/salons/${id}/reviews`, { params: { limit: 5 } });
      return data?.data ?? [];
    },
    enabled: !!id,
  });

  const { data: favoriteCheck } = useQuery({
    queryKey: ['favorite-check', id, user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/favorites/${id}/check`);
      return data as { isFavorite: boolean };
    },
    enabled: !!id && !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (favoriteCheck?.isFavorite) {
        await api.delete(`/favorites/${id}`);
      } else {
        await api.post(`/favorites/${id}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorite-check', id, user?.id] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  if (isLoading || !salon) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#c0142f" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Image
        source={{ uri: salon.coverImageUrl ?? 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000' }}
        style={styles.cover}
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{salon.name}</Text>
            <View style={styles.metaRow}>
              <MapPin size={14} color="#6b7280" />
              <Text style={styles.metaText}>{salon.address}, {salon.city}</Text>
            </View>
            <View style={styles.metaRow}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.metaText}>{Number(salon.rating ?? 0).toFixed(1)} ({salon.reviewCount ?? 0} reviews)</Text>
            </View>
          </View>

          {user && (
            <TouchableOpacity
              style={styles.favoriteBtn}
              onPress={() => toggleFavorite.mutate()}
              disabled={toggleFavorite.isPending}
            >
              <Heart
                size={20}
                color="#c0142f"
                fill={favoriteCheck?.isFavorite ? '#c0142f' : 'transparent'}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.bookBtn} onPress={() => router.push(`/booking/${id}`)}>
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>

        <Section title="Services">
          {(services ?? []).slice(0, 6).map((service: any) => (
            <View key={service.id} style={styles.listItem}>
              <View>
                <Text style={styles.itemTitle}>{service.name}</Text>
                <Text style={styles.itemSub}>{service.duration} min</Text>
              </View>
              <Text style={styles.price}>INR {Number(service.price).toFixed(0)}</Text>
            </View>
          ))}
        </Section>

        <Section title="Staff">
          {(staff ?? []).slice(0, 6).map((member: any) => (
            <View key={member.id} style={styles.listItem}>
              <Text style={styles.itemTitle}>{member.user?.firstName} {member.user?.lastName}</Text>
              <Text style={styles.itemSub}>{member.role ?? 'Stylist'}</Text>
            </View>
          ))}
        </Section>

        <Section title="Timings & Policies">
          <View style={styles.metaRow}>
            <Clock size={14} color="#6b7280" />
            <Text style={styles.metaText}>Check individual slot availability while booking</Text>
          </View>
          <Text style={styles.policyText}>Cancellation: free cancellation before appointment start time.</Text>
          <Text style={styles.policyText}>Late arrivals may reduce service time.</Text>
        </Section>

        <Section title="Reviews">
          {(reviews ?? []).length === 0 ? (
            <Text style={styles.emptyText}>No reviews yet.</Text>
          ) : (
            (reviews ?? []).map((review: any) => (
              <View key={review.id} style={styles.reviewCard}>
                <Text style={styles.itemTitle}>{review.customer?.firstName} {review.customer?.lastName}</Text>
                <Text style={styles.itemSub}>Rating: {review.rating}/5</Text>
                {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
              </View>
            ))
          )}
        </Section>

        <Section title="Map">
          <Text style={styles.metaText}>{salon.address}, {salon.city}, {salon.state}</Text>
        </Section>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  cover: { width: '100%', height: 260 },
  content: { padding: 16, gap: 14 },
  topRow: { flexDirection: 'row', gap: 12 },
  name: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { color: '#6b7280', fontSize: 13, flex: 1 },
  favoriteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  bookBtn: {
    backgroundColor: '#c0142f',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '700', color: '#c0142f' },
  policyText: { color: '#4b5563', fontSize: 13 },
  emptyText: { color: '#6b7280', fontSize: 13 },
  reviewCard: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reviewComment: { color: '#374151', marginTop: 4, fontSize: 13 },
});
