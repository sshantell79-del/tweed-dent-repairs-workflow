import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { invoicesAPI, xeroAPI } from '../src/services/api';
import { format } from 'date-fns';

const INVOICE_STATUSES = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
const STATUS_COLORS: { [key: string]: string } = {
  Draft: '#6B7280',
  Sent: '#3B82F6',
  Paid: '#10B981',
  Overdue: '#EF4444',
  Cancelled: '#9CA3AF',
};

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  job_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  line_items: LineItem[];
  subtotal: number;
  gst: number;
  total: number;
  notes?: string;
  status: string;
  issue_date: string;
  due_date: string;
  paid_date?: string;
}

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [stats, setStats] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [syncingToXero, setSyncingToXero] = useState(false);
  const router = useRouter();

  const loadInvoices = async () => {
    try {
      const [invoiceData, statsData] = await Promise.all([
        invoicesAPI.getAll(selectedStatus, search),
        invoicesAPI.getStats(),
      ]);
      setInvoices(invoiceData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [selectedStatus, search])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const handleSyncToXero = async (invoice: Invoice) => {
    setSyncingToXero(true);
    try {
      const result = await xeroAPI.syncInvoice(invoice.id);
      if (result.success) {
        Alert.alert(
          'Synced to Xero!',
          `Invoice ${result.xero_invoice_number} created in Xero`,
          [{ text: 'OK' }]
        );
        setDetailModalVisible(false);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to sync to Xero. Make sure Xero is connected in Profile.';
      Alert.alert('Sync Failed', message);
    } finally {
      setSyncingToXero(false);
    }
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: string) => {
    try {
      await invoicesAPI.updateStatus(invoice.id, newStatus);
      loadInvoices();
      setDetailModalVisible(false);
      Alert.alert('Success', `Invoice marked as ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update invoice status');
    }
  };

  const handleDelete = (invoice: Invoice) => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete ${invoice.invoice_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await invoicesAPI.delete(invoice.id);
              loadInvoices();
              setDetailModalVisible(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete invoice');
            }
          },
        },
      ]
    );
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const isOverdue = new Date(item.due_date) < new Date() && item.status !== 'Paid' && item.status !== 'Cancelled';
    
    return (
      <TouchableOpacity
        style={styles.invoiceCard}
        onPress={() => {
          setSelectedInvoice(item);
          setDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceHeader}>
          <View>
            <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
            <Text style={styles.customerName}>{item.customer_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isOverdue && item.status !== 'Overdue' ? 'Overdue' : item.status}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailText}>
              {format(new Date(item.issue_date), 'dd MMM yyyy')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={isOverdue ? '#EF4444' : '#9CA3AF'} />
            <Text style={[styles.detailText, isOverdue && styles.overdueText]}>
              Due: {format(new Date(item.due_date), 'dd MMM yyyy')}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceFooter}>
          <Text style={styles.listTotalLabel}>Total</Text>
          <Text style={styles.totalAmount}>${item.total.toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Invoices</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${stats.outstanding?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Outstanding</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>${stats.paid_amount?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_invoices || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoices..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterContainer}>
          {INVOICE_STATUSES.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                selectedStatus === status && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[
                styles.filterText,
                selectedStatus === status && styles.filterTextActive,
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoice}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptyText}>Create an invoice from a job</Text>
          </View>
        }
      />

      {/* Invoice Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedInvoice?.invoice_number}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Customer Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Customer</Text>
                  <Text style={styles.modalText}>{selectedInvoice.customer_name}</Text>
                  {selectedInvoice.customer_phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color="#6B7280" />
                      <Text style={styles.modalSubtext}>{selectedInvoice.customer_phone}</Text>
                    </View>
                  )}
                  {selectedInvoice.customer_email && (
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={14} color="#6B7280" />
                      <Text style={styles.modalSubtext}>{selectedInvoice.customer_email}</Text>
                    </View>
                  )}
                  {selectedInvoice.customer_address && (
                    <View style={styles.contactRow}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.modalSubtext}>{selectedInvoice.customer_address}</Text>
                    </View>
                  )}
                </View>

                {/* Status */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[selectedInvoice.status] + '20' }]}>
                    <Text style={[styles.statusTextLarge, { color: STATUS_COLORS[selectedInvoice.status] }]}>
                      {selectedInvoice.status}
                    </Text>
                  </View>
                </View>

                {/* Line Items */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Line Items</Text>
                  <View style={styles.lineItemsContainer}>
                    {selectedInvoice.line_items && selectedInvoice.line_items.map((item, index) => (
                      <View key={index} style={styles.lineItem}>
                        <View style={styles.lineItemLeft}>
                          <Text style={styles.lineItemDesc}>{item.description}</Text>
                          <Text style={styles.lineItemQty}>
                            {item.quantity} × ${item.unit_price.toFixed(2)}
                          </Text>
                        </View>
                        <Text style={styles.lineItemTotal}>${item.total.toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>${selectedInvoice.subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>GST (10%)</Text>
                    <Text style={styles.totalValue}>${selectedInvoice.gst.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.totalRow, styles.grandTotalRow]}>
                    <Text style={styles.grandTotalLabel}>Total</Text>
                    <Text style={styles.grandTotalValue}>${selectedInvoice.total.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Notes</Text>
                    <Text style={styles.notesText}>{selectedInvoice.notes}</Text>
                  </View>
                )}

                {/* Dates */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Dates</Text>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Issued:</Text>
                    <Text style={styles.dateValue}>{format(new Date(selectedInvoice.issue_date), 'dd MMM yyyy')}</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Due:</Text>
                    <Text style={[styles.dateValue, new Date(selectedInvoice.due_date) < new Date() && selectedInvoice.status !== 'Paid' && { color: '#EF4444' }]}>
                      {format(new Date(selectedInvoice.due_date), 'dd MMM yyyy')}
                    </Text>
                  </View>
                  {selectedInvoice.paid_date && (
                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>Paid:</Text>
                      <Text style={[styles.dateValue, { color: '#10B981' }]}>
                        {format(new Date(selectedInvoice.paid_date), 'dd MMM yyyy')}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  {selectedInvoice.status === 'Draft' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => handleStatusChange(selectedInvoice, 'Sent')}
                    >
                      <Ionicons name="send" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Mark as Sent</Text>
                    </TouchableOpacity>
                  )}
                  {(selectedInvoice.status === 'Sent' || selectedInvoice.status === 'Overdue') && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                      onPress={() => handleStatusChange(selectedInvoice, 'Paid')}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Mark as Paid</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Sync to Xero Button */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#0D9488' }]}
                    onPress={() => handleSyncToXero(selectedInvoice)}
                    disabled={syncingToXero}
                  >
                    {syncingToXero ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.actionButtonText}>
                      {syncingToXero ? 'Syncing...' : 'Sync to Xero'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => handleDelete(selectedInvoice)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 44,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#3B82F6',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  listTotalLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  lineItemsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  lineItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  lineItemDesc: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  lineItemQty: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  lineItemTotal: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  totalsSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
    marginTop: 8,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  grandTotalValue: {
    fontSize: 20,
    color: '#059669',
    fontWeight: '700',
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
  },
  modalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#059669',
  },
  statusBadgeLarge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  dateValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
