import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export default function EditProfileScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { user, accessToken, refreshToken, setAuth } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      return data;
    },
    onSuccess: (updatedUser) => {
      if (accessToken && refreshToken) {
        setAuth(updatedUser, accessToken, refreshToken);
      }
      Alert.alert('Saved', 'Profile updated successfully.');
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Updated', 'Password changed successfully.');
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
      <Text style={styles.heading}>Edit Profile</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Info</Text>
        <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
        <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
        <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} />
        <TouchableOpacity style={styles.primaryBtn} onPress={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
          <Text style={styles.primaryBtnText}>{saveProfile.isPending ? 'Saving...' : 'Save profile'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="New password"
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={() => changePassword.mutate()} disabled={changePassword.isPending}>
          <Text style={styles.primaryBtnText}>{changePassword.isPending ? 'Updating...' : 'Change password'}</Text>
        </TouchableOpacity>
      </View>

      {section === 'password' && <Text style={styles.note}>You opened this screen from Password settings.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
  },
  primaryBtn: { backgroundColor: '#c0142f', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  note: { color: '#6b7280', fontSize: 12, textAlign: 'center' },
});
