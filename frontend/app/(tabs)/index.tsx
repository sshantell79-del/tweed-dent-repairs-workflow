import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { dashboardAPI, jobsAPI } from '../../src/services/api';
import { DashboardStats, Job, JOB_STATUSES, STATUS_COLORS } from '../../src/types';
import { useAuth } from '../../src/contexts/AuthContext';

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    try {
      const [statsData, jobsData] = await Promise.all([
        dashboardAPI.getStats(),
        jobsAPI.getAll(),
      ]);
      setStats(statsData);
      setRecentJobs(jobsData.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user?.username || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={{fontSize: 20}}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickCreateButton}
            onPress={() => router.push('/(tabs)/add')}
          >
            <Text style={styles.quickCreateIcon}>+</Text>
            <Text style={styles.quickCreateText}>Quick Create Job</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <View style={styles.statIcon}>
              <Text style={{fontSize: 20}}>🚗</Text>
            </View>
            <Text style={styles.statValue}>{stats?.total_jobs || 0}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Text style={{fontSize: 20}}>🔧</Text>
            </View>
            <Text style={styles.statValueDark}>{stats?.active_jobs || 0}</Text>
            <Text style={styles.statLabelDark}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Text style={{fontSize: 20}}>✅</Text>
            </View>
            <Text style={styles.statValueDark}>{stats?.completed_jobs || 0}</Text>
            <Text style={styles.statLabelDark}>Completed</Text>
          </View>
        </View>

        <View style={styles.revenueCard}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.revenueRow}>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Pending</Text>
              <Text style={styles.revenueValue}>
                ${(stats?.pending_revenue || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Completed</Text>
              <Text style={styles.revenueValue}>
                ${(stats?.completed_revenue || 0).toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.totalRevenueRow}>
            <Text style={styles.totalRevenueLabel}>Total Estimated:</Text>
            <Text style={styles.totalRevenueValue}>
              ${(stats?.total_estimated_revenue || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Jobs by Status</Text>
          <View style={styles.statusGrid}>
            {JOB_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.statusItem}
                onPress={() => router.push({ pathname: '/(tabs)/jobs', params: { filter: status } })}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUS_COLORS[status] },
                  ]}
                />
                <Text style={styles.statusLabel} numberOfLines={1}>{status}</Text>
                <Text style={styles.statusCount}>
                  {stats?.status_breakdown?.[status] || 0}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{fontSize: 36}}>🚗</Text>
              <Text style={styles.emptyText}>No jobs yet</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/(tabs)/add')}
              >
                <Text style={styles.addButtonText}>Add First Job</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.recentJob}
                onPress={() => router.push(`/job/${job.id}`)}
              >
                <View style={styles.recentJobLeft}>
                  <Text style={styles.recentJobRego}>{job.car_info.registration}</Text>
                  <Text style={styles.recentJobCar}>
                    {job.car_info.make} {job.car_info.model}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[job.status] + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: STATUS_COLORS[job.status] },
                    ]}
                  >
                    {job.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quickCreateIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryCard: {
    backgroundColor: '#3B82F6',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statValueDark: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabelDark: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  revenueCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  revenueRow: {
    flexDirection: 'row',
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  revenueLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
  },
  totalRevenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalRevenueLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  totalRevenueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statusGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recentJob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentJobLeft: {
    flex: 1,
  },
  recentJobRego: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  recentJobCar: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
