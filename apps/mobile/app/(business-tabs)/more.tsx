import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusinessSalons } from '@/hooks/use-business-salons';

const LINKS = [
  { label: 'Services', route: '/business/services' },
  { label: 'Staff', route: '/business/staff' },
  { label: 'Offers & Coupons', route: '/business/offers' },
  { label: 'Payments', route: '/business/payments' },
  { label: 'Analytics', route: '/business/analytics' },
  { label: 'Reviews', route: '/business/reviews' },
  { label: 'Settings', route: '/settings' },
];

export default function BusinessMoreScreen() {
  const router = useRouter();
  const { salons, activeSalonId, setActiveSalonId } = useBusinessSalons();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Business Tools</Text>
      <Text style={styles.subtitle}>Switch salon and open management sections.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {salons.map((salon: any) => {
          const selected = salon.id === activeSalonId;
          return (
            <TouchableOpacity key={salon.id} style={[styles.chip, selected && styles.chipActive]} onPress={() => setActiveSalonId(salon.id)}>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{salon.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.menuList}>
        {LINKS.map((item) => (
          <TouchableOpacity key={item.route} style={styles.menuCard} onPress={() => router.push(item.route as any)}>
            <Text style={styles.menuTitle}>{item.label}</Text>
            <Text style={styles.menuArrow}>Open</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  chipsRow: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#9f1239', fontWeight: '700' },
  menuList: { gap: 10 },
  menuCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 16 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  menuArrow: { fontSize: 13, fontWeight: '700', color: '#c0142f' },
});