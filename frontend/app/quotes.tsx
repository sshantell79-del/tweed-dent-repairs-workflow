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
  Alert,
  Modal,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { quotesAPI, damageAPI, Quote, QuoteLineItem, PanelPricing } from '../src/services/api';
import { format } from 'date-fns';

const QUOTE_STATUSES = ['All', 'Draft', 'Sent', 'Accepted', 'Declined', 'Expired'];
const STATUS_COLORS: { [key: string]: string } = {
  Draft: '#6B7280',
  Sent: '#3B82F6',
  Accepted: '#10B981',
  Declined: '#EF4444',
  Expired: '#F59E0B',
};

const CATEGORIES = [1, 2, 3, 4, 5];

interface DamageLineItem {
  panel_number: number;
  panel_name: string;
  category: number;
  price: number;
  is_manual_price: boolean;
  description: string;
}

export default function QuotesScreen() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [panelPricing, setPanelPricing] = useState<PanelPricing | null>(null);
  const router = useRouter();

  // New quote form state
  const [newQuote, setNewQuote] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vehicle_registration: '',
    vehicle_make: '',
    vehicle_model: '',
    notes: '',
  });
  const [damageItems, setDamageItems] = useState<DamageLineItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [addPanelModalVisible, setAddPanelModalVisible] = useState(false);
  const [selectedPanelForAdd, setSelectedPanelForAdd] = useState<number | null>(null);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<number>(1);
  const [panelSelectionStep, setPanelSelectionStep] = useState<'panel' | 'category'>('panel');

  // Load panel pricing on mount
  useEffect(() => {
    loadPanelPricing();
  }, []);

  const loadPanelPricing = async () => {
    try {
      const pricing = await damageAPI.getPanelPricing();
      setPanelPricing(pricing);
    } catch (error) {
      console.error('Failed to load panel pricing:', error);
    }
  };

  const loadQuotes = async () => {
    try {
      const data = await quotesAPI.getAll(selectedStatus, search);
      setQuotes(data);
    } catch (error) {
      console.error('Failed to load quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadQuotes();
    }, [selectedStatus, search])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuotes();
    setRefreshing(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      analyzeImage(result.assets[0].base64);
      setPhotos([...photos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera access to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      analyzeImage(result.assets[0].base64);
      setPhotos([...photos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const analyzeImage = async (base64: string) => {
    if (!panelPricing) return;
    
    setAnalyzing(true);
    try {
      const result = await damageAPI.analyzeDamage(base64);
      if (result.success && result.panels_detected.length > 0) {
        // Add detected panels with default category 1
        const existingPanels = new Set(damageItems.map(d => d.panel_number));
        const newItems: DamageLineItem[] = [];
        
        for (const panelNum of result.panels_detected) {
          if (!existingPanels.has(panelNum) && panelPricing.panels[panelNum]) {
            const price = panelPricing.pricing[panelNum]?.[1] ?? 0;
            newItems.push({
              panel_number: panelNum,
              panel_name: panelPricing.panels[panelNum],
              category: 1,
              price: price,
              is_manual_price: price === null,
              description: '',
            });
          }
        }
        
        if (newItems.length > 0) {
          setDamageItems([...damageItems, ...newItems]);
          Alert.alert('Damage Detected', result.message);
        } else {
          Alert.alert('Info', 'Panels already added or not recognized');
        }
      } else {
        Alert.alert('Analysis Complete', result.message || 'No damage detected');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to analyze damage');
    } finally {
      setAnalyzing(false);
    }
  };

  const addPanelManually = (panelNumber: number) => {
    if (!panelPricing) return;
    
    const existingPanels = new Set(damageItems.map(d => d.panel_number));
    if (existingPanels.has(panelNumber)) {
      Alert.alert('Info', 'This panel is already added');
      return;
    }

    const price = panelPricing.pricing[panelNumber]?.[1] ?? 0;
    const newItem: DamageLineItem = {
      panel_number: panelNumber,
      panel_name: panelPricing.panels[panelNumber],
      category: 1,
      price: price,
      is_manual_price: price === null,
      description: '',
    };
    
    setDamageItems([...damageItems, newItem]);
    setAddPanelModalVisible(false);
  };

  const updateItemCategory = (index: number, category: number) => {
    if (!panelPricing) return;
    
    const updated = [...damageItems];
    const item = updated[index];
    const price = panelPricing.pricing[item.panel_number]?.[category];
    
    updated[index] = {
      ...item,
      category: category,
      price: price ?? item.price,
      is_manual_price: price === null,
    };
    
    setDamageItems(updated);
  };

  const updateItemPrice = (index: number, price: string) => {
    const updated = [...damageItems];
    updated[index] = {
      ...updated[index],
      price: parseFloat(price) || 0,
      is_manual_price: true,
    };
    setDamageItems(updated);
  };

  const updateItemDescription = (index: number, description: string) => {
    const updated = [...damageItems];
    updated[index] = { ...updated[index], description };
    setDamageItems(updated);
  };

  const removeDamageItem = (index: number) => {
    const updated = [...damageItems];
    updated.splice(index, 1);
    setDamageItems(updated);
  };

  const getTotal = () => {
    return damageItems.reduce((sum, item) => sum + item.price, 0);
  };

  const handleCreateQuote = async () => {
    if (!newQuote.customer_name.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    if (damageItems.length === 0) {
      Alert.alert('Error', 'Please add at least one damage item');
      return;
    }

    setCreating(true);
    try {
      const lineItems: QuoteLineItem[] = damageItems.map(d => ({
        panel_number: d.panel_number,
        panel_name: d.panel_name,
        category: d.category,
        price: d.price,
        is_manual_price: d.is_manual_price,
        description: d.description,
      }));

      await quotesAPI.create({
        customer_name: newQuote.customer_name,
        customer_phone: newQuote.customer_phone || undefined,
        customer_email: newQuote.customer_email || undefined,
        vehicle_registration: newQuote.vehicle_registration || undefined,
        vehicle_make: newQuote.vehicle_make || undefined,
        vehicle_model: newQuote.vehicle_model || undefined,
        line_items: lineItems,
        notes: newQuote.notes || undefined,
        photos: photos,
      });

      Alert.alert('Success', 'Quote created successfully');
      setCreateModalVisible(false);
      resetForm();
      loadQuotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to create quote');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewQuote({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      vehicle_registration: '',
      vehicle_make: '',
      vehicle_model: '',
      notes: '',
    });
    setDamageItems([]);
    setPhotos([]);
  };

  const handleStatusChange = async (quote: Quote, newStatus: string) => {
    try {
      await quotesAPI.updateStatus(quote.id, newStatus);
      loadQuotes();
      setDetailModalVisible(false);
      Alert.alert('Success', `Quote marked as ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update quote status');
    }
  };

  const handleConvertToJob = async (quote: Quote) => {
    Alert.alert(
      'Convert to Job',
      'This will create a new job from this quote. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            try {
              const result = await quotesAPI.convertToJob(quote.id);
              Alert.alert('Success', 'Quote converted to job');
              setDetailModalVisible(false);
              loadQuotes();
              router.push(`/job/${result.job_id}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to convert quote');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (quote: Quote) => {
    Alert.alert(
      'Delete Quote',
      `Are you sure you want to delete ${quote.quote_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await quotesAPI.delete(quote.id);
              loadQuotes();
              setDetailModalVisible(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete quote');
            }
          },
        },
      ]
    );
  };

  const renderQuoteItem = ({ item }: { item: Quote }) => {
    return (
      <TouchableOpacity
        style={styles.quoteCard}
        onPress={() => {
          setSelectedQuote(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.quoteHeader}>
          <Text style={styles.quoteNumber}>{item.quote_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.customerName}>{item.customer_name}</Text>
        
        {item.vehicle_registration && (
          <View style={styles.vehicleInfo}>
            <Ionicons name="car-outline" size={14} color="#6B7280" />
            <Text style={styles.vehicleText}>
              {item.vehicle_registration} {item.vehicle_make && `- ${item.vehicle_make}`} {item.vehicle_model}
            </Text>
          </View>
        )}

        <Text style={styles.itemsCount}>
          {item.line_items.length} panel(s)
        </Text>

        <View style={styles.quoteFooter}>
          <Text style={styles.dateText}>
            {format(new Date(item.created_at), 'dd MMM yyyy')}
          </Text>
          <Text style={styles.totalAmount}>
            ${item.total.toLocaleString()}
          </Text>
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quotes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quotes..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {QUOTE_STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              selectedStatus === status && styles.filterChipActive,
            ]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === status && styles.filterTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quotes List */}
      <FlatList
        data={quotes}
        renderItem={renderQuoteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Quotes</Text>
            <Text style={styles.emptyText}>
              Create your first quote by tapping the + button
            </Text>
          </View>
        }
      />

      {/* Create Quote Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setCreateModalVisible(false);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Quote</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Customer Info */}
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Customer Name *"
                  placeholderTextColor="#9CA3AF"
                  value={newQuote.customer_name}
                  onChangeText={(text) => setNewQuote({ ...newQuote, customer_name: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={newQuote.customer_phone}
                  onChangeText={(text) => setNewQuote({ ...newQuote, customer_phone: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newQuote.customer_email}
                  onChangeText={(text) => setNewQuote({ ...newQuote, customer_email: text })}
                />
              </View>

              {/* Vehicle Info */}
              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Registration"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  value={newQuote.vehicle_registration}
                  onChangeText={(text) => setNewQuote({ ...newQuote, vehicle_registration: text })}
                />
                <View style={styles.rowInputs}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Make"
                    placeholderTextColor="#9CA3AF"
                    value={newQuote.vehicle_make}
                    onChangeText={(text) => setNewQuote({ ...newQuote, vehicle_make: text })}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginLeft: 12 }]}
                    placeholder="Model"
                    placeholderTextColor="#9CA3AF"
                    value={newQuote.vehicle_model}
                    onChangeText={(text) => setNewQuote({ ...newQuote, vehicle_model: text })}
                  />
                </View>
              </View>

              {/* Damage Assessment */}
              <Text style={styles.sectionTitle}>Damage Assessment</Text>
              <Text style={styles.sectionSubtitle}>
                Take photos to auto-detect panels, or add manually
              </Text>
              
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto} disabled={analyzing}>
                  <Ionicons name="camera" size={24} color="#3B82F6" />
                  <Text style={styles.photoButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage} disabled={analyzing}>
                  <Ionicons name="images" size={24} color="#3B82F6" />
                  <Text style={styles.photoButtonText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.photoButton, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]} 
                  onPress={() => setAddPanelModalVisible(true)}
                >
                  <Ionicons name="add-circle" size={24} color="#F59E0B" />
                  <Text style={[styles.photoButtonText, { color: '#F59E0B' }]}>Add Panel</Text>
                </TouchableOpacity>
              </View>

              {analyzing && (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.analyzingText}>Analyzing damage...</Text>
                </View>
              )}

              {/* Photo Thumbnails */}
              {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
                  {photos.map((photo, index) => (
                    <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                  ))}
                </ScrollView>
              )}

              {/* Damage Items */}
              {damageItems.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Panels ({damageItems.length})</Text>
                  {damageItems.map((item, index) => (
                    <View key={index} style={styles.damageItem}>
                      <View style={styles.damageItemHeader}>
                        <View style={styles.panelBadge}>
                          <Text style={styles.panelNumber}>{item.panel_number}</Text>
                        </View>
                        <Text style={styles.panelName}>{item.panel_name}</Text>
                        <TouchableOpacity onPress={() => removeDamageItem(index)}>
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Category Selection */}
                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Category:</Text>
                        <View style={styles.categoryButtons}>
                          {CATEGORIES.map((cat) => {
                            const catPrice = panelPricing?.pricing[item.panel_number]?.[cat];
                            const isManual = catPrice === null || catPrice === undefined;
                            return (
                              <TouchableOpacity
                                key={cat}
                                style={[
                                  styles.categoryButton,
                                  item.category === cat && styles.categoryButtonActive,
                                ]}
                                onPress={() => updateItemCategory(index, cat)}
                              >
                                <Text style={[
                                  styles.categoryButtonText,
                                  item.category === cat && styles.categoryButtonTextActive,
                                ]}>
                                  {cat}
                                </Text>
                                {isManual && <Text style={styles.manualIndicator}>*</Text>}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Price Input */}
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>
                          {item.is_manual_price ? 'Enter Price:' : 'Price:'}
                        </Text>
                        {item.is_manual_price ? (
                          <TextInput
                            style={styles.priceInput}
                            value={item.price.toString()}
                            onChangeText={(text) => updateItemPrice(index, text)}
                            keyboardType="numeric"
                            placeholder="Enter price"
                          />
                        ) : (
                          <Text style={styles.priceValue}>${item.price}</Text>
                        )}
                      </View>

                      {/* Description */}
                      <TextInput
                        style={styles.descriptionInput}
                        placeholder="Add description (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={item.description}
                        onChangeText={(text) => updateItemDescription(index, text)}
                      />
                    </View>
                  ))}

                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>${getTotal().toLocaleString()}</Text>
                  </View>
                </>
              )}

              {/* Notes */}
              <Text style={styles.sectionTitle}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={newQuote.notes}
                onChangeText={(text) => setNewQuote({ ...newQuote, notes: text })}
              />

              <TouchableOpacity
                style={[styles.createButton, creating && styles.createButtonDisabled]}
                onPress={handleCreateQuote}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Create Quote</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Add Panel Modal */}
      <Modal
        visible={addPanelModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddPanelModalVisible(false)}
      >
        <View style={styles.panelModalOverlay}>
          <View style={styles.panelModalContent}>
            <View style={styles.panelModalHeader}>
              <Text style={styles.panelModalTitle}>Select Panel</Text>
              <TouchableOpacity onPress={() => setAddPanelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.panelList}>
              {panelPricing && Object.entries(panelPricing.panels).map(([num, name]) => {
                const panelNum = parseInt(num);
                const isAdded = damageItems.some(d => d.panel_number === panelNum);
                return (
                  <TouchableOpacity
                    key={num}
                    style={[styles.panelOption, isAdded && styles.panelOptionDisabled]}
                    onPress={() => !isAdded && addPanelManually(panelNum)}
                    disabled={isAdded}
                  >
                    <View style={styles.panelOptionBadge}>
                      <Text style={styles.panelOptionNumber}>{num}</Text>
                    </View>
                    <Text style={[styles.panelOptionName, isAdded && { color: '#9CA3AF' }]}>
                      {name}
                    </Text>
                    {isAdded && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quote Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedQuote?.quote_number}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedQuote && (
              <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
                {/* Customer */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Customer</Text>
                  <Text style={styles.detailText}>{selectedQuote.customer_name}</Text>
                  {selectedQuote.customer_phone && (
                    <Text style={styles.detailSubtext}>{selectedQuote.customer_phone}</Text>
                  )}
                </View>

                {/* Vehicle */}
                {selectedQuote.vehicle_registration && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Vehicle</Text>
                    <Text style={styles.detailText}>{selectedQuote.vehicle_registration}</Text>
                    <Text style={styles.detailSubtext}>
                      {[selectedQuote.vehicle_make, selectedQuote.vehicle_model].filter(Boolean).join(' ')}
                    </Text>
                  </View>
                )}

                {/* Status */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[selectedQuote.status] + '20' }]}>
                    <Text style={[styles.statusTextLarge, { color: STATUS_COLORS[selectedQuote.status] }]}>
                      {selectedQuote.status}
                    </Text>
                  </View>
                </View>

                {/* Damage Items */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Panels</Text>
                  {selectedQuote.line_items.map((item, index) => (
                    <View key={index} style={styles.detailDamageItem}>
                      <View style={styles.panelBadgeSmall}>
                        <Text style={styles.panelNumberSmall}>{item.panel_number}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailDamageTitle}>{item.panel_name}</Text>
                        <Text style={styles.detailDamageMethod}>
                          Category {item.category} {item.description && `- ${item.description}`}
                        </Text>
                      </View>
                      <Text style={styles.detailDamageCost}>${item.price}</Text>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.detailTotalSection}>
                  <Text style={styles.detailTotalLabel}>Total</Text>
                  <Text style={styles.detailTotalValue}>${selectedQuote.total.toLocaleString()}</Text>
                </View>

                {/* Actions */}
                <View style={styles.detailActions}>
                  {selectedQuote.status === 'Draft' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => handleStatusChange(selectedQuote, 'Sent')}
                    >
                      <Ionicons name="send" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Mark as Sent</Text>
                    </TouchableOpacity>
                  )}
                  {(selectedQuote.status === 'Sent' || selectedQuote.status === 'Draft') && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                      onPress={() => handleConvertToJob(selectedQuote)}
                    >
                      <Ionicons name="construct" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Convert to Job</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => handleDelete(selectedQuote)}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  addButton: { backgroundColor: '#3B82F6', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 16, color: '#1F2937' },
  filterContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#3B82F6' },
  filterText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16 },
  quoteCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  quoteNumber: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  customerName: { fontSize: 15, fontWeight: '500', color: '#374151', marginBottom: 4 },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  vehicleText: { fontSize: 13, color: '#6B7280' },
  itemsCount: { fontSize: 13, color: '#9CA3AF', marginBottom: 8 },
  quoteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#059669' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalBody: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 20, marginBottom: 12 },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 12, marginTop: -8 },
  inputGroup: { gap: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1F2937' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row' },
  photoButtons: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, paddingVertical: 12 },
  photoButtonText: { fontSize: 12, fontWeight: '500', color: '#3B82F6' },
  analyzingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  analyzingText: { fontSize: 14, color: '#3B82F6' },
  photoGallery: { marginTop: 12 },
  photoThumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
  damageItem: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  damageItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  panelBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  panelNumber: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  panelName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1F2937' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  categoryLabel: { fontSize: 14, color: '#6B7280', marginRight: 12 },
  categoryButtons: { flexDirection: 'row', gap: 6 },
  categoryButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  categoryButtonActive: { backgroundColor: '#3B82F6' },
  categoryButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  categoryButtonTextActive: { color: '#FFFFFF' },
  manualIndicator: { position: 'absolute', top: 2, right: 4, fontSize: 10, color: '#F59E0B' },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: '#6B7280', marginRight: 12 },
  priceInput: { flex: 1, backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '600', color: '#1F2937' },
  priceValue: { fontSize: 18, fontWeight: '700', color: '#059669' },
  descriptionInput: { backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1F2937' },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
  totalValue: { fontSize: 24, fontWeight: '700', color: '#059669' },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, marginTop: 24 },
  createButtonDisabled: { opacity: 0.7 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  panelModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  panelModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  panelModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  panelModalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  panelList: { padding: 16 },
  panelOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  panelOptionDisabled: { opacity: 0.5 },
  panelOptionBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  panelOptionNumber: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  panelOptionName: { flex: 1, fontSize: 15, color: '#1F2937' },
  detailModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  detailBody: { padding: 20 },
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  detailText: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
  detailSubtext: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  statusBadgeLarge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusTextLarge: { fontSize: 14, fontWeight: '600' },
  detailDamageItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  panelBadgeSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  panelNumberSmall: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  detailDamageTitle: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  detailDamageMethod: { fontSize: 12, color: '#6B7280' },
  detailDamageCost: { fontSize: 16, fontWeight: '600', color: '#059669' },
  detailTotalSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, marginBottom: 20 },
  detailTotalLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
  detailTotalValue: { fontSize: 24, fontWeight: '700', color: '#059669' },
  detailActions: { gap: 10, marginBottom: 20 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
