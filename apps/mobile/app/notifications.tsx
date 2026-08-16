import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function NotificationsScreen() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications', { params: { limit: 50 } })).data?.data ?? [],
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: async () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.heading}>Notifications</Text>
        <TouchableOpacity onPress={() => markAll.mutate()} disabled={markAll.isPending}>
          <Text style={styles.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#c0142f" />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.unreadCard]}
              onPress={() => !item.isRead && markRead.mutate(item.id)}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  markAll: { color: '#c0142f', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', gap: 4 },
  unreadCard: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  title: { fontWeight: '700', color: '#111827' },
  body: { color: '#374151', fontSize: 13 },
  time: { color: '#9ca3af', fontSize: 11, marginTop: 4 },
  empty: { marginTop: 40, textAlign: 'center', color: '#6b7280' },
});
