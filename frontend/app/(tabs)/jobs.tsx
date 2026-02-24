import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { jobsAPI } from '../../src/services/api';
import { Job, JOB_STATUSES, STATUS_COLORS } from '../../src/types';
import JobCard from '../../src/components/JobCard';

export default function JobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.filter) {
      setSelectedStatus(params.filter as string);
    }
  }, [params.filter]);

  const loadJobs = async () => {
    try {
      const data = await jobsAPI.getAll();
      setJobs(data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [])
  );

  useEffect(() => {
    let filtered = jobs;

    if (selectedStatus !== 'All') {
      filtered = filtered.filter((job) => job.status === selectedStatus);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.car_info.registration.toLowerCase().includes(searchLower) ||
          job.car_info.make.toLowerCase().includes(searchLower) ||
          job.car_info.model.toLowerCase().includes(searchLower) ||
          job.owner_info.name.toLowerCase().includes(searchLower) ||
          job.owner_info.phone.includes(search)
      );
    }

    setFilteredJobs(filtered);
  }, [jobs, selectedStatus, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const renderStatusFilter = () => (
    <FlatList
      horizontal
      data={['All', ...JOB_STATUSES]}
      keyExtractor={(item) => item}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterContainer}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedStatus === item && styles.filterChipActive,
            item !== 'All' && { borderColor: STATUS_COLORS[item] + '40' },
            selectedStatus === item && item !== 'All' && { backgroundColor: STATUS_COLORS[item] + '20' },
          ]}
          onPress={() => setSelectedStatus(item)}
        >
          {item !== 'All' && (
            <View
              style={[
                styles.filterDot,
                { backgroundColor: STATUS_COLORS[item] },
              ]}
            />
          )}
          <Text
            style={[
              styles.filterText,
              selectedStatus === item && styles.filterTextActive,
              selectedStatus === item && item !== 'All' && { color: STATUS_COLORS[item] },
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

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
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <Text style={styles.subtitle}>{filteredJobs.length} jobs found</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by rego, make, owner..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{fontSize: 16, color: "#9CA3AF"}}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {renderStatusFilter()}

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => router.push(`/job/${item.id}`)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{fontSize: 48}}>🚗</Text>
            <Text style={styles.emptyTitle}>No jobs found</Text>
            <Text style={styles.emptyText}>
              {search || selectedStatus !== 'All'
                ? 'Try adjusting your filters'
                : 'Add your first job to get started'}
            </Text>
          </View>
        }
      />
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
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
