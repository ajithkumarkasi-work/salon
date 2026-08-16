import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';

const FAQS = [
  {
    q: 'How do I cancel an appointment?',
    a: 'Open My Bookings, select the appointment, and tap Cancel if it is still eligible.',
  },
  {
    q: 'How are refunds handled?',
    a: 'Refund timelines depend on payment method and salon policy. Contact support for escalation.',
  },
  {
    q: 'How do coupon codes work?',
    a: 'Apply coupons during booking. Some offers are salon-specific or first-time only.',
  },
];

export default function HelpSupportScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
      <Text style={styles.heading}>Help & Support</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact</Text>
        <TouchableOpacity onPress={() => Linking.openURL('tel:+18001234567')}>
          <Text style={styles.link}>Call: +1 800 123 4567</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:support@glowbook.app')}>
          <Text style={styles.link}>Email: support@glowbook.app</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>FAQ</Text>
        {FAQS.map((faq) => (
          <View key={faq.q} style={styles.faqRow}>
            <Text style={styles.question}>{faq.q}</Text>
            <Text style={styles.answer}>{faq.a}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Policies</Text>
        <Text style={styles.answer}>Cancellation policy: cancellations are allowed before the appointment start time.</Text>
        <Text style={styles.answer}>No-show policy: repeated no-shows may affect future slot access.</Text>
        <Text style={styles.answer}>Refund policy: payment refunds are processed per salon and provider terms.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  link: { color: '#c0142f', fontWeight: '600' },
  faqRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  question: { fontWeight: '700', color: '#111827' },
  answer: { color: '#4b5563', fontSize: 13, marginTop: 2 },
});
