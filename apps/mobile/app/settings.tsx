import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}>
      <Text style={styles.heading}>Profile & Settings</Text>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/edit-profile' as any)}>
        <Text style={styles.itemTitle}>Personal Info</Text>
        <Text style={styles.itemSub}>Name, email, phone, avatar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/edit-profile?section=password' as any)}>
        <Text style={styles.itemTitle}>Password</Text>
        <Text style={styles.itemSub}>Change your password</Text>
      </TouchableOpacity>

      <View style={styles.item}>
        <Text style={styles.itemTitle}>Preferences</Text>
        <Text style={styles.itemSub}>Notification and communication preferences coming soon.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  item: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', gap: 3 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemSub: { color: '#6b7280', fontSize: 13 },
});
