import React, { useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBusinessSalons } from '@/hooks/use-business-salons';

export default function BusinessOffersScreen() {
  const { activeSalonId } = useBusinessSalons();
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [minAmount, setMinAmount] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [newCustomersOnly, setNewCustomersOnly] = useState(false);
  const [validUntil, setValidUntil] = useState('');

  const coupons = useQuery({
    queryKey: ['mobile-business-coupons', activeSalonId],
    queryFn: async () => (await api.get(`/coupons/salon/${activeSalonId}`)).data,
    enabled: !!activeSalonId,
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/coupons/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-coupons', activeSalonId] }),
  });

  const createCoupon = useMutation({
    mutationFn: async (payload: any) => (await api.post(`/coupons/salon/${activeSalonId}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-coupons', activeSalonId] }),
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => (await api.patch(`/coupons/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-business-coupons', activeSalonId] }),
  });

  const resetForm = () => {
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setCode('');
    setType('PERCENTAGE');
    setValue('');
    setMinAmount('0');
    setMaxDiscount('');
    setUsageLimit('');
    setNewCustomersOnly(false);
    setValidUntil(nextMonth);
  };

  const openCreate = () => {
    setEditingCoupon(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setCode(coupon.code ?? '');
    setType(coupon.type ?? 'PERCENTAGE');
    setValue(String(coupon.value ?? ''));
    setMinAmount(String(coupon.minAmount ?? 0));
    setMaxDiscount(coupon.maxDiscount == null ? '' : String(coupon.maxDiscount));
    setUsageLimit(coupon.usageLimit == null ? '' : String(coupon.usageLimit));
    setNewCustomersOnly(!!coupon.newCustomersOnly);
    setValidUntil(String(coupon.validUntil).slice(0, 10));
    setIsModalOpen(true);
  };

  const saveDisabled = useMemo(
    () => createCoupon.isPending || updateCoupon.isPending,
    [createCoupon.isPending, updateCoupon.isPending],
  );

  const handleSave = async () => {
    const normalizedCode = code.trim().toUpperCase();
    const payload = {
      code: normalizedCode,
      type,
      value: Number(value),
      minAmount: Number(minAmount || 0),
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      newCustomersOnly,
      validFrom: new Date().toISOString(),
      validUntil: new Date(`${validUntil}T23:59:59.000Z`).toISOString(),
    };

    if (!normalizedCode || !Number.isFinite(payload.value) || payload.value <= 0 || !validUntil) {
      return;
    }

    if (editingCoupon) {
      await updateCoupon.mutateAsync({ id: editingCoupon.id, payload });
    } else {
      await createCoupon.mutateAsync(payload);
    }

    setIsModalOpen(false);
    setEditingCoupon(null);
    resetForm();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Offers & Coupons</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={coupons.data ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.value}>{item.type === 'PERCENTAGE' ? `${item.value}% OFF` : `₹${item.value} OFF`}</Text>
                <Text style={styles.meta}>Valid till {new Date(item.validUntil).toLocaleDateString('en-IN')}</Text>
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
        ListEmptyComponent={<Text style={styles.empty}>{coupons.isLoading ? 'Loading offers...' : 'No coupons found.'}</Text>}
      />

      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} disabled={saveDisabled}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput style={styles.input} placeholder="Coupon code" autoCapitalize="characters" value={code} onChangeText={setCode} />

            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeButton, type === 'PERCENTAGE' && styles.typeButtonActive]} onPress={() => setType('PERCENTAGE')}>
                <Text style={[styles.typeButtonText, type === 'PERCENTAGE' && styles.typeButtonTextActive]}>Percentage</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeButton, type === 'FIXED' && styles.typeButtonActive]} onPress={() => setType('FIXED')}>
                <Text style={[styles.typeButtonText, type === 'FIXED' && styles.typeButtonTextActive]}>Fixed</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Discount value" keyboardType="numeric" value={value} onChangeText={setValue} />
            <TextInput style={styles.input} placeholder="Minimum order amount" keyboardType="numeric" value={minAmount} onChangeText={setMinAmount} />
            <TextInput style={styles.input} placeholder="Maximum discount" keyboardType="numeric" value={maxDiscount} onChangeText={setMaxDiscount} />
            <TextInput style={styles.input} placeholder="Usage limit" keyboardType="numeric" value={usageLimit} onChangeText={setUsageLimit} />
            <TextInput style={styles.input} placeholder="Valid until (YYYY-MM-DD)" value={validUntil} onChangeText={setValidUntil} />

            <TouchableOpacity style={[styles.toggleRow, newCustomersOnly && styles.toggleRowActive]} onPress={() => setNewCustomersOnly((prev) => !prev)}>
              <Text style={[styles.toggleRowText, newCustomersOnly && styles.toggleRowTextActive]}>New customers only</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.primaryButton, saveDisabled && styles.disabledButton]} disabled={saveDisabled} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>{saveDisabled ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}</Text>
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
  code: { fontSize: 15, fontWeight: '800', color: '#9f1239' },
  value: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 3 },
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
  typeRow: { flexDirection: 'row', gap: 10 },
  typeButton: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center', paddingVertical: 12 },
  typeButtonActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  typeButtonText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  typeButtonTextActive: { color: '#9f1239', fontWeight: '700' },
  toggleRow: { borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12 },
  toggleRowActive: { borderColor: '#c0142f', backgroundColor: '#fff1f2' },
  toggleRowText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  toggleRowTextActive: { color: '#9f1239', fontWeight: '700' },
  primaryButton: { backgroundColor: '#c0142f', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
});
