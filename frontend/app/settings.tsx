import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  const goBack = () => {
    console.log('Back pressed');
    router.push('/(tabs)/profile');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. You will not lose any saved jobs or quotes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable 
          onPress={goBack} 
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Settings */}
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>💾</Text>
              <Text style={styles.settingLabel}>Auto-save Drafts</Text>
            </View>
            <Switch
              value={autoSave}
              onValueChange={setAutoSave}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🌙</Text>
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Business Settings */}
        <Text style={styles.sectionTitle}>Business Settings</Text>
        <View style={styles.section}>
          <Pressable 
            style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
            onPress={() => Alert.alert('Business Details', 'Tweed Dent Repairs\n\nPhone: 0419 942 817\n\nAddress:\n7/63 Ourimba Road\nTweed Heads NSW 2485\n\nABN: 15 432 425 498', [{ text: 'OK' }])}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🏢</Text>
              <Text style={styles.settingLabel}>Business Details</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
            onPress={() => Alert.alert('Panel Pricing', 'Panel pricing categories:\n\nCat 1: Light damage\nCat 2: Minor damage\nCat 3: Moderate damage\nCat 4: Heavy damage\nCat 5: Manual quote\n\nPrices are set per panel in the Quotes section.', [{ text: 'OK' }])}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🏷️</Text>
              <Text style={styles.settingLabel}>Panel Pricing</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
            onPress={() => Alert.alert('Invoice Settings', 'Default Terms: Due on receipt\nGST Rate: 10%\nCurrency: AUD\n\nInvoices can be synced to Xero from the Profile screen.', [{ text: 'OK' }])}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🧾</Text>
              <Text style={styles.settingLabel}>Invoice Settings</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Data */}
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.section}>
          <Pressable style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]} onPress={handleClearCache}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🗑️</Text>
              <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Clear Cache</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Business</Text>
            <Text style={styles.infoValue}>Tweed Dent Repairs</Text>
          </View>
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
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
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
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingLabel: {
    fontSize: 15,
    color: '#374151',
  },
  chevron: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 15,
    color: '#374151',
  },
  infoValue: {
    fontSize: 15,
    color: '#6B7280',
  },
});
