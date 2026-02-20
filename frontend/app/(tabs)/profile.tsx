import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { xeroAPI } from '../../src/services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [xeroStatus, setXeroStatus] = useState<{connected: boolean; tenant_name?: string} | null>(null);
  const [xeroLoading, setXeroLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkXeroStatus();
  }, []);

  const checkXeroStatus = async () => {
    try {
      const status = await xeroAPI.getStatus();
      setXeroStatus(status);
    } catch (error) {
      setXeroStatus({ connected: false });
    } finally {
      setXeroLoading(false);
    }
  };

  const handleConnectXero = async () => {
    setConnecting(true);
    try {
      const response = await xeroAPI.getAuthUrl();
      // Open the Xero auth URL in the browser
      await Linking.openURL(response.auth_url);
      // After returning, check status again
      setTimeout(() => {
        checkXeroStatus();
        setConnecting(false);
      }, 5000);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to connect to Xero');
      setConnecting(false);
    }
  };

  const handleDisconnectXero = async () => {
    Alert.alert(
      'Disconnect Xero',
      'Are you sure you want to disconnect from Xero?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await xeroAPI.disconnect();
              setXeroStatus({ connected: false });
              Alert.alert('Success', 'Disconnected from Xero');
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/invoices')}>
          <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="document-text-outline" size={20} color="#10B981" />
          </View>
          <Text style={styles.menuText}>Invoices</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Xero Integration */}
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={xeroStatus?.connected ? handleDisconnectXero : handleConnectXero}
          disabled={connecting || xeroLoading}
        >
          <View style={[styles.menuIcon, { backgroundColor: xeroStatus?.connected ? '#DCFCE7' : '#F0F9FF' }]}>
            {xeroLoading || connecting ? (
              <ActivityIndicator size="small" color="#0D9488" />
            ) : (
              <Ionicons 
                name={xeroStatus?.connected ? "checkmark-circle" : "cloud-upload-outline"} 
                size={20} 
                color={xeroStatus?.connected ? "#10B981" : "#0D9488"} 
              />
            )}
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuText}>
              {xeroStatus?.connected ? 'Xero Connected' : 'Connect Xero'}
            </Text>
            {xeroStatus?.connected && xeroStatus.tenant_name && (
              <Text style={styles.menuSubtext}>{xeroStatus.tenant_name}</Text>
            )}
          </View>
          {xeroStatus?.connected ? (
            <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="settings-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="help-circle-outline" size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
