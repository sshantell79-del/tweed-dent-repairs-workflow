import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HelpScreen() {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const faqs = [
    {
      question: 'How do I create a new job?',
      answer: 'Tap the + button in the bottom navigation, fill in the vehicle and customer details, then tap "Create Job" or "Quick Create" for faster entry.',
    },
    {
      question: 'How do I scan a vehicle plate?',
      answer: 'When creating a job, tap "Scan Vehicle" to take a photo of the number plate. The app will automatically detect the registration and fill in vehicle details.',
    },
    {
      question: 'How do I create a quote?',
      answer: 'Go to Profile > Quotes > tap +. Take photos of the damage and the AI will identify damaged panels. Select the category (1-5) for each panel to set the price.',
    },
    {
      question: 'How do I create an invoice?',
      answer: 'Open a job and tap "Create Invoice" at the bottom. The invoice will be generated with line items based on the job estimate.',
    },
    {
      question: 'How do I connect to Xero?',
      answer: 'Go to Profile > Connect Xero. You\'ll be redirected to Xero to authorize the connection. Once connected, you can sync invoices directly.',
    },
  ];

  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} data-testid="help-back-btn">
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactCard}>
          <TouchableOpacity style={styles.contactOption} onPress={() => Linking.openURL('tel:+61400000000')}>
            <View style={[styles.contactIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="call" size={22} color="#10B981" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Phone Support</Text>
              <Text style={styles.contactValue}>Call us anytime</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactOption} onPress={() => Linking.openURL('mailto:support@tweeddentrepairs.com.au')}>
            <View style={[styles.contactIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="mail" size={22} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@tweeddentrepairs.com.au</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqContainer}>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6B7280"
                />
              </View>
              {expandedFaq === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.appName}>Tweed Dent Repairs</Text>
          <Text style={styles.appSubtitle}>Work Flow App</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 20,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  contactValue: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  faqContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  faqItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 20,
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  appVersion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
