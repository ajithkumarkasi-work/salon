import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, CalendarDays, CreditCard, Bell, Heart, Star, LogOut, ChevronRight, Settings
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { getInitials } from '@/lib/utils';

const MENU_ITEMS = [
  { icon: CalendarDays, label: 'My Bookings', route: '/(tabs)/bookings' },
  { icon: Star, label: 'Offers & Coupons', route: '/offers' },
  { icon: Heart, label: 'Favorites', route: '/(tabs)/favorites' },
  { icon: CreditCard, label: 'Payment History', route: '/payment-history' },
  { icon: Star, label: 'My Reviews', route: '/reviews' },
  { icon: Bell, label: 'Notifications', route: '/notifications' },
  { icon: Bell, label: 'Help & Support', route: '/help-support' },
  { icon: Settings, label: 'Settings', route: '/settings' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshToken, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try { await api.post('/auth/logout', { refreshToken }); } catch {}
          logout();
          router.replace('/auth/login' as any);
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <User size={48} color="#c0142f" />
        <Text style={styles.authTitle}>Sign in to GlowBook</Text>
        <Text style={styles.authSub}>Book appointments, save favorites, and more</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/auth/register' as any)}>
          <Text style={styles.registerText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user.firstName, user.lastName)}</Text>
        </View>
        <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile' as any)}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {MENU_ITEMS.map(({ icon: Icon, label, route }) => (
          <TouchableOpacity
            key={route}
            style={styles.menuItem}
            onPress={() => router.push(route as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Icon size={18} color="#c0142f" />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <LogOut size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { alignItems: 'center', padding: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#c0142f20', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#c0142f' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  editBtn: {
    marginTop: 12, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#c0142f',
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#c0142f' },
  menu: { margin: 16, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  menuIcon: { width: 36, height: 36, backgroundColor: '#fef2f2', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, color: '#ef4444', fontWeight: '600' },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  authTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  authSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  signInBtn: { backgroundColor: '#c0142f', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginBottom: 12 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerText: { fontSize: 14, color: '#c0142f', fontWeight: '600' },
});
