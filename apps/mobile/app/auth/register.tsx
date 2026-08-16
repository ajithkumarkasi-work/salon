import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const register = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      router.replace('/(tabs)');
    },
    onError: (err: any) => {
      Alert.alert('Registration failed', err?.response?.data?.message ?? 'Please try again.');
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Phone (optional)" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.btn} onPress={() => register.mutate()} disabled={register.isPending}>
        <Text style={styles.btnText}>{register.isPending ? 'Creating...' : 'Create Account'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/auth/login')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20, justifyContent: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  btn: { backgroundColor: '#c0142f', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { color: '#c0142f', fontWeight: '600', textAlign: 'center', marginTop: 6 },
});
