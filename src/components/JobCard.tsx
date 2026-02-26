import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '../types';
import StatusBadge from './StatusBadge';
import { format } from 'date-fns';

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

export default function JobCard({ job, onPress }: JobCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.carInfo}>
          <Text style={styles.registration}>{job.car_info.registration}</Text>
          <Text style={styles.carDetails}>
            {job.car_info.year} {job.car_info.make} {job.car_info.model}
          </Text>
        </View>
        <StatusBadge status={job.status} size="small" />
      </View>

      <View style={styles.ownerRow}>
        <Ionicons name="person-outline" size={16} color="#6B7280" />
        <Text style={styles.ownerName}>{job.owner_info.name}</Text>
        <Ionicons name="call-outline" size={16} color="#6B7280" style={styles.phoneIcon} />
        <Text style={styles.phone}>{job.owner_info.phone}</Text>
      </View>

      <Text style={styles.damage} numberOfLines={2}>
        {job.damage_description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
          <Text style={styles.date}>
            {format(new Date(job.created_at), 'dd MMM yyyy')}
          </Text>
        </View>
        {job.estimated_cost && (
          <Text style={styles.cost}>${job.estimated_cost.toLocaleString()}</Text>
        )}
      </View>

      {job.photos.length > 0 && (
        <View style={styles.photoBadge}>
          <Ionicons name="camera" size={12} color="#6B7280" />
          <Text style={styles.photoCount}>{job.photos.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  carInfo: {
    flex: 1,
  },
  registration: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 1,
  },
  carDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ownerName: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
  },
  phoneIcon: {
    marginLeft: 16,
  },
  phone: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
  },
  damage: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  cost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  photoBadge: {
    position: 'absolute',
    top: 12,
    right: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCount: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
});
