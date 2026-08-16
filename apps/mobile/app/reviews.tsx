import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ReviewsScreen() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { rating: string; comment: string }>>({});

  const { data } = useQuery({
    queryKey: ['appointments', 'completed-for-review'],
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: { status: 'COMPLETED', limit: 50 } });
      return data?.data ?? [];
    },
  });

  const submitReview = useMutation({
    mutationFn: async ({ appointmentId, rating, comment }: { appointmentId: string; rating: number; comment: string }) => {
      await api.post(`/appointments/${appointmentId}/review`, { rating, comment: comment || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'completed-for-review'] });
      Alert.alert('Thanks!', 'Your review was submitted.');
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Reviews & Ratings</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        renderItem={({ item }: { item: any }) => {
          const draft = drafts[item.id] ?? { rating: '5', comment: '' };
          const alreadyReviewed = !!item.review;
          return (
            <View style={styles.card}>
              <Text style={styles.title}>{item.salon?.name}</Text>
              <Text style={styles.meta}>{item.service?.name}</Text>
              {alreadyReviewed ? (
                <Text style={styles.done}>Reviewed: {item.review.rating}/5</Text>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Rating 1-5"
                    value={draft.rating}
                    onChangeText={(v) => setDrafts((prev) => ({ ...prev, [item.id]: { ...draft, rating: v } }))}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Comment (optional)"
                    value={draft.comment}
                    onChangeText={(v) => setDrafts((prev) => ({ ...prev, [item.id]: { ...draft, comment: v } }))}
                  />
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() =>
                      submitReview.mutate({
                        appointmentId: item.id,
                        rating: Math.max(1, Math.min(5, Number(draft.rating) || 5)),
                        comment: draft.comment,
                      })
                    }
                    disabled={submitReview.isPending}
                  >
                    <Text style={styles.btnText}>Submit review</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No completed appointments to review.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', gap: 8 },
  title: { fontWeight: '700', color: '#111827' },
  meta: { color: '#6b7280', fontSize: 12 },
  done: { color: '#15803d', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
  },
  btn: { backgroundColor: '#c0142f', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  empty: { marginTop: 40, textAlign: 'center', color: '#6b7280' },
});
