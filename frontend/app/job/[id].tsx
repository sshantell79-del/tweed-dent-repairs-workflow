import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { jobsAPI, invoicesAPI } from '../../src/services/api';
import { Job, JOB_STATUSES, STATUS_COLORS } from '../../src/types';
import StatusBadge from '../../src/components/StatusBadge';
import { format } from 'date-fns';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const data = await jobsAPI.getOne(id as string);
      setJob(data);
    } catch (error) {
      console.error('Failed to load job:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    setUpdatingStatus(true);
    try {
      const updated = await jobsAPI.updateStatus(job.id, newStatus);
      setJob(updated);
      setStatusModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64 && job) {
      try {
        const updated = await jobsAPI.addPhoto(job.id, result.assets[0].base64);
        setJob(updated);
      } catch (error) {
        Alert.alert('Error', 'Failed to add photo');
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!job) return;
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await jobsAPI.deletePhoto(job.id, photoId);
              setJob(updated);
              setPhotoModalVisible(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const handleCreateInvoice = async () => {
    if (!job) return;
    setCreatingInvoice(true);
    try {
      const invoice = await invoicesAPI.createFromJob(job.id);
      Alert.alert(
        'Invoice Created!',
        `Invoice ${invoice.invoice_number} has been created for $${invoice.total.toLocaleString()}`,
        [
          { text: 'View Invoices', onPress: () => router.push('/invoices') },
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleDeleteJob = () => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobsAPI.delete(job!.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete job');
            }
          },
        },
      ]
    );
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

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Job not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleDeleteJob}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <TouchableOpacity
          style={styles.statusCard}
          onPress={() => setStatusModalVisible(true)}
        >
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
          <StatusBadge status={job.status} size="large" />
        </TouchableOpacity>

        {/* Car Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="car" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>Vehicle Information</Text>
          </View>
          <Text style={styles.registration}>{job.car_info.registration}</Text>
          <Text style={styles.carModel}>
            {job.car_info.year} {job.car_info.make} {job.car_info.model}
          </Text>
          {job.car_info.color && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Color</Text>
              <Text style={styles.infoValue}>{job.car_info.color}</Text>
            </View>
          )}
          {job.car_info.vin && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>VIN</Text>
              <Text style={styles.infoValue}>{job.car_info.vin}</Text>
            </View>
          )}
        </View>

        {/* Owner Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>Owner Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{job.owner_info.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <TouchableOpacity>
              <Text style={[styles.infoValue, styles.linkText]}>{job.owner_info.phone}</Text>
            </TouchableOpacity>
          </View>
          {job.owner_info.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{job.owner_info.email}</Text>
            </View>
          )}
          {job.owner_info.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{job.owner_info.address}</Text>
            </View>
          )}
        </View>

        {/* Insurance Info */}
        {job.insurance_info?.company && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Insurance Information</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Company</Text>
              <Text style={styles.infoValue}>{job.insurance_info.company}</Text>
            </View>
            {job.insurance_info.policy_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Policy #</Text>
                <Text style={styles.infoValue}>{job.insurance_info.policy_number}</Text>
              </View>
            )}
            {job.insurance_info.claim_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Claim #</Text>
                <Text style={styles.infoValue}>{job.insurance_info.claim_number}</Text>
              </View>
            )}
          </View>
        )}

        {/* Damage & Cost */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="construct" size={20} color="#F59E0B" />
            <Text style={styles.cardTitle}>Job Details</Text>
          </View>
          <Text style={styles.damageTitle}>Damage Description</Text>
          <Text style={styles.damageText}>{job.damage_description}</Text>
          
          <View style={styles.costRow}>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Estimated</Text>
              <Text style={styles.costValue}>
                ${job.estimated_cost?.toLocaleString() || '0'}
              </Text>
            </View>
            <View style={styles.costDivider} />
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Actual</Text>
              <Text style={styles.costValue}>
                ${job.actual_cost?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>

          {job.notes && (
            <>
              <Text style={styles.damageTitle}>Notes</Text>
              <Text style={styles.damageText}>{job.notes}</Text>
            </>
          )}
        </View>

        {/* Photos */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="images" size={20} color="#EC4899" />
            <Text style={styles.cardTitle}>Photos ({job.photos.length})</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
              <Ionicons name="add" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          
          {job.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {job.photos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoThumbnail}
                  onPress={() => {
                    setSelectedPhoto(photo.id);
                    setPhotoModalVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${photo.base64_data}` }}
                    style={styles.thumbnailImage}
                  />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoNumber}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPhotos}>
              <Ionicons name="camera-outline" size={40} color="#D1D5DB" />
              <Text style={styles.noPhotosText}>No photos yet</Text>
            </View>
          )}
        </View>

        {/* Status History */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={20} color="#6B7280" />
            <Text style={styles.cardTitle}>Status History</Text>
          </View>
          {job.status_history.map((entry, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={[styles.historyDot, { backgroundColor: STATUS_COLORS[entry.status] || '#6B7280' }]} />
              <View style={styles.historyContent}>
                <Text style={styles.historyStatus}>{entry.status}</Text>
                <Text style={styles.historyMeta}>
                  {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm')} by {entry.changed_by}
                </Text>
                {entry.notes && <Text style={styles.historyNotes}>{entry.notes}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Activity Log */}
        {job.activity_log && job.activity_log.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="list" size={20} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Activity Log</Text>
            </View>
            {job.activity_log.slice().reverse().map((entry: any, index: number) => (
              <View key={index} style={styles.activityItem}>
                <View style={[styles.activityIcon, { 
                  backgroundColor: 
                    entry.action === 'created' ? '#D1FAE5' :
                    entry.action === 'status_changed' ? '#DBEAFE' :
                    entry.action === 'photo_added' ? '#FCE7F3' :
                    entry.action === 'photo_deleted' ? '#FEE2E2' :
                    '#F3F4F6'
                }]}>
                  <Ionicons 
                    name={
                      entry.action === 'created' ? 'add-circle' :
                      entry.action === 'status_changed' ? 'swap-horizontal' :
                      entry.action === 'photo_added' ? 'camera' :
                      entry.action === 'photo_deleted' ? 'trash' :
                      'create'
                    } 
                    size={14} 
                    color={
                      entry.action === 'created' ? '#10B981' :
                      entry.action === 'status_changed' ? '#3B82F6' :
                      entry.action === 'photo_added' ? '#EC4899' :
                      entry.action === 'photo_deleted' ? '#EF4444' :
                      '#6B7280'
                    } 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{entry.details}</Text>
                  <Text style={styles.activityMeta}>
                    {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm')} • {entry.employee}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Create Invoice Button */}
        <TouchableOpacity
          style={styles.createInvoiceButton}
          onPress={handleCreateInvoice}
          disabled={creatingInvoice}
        >
          {creatingInvoice ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
              <Text style={styles.createInvoiceText}>Create Invoice</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Created {format(new Date(job.created_at), 'dd MMM yyyy')} by {job.created_by}
          </Text>
        </View>
      </ScrollView>

      {/* Status Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {JOB_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    job.status === status && styles.statusOptionActive,
                  ]}
                  onPress={() => handleStatusChange(status)}
                  disabled={updatingStatus}
                >
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
                  <Text style={[
                    styles.statusOptionText,
                    job.status === status && styles.statusOptionTextActive,
                  ]}>
                    {status}
                  </Text>
                  {job.status === status && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {updatingStatus && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Photo Modal */}
      <Modal
        visible={photoModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
            {selectedPhoto && job.photos.find(p => p.id === selectedPhoto) && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${job.photos.find(p => p.id === selectedPhoto)?.base64_data}` }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#374151',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  registration: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 2,
    marginBottom: 4,
  },
  carModel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  linkText: {
    color: '#3B82F6',
  },
  damageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  damageText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  costItem: {
    flex: 1,
    alignItems: 'center',
  },
  costDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  costLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  costValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
  },
  addPhotoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoScroll: {
    marginTop: 8,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noPhotos: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noPhotosText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  historyNotes: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: '#374151',
  },
  activityMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  createInvoiceButton: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  createInvoiceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalScroll: {
    padding: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  statusOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  statusOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  photoModalContent: {
    flex: 1,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
  },
  fullImage: {
    flex: 1,
    width: '100%',
  },
});
