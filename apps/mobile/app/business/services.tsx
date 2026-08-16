import React, { useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';

export default function BusinessServicesScreen() {
  const { activeSalonId } = useBusinessSalons();
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [bufferTime, setBufferTime] = useState('0');

  const services = useQuery({
    queryKey: ['mobile-business-services', activeSalonId],
    queryFn: async () => (await api.get(`/salons/${activeSalonId}/services`)).data,
    enabled: !!activeSalonId,
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/services/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-services', activeSalonId] }),
  });

  const createService = useMutation({
    mutationFn: async (payload: any) => (await api.post(`/salons/${activeSalonId}/services`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-services', activeSalonId] }),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => (await api.patch(`/services/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-services', activeSalonId] }),
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setDuration('60');
    setBufferTime('0');
  };

  const openCreate = () => {
    setEditingService(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (service: any) => {
    setEditingService(service);
    setName(service.name ?? '');
    setDescription(service.description ?? '');
    setPrice(String(service.price ?? ''));
    setDuration(String(service.duration ?? 60));
    setBufferTime(String(service.bufferTime ?? 0));
    setIsModalOpen(true);
  };

  const saveDisabled = useMemo(
    () => createService.isPending || updateService.isPending,
    [createService.isPending, updateService.isPending],
  );

  const handleSave = async () => {
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: Number(price),
      duration: Number(duration),
      bufferTime: Number(bufferTime || 0),
      displayOrder: editingService?.displayOrder ?? (services.data?.length ?? 0),
    };

    if (!payload.name || !Number.isFinite(payload.price) || payload.price <= 0 || !Number.isFinite(payload.duration) || payload.duration < 5) {
      return;
    }

    if (editingService) {
      await updateService.mutateAsync({ id: editingService.id, payload });
    } else {
      await createService.mutateAsync(payload);
    }

    setIsModalOpen(false);
    setEditingService(null);
    resetForm();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Services</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={services.data ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.duration} min • ₹{Number(item.price ?? 0).toLocaleString('en-IN')}</Text>
                {!!item.description && <Text style={styles.description}>{item.description}</Text>}
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
        ListEmptyComponent={<Text style={styles.empty}>{services.isLoading ? 'Loading services...' : 'No services found.'}</Text>}
      />

      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingService ? 'Edit Service' : 'Add Service'}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} disabled={saveDisabled}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput style={styles.input} placeholder="Service name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Description (optional)" value={description} onChangeText={setDescription} />
            <TextInput style={styles.input} placeholder="Price" keyboardType="numeric" value={price} onChangeText={setPrice} />
            <TextInput style={styles.input} placeholder="Duration in minutes" keyboardType="numeric" value={duration} onChangeText={setDuration} />
            <TextInput style={styles.input} placeholder="Buffer time" keyboardType="numeric" value={bufferTime} onChangeText={setBufferTime} />

            <TouchableOpacity style={[styles.primaryButton, saveDisabled && styles.disabledButton]} disabled={saveDisabled} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>{saveDisabled ? 'Saving...' : editingService ? 'Save Changes' : 'Create Service'}</Text>
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
  description: { fontSize: 12, color: '#6b7280', marginTop: 8 },
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
  primaryButton: { backgroundColor: '#c0142f', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
});

