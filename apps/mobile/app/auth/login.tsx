import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@glowbook/shared-types';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      const isBusinessRole = [UserRole.ADMIN, UserRole.SALON_OWNER, UserRole.STAFF].includes(data.user.role);
      router.replace(isBusinessRole ? '/(business-tabs)' : '/(tabs)');
    },
    onError: (err: any) => {
      Alert.alert('Login failed', err?.response?.data?.message ?? 'Please check your credentials.');
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.btn} onPress={() => login.mutate()} disabled={login.isPending}>
        <Text style={styles.btnText}>{login.isPending ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>Demo accounts</Text>
        <Text style={styles.demoItem}>Customer: customer@glowbook.demo / GlowBook2024</Text>
        <Text style={styles.demoItem}>Customer 2: customer2@glowbook.demo / GlowBook2024</Text>
        <Text style={styles.demoItem}>Owner: owner@glowbook.demo / GlowBook2024</Text>
        <Text style={styles.demoItem}>Staff: staff@glowbook.demo / GlowBook2024</Text>
        <Text style={styles.demoItem}>Admin: admin@glowbook.demo / GlowBook2024</Text>
      </View>

      <TouchableOpacity onPress={() => router.push('/auth/register')}>
        <Text style={styles.link}>Create account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20, justifyContent: 'center', gap: 10 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  btn: { backgroundColor: '#c0142f', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  demoCard: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12, gap: 4 },
  demoTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  demoItem: { fontSize: 12, color: '#374151' },
  link: { color: '#c0142f', fontWeight: '600', textAlign: 'center', marginTop: 6 },
});
