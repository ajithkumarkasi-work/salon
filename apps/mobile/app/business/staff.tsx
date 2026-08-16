import React, { useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';

export default function BusinessStaffScreen() {
  const { activeSalonId } = useBusinessSalons();
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Stylist');
  const [bio, setBio] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const staff = useQuery({
    queryKey: ['mobile-business-staff', activeSalonId],
    queryFn: async () => (await api.get(`/salons/${activeSalonId}/staff`)).data,
    enabled: !!activeSalonId,
  });

  const services = useQuery({
    queryKey: ['mobile-business-services-for-staff', activeSalonId],
    queryFn: async () => (await api.get(`/salons/${activeSalonId}/services`)).data,
    enabled: !!activeSalonId,
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/staff/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-staff', activeSalonId] }),
  });

  const createStaff = useMutation({
    mutationFn: async (payload: any) => (await api.post(`/salons/${activeSalonId}/staff`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-staff', activeSalonId] }),
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => (await api.patch(`/staff/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-staff', activeSalonId] }),
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('Stylist');
    setBio('');
    setSelectedServiceIds([]);
  };

  const openCreate = () => {
    setEditingStaff(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (member: any) => {
    setEditingStaff(member);
    setFirstName(member.user?.firstName ?? '');
    setLastName(member.user?.lastName ?? '');
    setEmail(member.user?.email ?? '');
    setPhone(member.user?.phone ?? '');
    setRole(member.role ?? 'Stylist');
    setBio(member.bio ?? '');
    setSelectedServiceIds((member.services ?? []).map((service: any) => service.service?.id).filter(Boolean));
    setIsModalOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]);
  };

  const saveDisabled = useMemo(
    () => createStaff.isPending || updateStaff.isPending,
    [createStaff.isPending, updateStaff.isPending],
  );

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || selectedServiceIds.length === 0) {
      return;
    }

    if (editingStaff) {
      await updateStaff.mutateAsync({
        id: editingStaff.id,
        payload: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role: role.trim() || undefined,
          bio: bio.trim() || undefined,
          serviceIds: selectedServiceIds,
        },
      });
    } else {
      if (!password.trim()) return;
      await createStaff.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        phone: phone.trim() || undefined,
        role: role.trim() || 'Stylist',
        bio: bio.trim() || undefined,
        serviceIds: selectedServiceIds,
      });
    }

    setIsModalOpen(false);
    setEditingStaff(null);
    resetForm();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Staff</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff.data ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.user?.firstName} {item.user?.lastName}</Text>
                <Text style={styles.meta}>{item.role}</Text>
                <Text style={styles.meta}>Services: {(item.services ?? []).map((service: any) => service.service?.name).filter(Boolean).join(', ') || 'None'}</Text>
              </View>
              <View style={styles.actionsCol}>
                <TouchableOpacity style={styles.secondaryAction} onPress={() => openEdit(item)}>
                  <Text style={styles.secondaryActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => deactivate.mutate(item.id)} disabled={deactivate.isPending}>
                  <Text style={styles.actionText}>Deactivate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{staff.isLoading ? 'Loading staff...' : 'No staff members found.'}</Text>}
      />

      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingStaff ? 'Edit Staff' : 'Add Staff'}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} disabled={saveDisabled}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
            <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
            <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
            {!editingStaff && (
              <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
            )}
            <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} />
            <TextInput style={styles.input} placeholder="Role" value={role} onChangeText={setRole} />
            <TextInput style={styles.input} placeholder="Bio" value={bio} onChangeText={setBio} />

            <Text style={styles.sectionLabel}>Assigned services</Text>
            <View style={styles.serviceChipsWrap}>
              {(services.data ?? []).map((service: any) => {
                const active = selectedServiceIds.includes(service.id);
                return (
                  <TouchableOpacity key={service.id} style={[styles.serviceChip, active && styles.serviceChipActive]} onPress={() => toggleService(service.id)}>
                    <Text style={[styles.serviceChipText, active && styles.serviceChipTextActive]}>{service.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.primaryButton, saveDisabled && styles.disabledButton]} disabled={saveDisabled} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>{saveDisabled ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  addButton: { borderRadius: 999, backgroundColor: '#c0142f', paddingHorizontal: 14, paddingVertical: 10 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  list: { padding: 16, gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  actionsCol: { gap: 8, alignItems: 'flex-end' },
  secondaryAction: { alignSelf: 'center', borderRadius: 999, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8 },
  secondaryActionText: { color: '#374151', fontWeight: '700', fontSize: 12 },
  action: { alignSelf: 'center', borderRadius: 999, backgroundColor: '#fff1f2', paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { color: '#9f1239', fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  modalContainer: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  closeText: { color: '#c0142f', fontWeight: '700' },
  modalContent: { padding: 16, gap: 12, paddingBottom: 30 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#111827' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  serviceChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  serviceChipActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  serviceChipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  serviceChipTextActive: { color: '#9f1239', fontWeight: '700' },
  primaryButton: { backgroundColor: '#c0142f', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
});
