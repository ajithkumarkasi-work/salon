import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';

function nextDays(days: number) {
  return Array.from({ length: days }, (_, index) => addDays(new Date(), index));
}

export default function BusinessCalendarScreen() {
  const { activeSalonId } = useBusinessSalons();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const days = useMemo(() => nextDays(7), []);

  const calendar = useQuery({
    queryKey: ['mobile-business-calendar', activeSalonId, selectedDate],
    queryFn: async () => (await api.get('/appointments/calendar', {
      params: {
        salonId: activeSalonId,
        startDate: `${selectedDate}T00:00:00`,
        endDate: `${selectedDate}T23:59:59`,
      },
    })).data,
    enabled: !!activeSalonId,
  });

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
        {days.map((day) => {
          const value = format(day, 'yyyy-MM-dd');
          const selected = value === selectedDate;
          return (
            <TouchableOpacity key={value} style={[styles.dayChip, selected && styles.dayChipActive]} onPress={() => setSelectedDate(value)}>
              <Text style={[styles.dayChipLabel, selected && styles.dayChipLabelActive]}>{format(day, 'EEE')}</Text>
              <Text style={[styles.dayChipDate, selected && styles.dayChipLabelActive]}>{format(day, 'dd')}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {calendar.isLoading ? (
          <ActivityIndicator color="#c0142f" style={{ marginTop: 40 }} />
        ) : !(calendar.data?.length) ? (
          <Text style={styles.empty}>No appointments for this date.</Text>
        ) : (
          calendar.data.map((item: any) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.customer?.firstName} {item.customer?.lastName}</Text>
                <Text style={styles.time}>{format(new Date(item.startTime), 'hh:mm a')}</Text>
              </View>
              <Text style={styles.meta}>{item.service?.name}</Text>
              <Text style={styles.meta}>Staff: {item.staff?.user?.firstName} {item.staff?.user?.lastName}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  daysRow: { gap: 10, padding: 16 },
  dayChip: { width: 64, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center', paddingVertical: 10 },
  dayChipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  dayChipLabel: { fontSize: 12, color: '#6b7280' },
  dayChipDate: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 2 },
  dayChipLabelActive: { color: '#9f1239' },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  time: { fontSize: 13, fontWeight: '800', color: '#c0142f' },
  meta: { fontSize: 12, color: '#6b7280' },
});
