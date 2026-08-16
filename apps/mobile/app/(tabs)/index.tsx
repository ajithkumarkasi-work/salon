import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Star, MapPin, Clock, Search, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { Salon } from '@glowbook/shared-types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;

const POPULAR_SERVICES = [
  { id: '1', name: 'Haircut', icon: '✂️' },
  { id: '2', name: 'Facial', icon: '✨' },
  { id: '3', name: 'Massage', icon: '🧘' },
  { id: '4', name: 'Hair Color', icon: '🎨' },
  { id: '5', name: 'Manicure', icon: '💅' },
  { id: '6', name: 'Waxing', icon: '🌿' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: salons } = useQuery({
    queryKey: ['salons', 'nearby'],
    queryFn: async () => {
      const { data } = await api.get('/salons', { params: { limit: 10 } });
      return data.data as Salon[];
    },
  });

  const { data: featured } = useQuery({
    queryKey: ['salons', 'featured'],
    queryFn: async () => {
      const { data } = await api.get('/salons', { params: { limit: 5, minRating: 4.5 } });
      return data.data as Salon[];
    },
  });

  const { data: upcomingAppointment } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await api.get('/appointments', {
        params: { status: 'CONFIRMED', limit: 1 },
      });
      return data.data?.[0] ?? null;
    },
    enabled: !!user,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greeting()}, {user?.firstName ?? 'Guest'} 👋
          </Text>
          <Text style={styles.subGreeting}>Find your next appointment</Text>
        </View>
      </View>

      {/* Search bar */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push('/(tabs)/explore')}
        activeOpacity={0.8}
      >
        <Search size={18} color="#9ca3af" />
        <Text style={styles.searchPlaceholder}>Search salons or services...</Text>
      </TouchableOpacity>

      {/* Upcoming appointment banner */}
      {upcomingAppointment && (
        <TouchableOpacity
          style={styles.upcomingCard}
          onPress={() => router.push('/bookings')}
          activeOpacity={0.9}
        >
          <View style={styles.upcomingLeft}>
            <Text style={styles.upcomingLabel}>Upcoming</Text>
            <Text style={styles.upcomingTitle}>{upcomingAppointment.service?.name}</Text>
            <Text style={styles.upcomingMeta}>
              {upcomingAppointment.salon?.name} • {new Date(upcomingAppointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <ChevronRight size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Popular services */}
      <SectionHeader title="Popular" onSeeAll={() => router.push('/(tabs)/explore')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll} contentContainerStyle={styles.servicesContent}>
        {POPULAR_SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceChip}
            onPress={() => router.push({ pathname: '/(tabs)/explore', params: { service: service.name } })}
            activeOpacity={0.7}
          >
            <Text style={styles.serviceIcon}>{service.icon}</Text>
            <Text style={styles.serviceName}>{service.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quick actions */}
      <SectionHeader title="Quick Actions" onSeeAll={() => router.push('/(tabs)/profile')} />
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/offers')} activeOpacity={0.8}>
          <Text style={styles.quickActionTitle}>Offers</Text>
          <Text style={styles.quickActionSub}>Active coupons</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
          <Text style={styles.quickActionTitle}>Notifications</Text>
          <Text style={styles.quickActionSub}>Booking updates</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/reviews')} activeOpacity={0.8}>
          <Text style={styles.quickActionTitle}>My Reviews</Text>
          <Text style={styles.quickActionSub}>Rate completed visits</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/help-support')} activeOpacity={0.8}>
          <Text style={styles.quickActionTitle}>Help & Support</Text>
          <Text style={styles.quickActionSub}>FAQ and contact</Text>
        </TouchableOpacity>
      </View>

      {/* Nearby salons */}
      <SectionHeader title="Nearby Salons" onSeeAll={() => router.push('/(tabs)/explore')} />
      <FlatList
        data={salons}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.salonList}
        renderItem={({ item }) => (
          <SalonCard salon={item} onPress={() => router.push(`/salon/${item.id}`)} />
        )}
        ListEmptyComponent={<SalonCardSkeleton />}
      />

      {/* Featured salons */}
      <SectionHeader title="Top Rated" onSeeAll={() => router.push('/(tabs)/explore')} />
      {featured?.map((salon) => (
        <FeaturedSalonCard
          key={salon.id}
          salon={salon}
          onPress={() => router.push(`/salon/${salon.id}`)}
        />
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAll}>See all</Text>
      </TouchableOpacity>
    </View>
  );
}

function SalonCard({ salon, onPress }: { salon: Salon; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.salonCard} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={{ uri: salon.coverImageUrl ?? 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600' }}
        style={styles.salonImage}
        resizeMode="cover"
      />
      <View style={styles.salonInfo}>
        <Text style={styles.salonName} numberOfLines={1}>{salon.name}</Text>
        <View style={styles.ratingRow}>
          <Star size={12} color="#f59e0b" fill="#f59e0b" />
          <Text style={styles.rating}>{salon.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({salon.reviewCount})</Text>
          <Text style={styles.priceRange}> • {'₹'.repeat(salon.priceRange)}</Text>
        </View>
        <View style={styles.locationRow}>
          <MapPin size={11} color="#9ca3af" />
          <Text style={styles.location} numberOfLines={1}>{salon.city}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FeaturedSalonCard({ salon, onPress }: { salon: Salon; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={{ uri: salon.coverImageUrl ?? 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600' }}
        style={styles.featuredImage}
        resizeMode="cover"
      />
      <View style={styles.featuredInfo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.featuredName}>{salon.name}</Text>
          <Text style={styles.featuredCity}>{salon.city}</Text>
        </View>
        <View style={styles.ratingRow}>
          <Star size={13} color="#f59e0b" fill="#f59e0b" />
          <Text style={[styles.rating, { fontSize: 13 }]}>{salon.rating.toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SalonCardSkeleton() {
  return (
    <View style={[styles.salonCard, { backgroundColor: '#f3f4f6' }]}>
      <View style={[styles.salonImage, { backgroundColor: '#e5e7eb' }]} />
      <View style={{ padding: 12, gap: 6 }}>
        <View style={{ height: 12, backgroundColor: '#e5e7eb', borderRadius: 4, width: '80%' }} />
        <View style={{ height: 10, backgroundColor: '#e5e7eb', borderRadius: 4, width: '60%' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subGreeting: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    elevation: 1,
  },
  searchPlaceholder: { color: '#9ca3af', fontSize: 14 },
  upcomingCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#c0142f', borderRadius: 16, padding: 16,
  },
  upcomingLeft: { flex: 1 },
  upcomingLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  upcomingTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  upcomingMeta: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12, marginTop: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#c0142f', fontWeight: '600' },
  servicesScroll: { marginBottom: 20 },
  servicesContent: { paddingHorizontal: 20, gap: 10 },
  serviceChip: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  serviceIcon: { fontSize: 22, marginBottom: 4 },
  serviceName: { fontSize: 12, fontWeight: '500', color: '#374151' },
  quickActionsGrid: { paddingHorizontal: 20, gap: 10, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  quickActionCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  quickActionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  quickActionSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  salonList: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  salonCard: {
    width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  salonImage: { width: '100%', height: 160 },
  salonInfo: { padding: 12 },
  salonName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  rating: { fontSize: 12, fontWeight: '600', color: '#111827' },
  reviewCount: { fontSize: 12, color: '#6b7280' },
  priceRange: { fontSize: 12, color: '#6b7280' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 12, color: '#6b7280', flex: 1 },
  featuredCard: {
    marginHorizontal: 20, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  featuredImage: { width: '100%', height: 180 },
  featuredInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  featuredName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  featuredCity: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
