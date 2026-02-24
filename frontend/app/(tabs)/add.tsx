import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { jobsAPI, scanAPI } from '../../src/services/api';

export default function AddJobScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  // Car Info
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [registration, setRegistration] = useState('');
  const [vin, setVin] = useState('');
  const [color, setColor] = useState('');

  // Owner Info
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');

  // Insurance Info
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [claimNumber, setClaimNumber] = useState('');

  // Job Details
  const [damageDescription, setDamageDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');

  // Photos
  const [photos, setPhotos] = useState<{ uri: string; base64: string }[]>([]);

  const pickImage = async () => {
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

    if (!result.canceled && result.assets[0].base64) {
      setPhotos([...photos, { uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhotos([...photos, { uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
    }
  };

  // Scan registration plate from photo
  const scanPlate = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to scan plates');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setScanning(true);
      try {
        const response = await scanAPI.scanPlate(result.assets[0].base64);
        if (response.success) {
          // Auto-fill vehicle details
          if (response.registration) setRegistration(response.registration);
          if (response.make) setMake(response.make);
          if (response.model) setModel(response.model);
          if (response.color) setColor(response.color);
          if (response.year) setYear(response.year.toString());
          
          // Auto-fill owner details if returning customer
          if (response.returning_customer && response.owner_info) {
            if (response.owner_info.name) setOwnerName(response.owner_info.name);
            if (response.owner_info.phone) setOwnerPhone(response.owner_info.phone);
            if (response.owner_info.email) setOwnerEmail(response.owner_info.email);
            if (response.owner_info.address) setOwnerAddress(response.owner_info.address);
          }
          
          // Auto-fill insurance if available
          if (response.returning_customer && response.insurance_info) {
            if (response.insurance_info.company) setInsuranceCompany(response.insurance_info.company);
            if (response.insurance_info.policy_number) setPolicyNumber(response.insurance_info.policy_number);
            if (response.insurance_info.claim_number) setClaimNumber(response.insurance_info.claim_number);
          }
          
          // Show appropriate message
          if (response.returning_customer) {
            Alert.alert(
              '🔄 Returning Customer!', 
              `${response.message}\n\nOwner and insurance details have been auto-filled from previous records.`
            );
          } else {
            Alert.alert('Vehicle Detected!', response.message);
          }
        } else {
          Alert.alert('Scan Failed', response.message || 'Could not identify the vehicle. Please try again or enter manually.');
        }
      } catch (error: any) {
        console.error('Plate scan error:', error);
        Alert.alert('Error', 'Failed to scan vehicle. Please try again or enter manually.');
      } finally {
        setScanning(false);
      }
    }
  };

  // Scan plate from gallery
  const scanPlateFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant gallery permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setScanning(true);
      try {
        const response = await scanAPI.scanPlate(result.assets[0].base64);
        if (response.success) {
          // Auto-fill vehicle details
          if (response.registration) setRegistration(response.registration);
          if (response.make) setMake(response.make);
          if (response.model) setModel(response.model);
          if (response.color) setColor(response.color);
          if (response.year) setYear(response.year.toString());
          
          // Auto-fill owner details if returning customer
          if (response.returning_customer && response.owner_info) {
            if (response.owner_info.name) setOwnerName(response.owner_info.name);
            if (response.owner_info.phone) setOwnerPhone(response.owner_info.phone);
            if (response.owner_info.email) setOwnerEmail(response.owner_info.email);
            if (response.owner_info.address) setOwnerAddress(response.owner_info.address);
          }
          
          // Auto-fill insurance if available
          if (response.returning_customer && response.insurance_info) {
            if (response.insurance_info.company) setInsuranceCompany(response.insurance_info.company);
            if (response.insurance_info.policy_number) setPolicyNumber(response.insurance_info.policy_number);
            if (response.insurance_info.claim_number) setClaimNumber(response.insurance_info.claim_number);
          }
          
          // Show appropriate message
          if (response.returning_customer) {
            Alert.alert(
              '🔄 Returning Customer!', 
              `${response.message}\n\nOwner and insurance details have been auto-filled from previous records.`
            );
          } else {
            Alert.alert('Vehicle Detected!', response.message);
          }
        } else {
          Alert.alert('Scan Failed', response.message || 'Could not identify the vehicle. Please try again or enter manually.');
        }
      } catch (error: any) {
        console.error('Plate scan error:', error);
        Alert.alert('Error', 'Failed to scan vehicle. Please try again or enter manually.');
      } finally {
        setScanning(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const validateVehicleOnly = () => {
    if (!make || !model || !year || !registration) {
      Alert.alert('Error', 'Please fill in vehicle details (Make, Model, Year, Registration)');
      return false;
    }
    return true;
  };

  const validateForm = () => {
    if (!make || !model || !year || !registration) {
      Alert.alert('Error', 'Please fill in all required car details');
      return false;
    }
    // Owner and damage are now optional for quick create
    return true;
  };

  // Quick create - just vehicle info
  const handleQuickCreate = async () => {
    if (!validateVehicleOnly()) return;

    setLoading(true);
    try {
      const jobData = {
        car_info: {
          make,
          model,
          year: parseInt(year),
          registration: registration.toUpperCase(),
          vin: vin || undefined,
          color: color || undefined,
        },
        // Owner info is optional
        owner_info: ownerName ? {
          name: ownerName,
          phone: ownerPhone || 'TBA',
          email: ownerEmail || undefined,
          address: ownerAddress || undefined,
        } : undefined,
        insurance_info: insuranceCompany ? {
          company: insuranceCompany,
          policy_number: policyNumber || undefined,
          claim_number: claimNumber || undefined,
        } : undefined,
        damage_description: damageDescription || undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        notes: notes || undefined,
      };

      const job = await jobsAPI.create(jobData);

      // Add photos if any
      for (const photo of photos) {
        await jobsAPI.addPhoto(job.id, photo.base64, undefined, 'damage');
      }

      Alert.alert('Job Created!', `Job for ${registration.toUpperCase()} created. You can add owner & damage details later.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const jobData = {
        car_info: {
          make,
          model,
          year: parseInt(year),
          registration: registration.toUpperCase(),
          vin: vin || undefined,
          color: color || undefined,
        },
        owner_info: ownerName ? {
          name: ownerName,
          phone: ownerPhone || 'TBA',
          email: ownerEmail || undefined,
          address: ownerAddress || undefined,
        } : undefined,
        insurance_info: insuranceCompany ? {
          company: insuranceCompany,
          policy_number: policyNumber || undefined,
          claim_number: claimNumber || undefined,
        } : undefined,
        damage_description: damageDescription || undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        notes: notes || undefined,
      };

      const job = await jobsAPI.create(jobData);

      // Add photos if any
      for (const photo of photos) {
        await jobsAPI.addPhoto(job.id, photo.base64, undefined, 'damage');
      }

      Alert.alert('Success', 'Job created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const sections = ['Vehicle', 'Owner', 'Insurance', 'Details', 'Photos'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add New Job</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.tabs}>
          {sections.map((section, index) => (
            <TouchableOpacity
              key={section}
              style={[styles.tab, activeSection === index && styles.activeTab]}
              onPress={() => setActiveSection(index)}
            >
              <Text style={[styles.tabText, activeSection === index && styles.activeTabText]}>
                {section}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {activeSection === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              
              {/* Scan Plate Button */}
              <View style={styles.scanPlateContainer}>
                <TouchableOpacity 
                  style={[styles.scanPlateButton, scanning && styles.scanPlateButtonDisabled]} 
                  onPress={scanPlate}
                  disabled={scanning}
                >
                  {scanning ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.scanIcon}>📷</Text>
                      <Text style={styles.scanPlateButtonText}>Scan Vehicle</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.scanPlateButtonSecondary, scanning && styles.scanPlateButtonDisabled]} 
                  onPress={scanPlateFromGallery}
                  disabled={scanning}
                >
                  <Text style={styles.galleryIcon}>🖼️</Text>
                </TouchableOpacity>
              </View>
              {scanning && (
                <Text style={styles.scanningText}>AI analyzing vehicle... This may take a few seconds</Text>
              )}

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Make *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Toyota"
                    value={make}
                    onChangeText={setMake}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Model *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Camry"
                    value={model}
                    onChangeText={setModel}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Year *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2020"
                    value={year}
                    onChangeText={setYear}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Registration *</Text>
                  <TextInput
                    style={[styles.input, registration && styles.inputFilled]}
                    placeholder="ABC123"
                    value={registration}
                    onChangeText={setRegistration}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>VIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional"
                    value={vin}
                    onChangeText={setVin}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Color</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Silver"
                    value={color}
                    onChangeText={setColor}
                  />
                </View>
              </View>
            </View>
          )}

          {activeSection === 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owner Information</Text>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Smith"
                value={ownerName}
                onChangeText={setOwnerName}
              />
              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="0400 000 000"
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="john@email.com"
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="123 Main St, Sydney NSW 2000"
                value={ownerAddress}
                onChangeText={setOwnerAddress}
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {activeSection === 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Insurance Information</Text>
              <Text style={styles.helperText}>Optional - fill if insurance claim</Text>
              <Text style={styles.label}>Insurance Company</Text>
              <TextInput
                style={styles.input}
                placeholder="NRMA, Allianz, etc."
                value={insuranceCompany}
                onChangeText={setInsuranceCompany}
              />
              <Text style={styles.label}>Policy Number</Text>
              <TextInput
                style={styles.input}
                placeholder="POL-123456"
                value={policyNumber}
                onChangeText={setPolicyNumber}
              />
              <Text style={styles.label}>Claim Number</Text>
              <TextInput
                style={styles.input}
                placeholder="CLM-789012"
                value={claimNumber}
                onChangeText={setClaimNumber}
              />
            </View>
          )}

          {activeSection === 3 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Details</Text>
              <Text style={styles.label}>Damage Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the damage..."
                value={damageDescription}
                onChangeText={setDamageDescription}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.label}>Estimated Cost ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="5000"
                value={estimatedCost}
                onChangeText={setEstimatedCost}
                keyboardType="numeric"
              />
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {activeSection === 4 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Damage Photos</Text>
              <Text style={styles.helperText}>Add photos of the damage</Text>

              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Text style={styles.photoIcon}>🖼️</Text>
                  <Text style={styles.photoButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoIcon}>🖼️</Text>
                      <Text style={styles.photoIndex}>Photo {index + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => removePhoto(index)}
                    >
                      <Text style={styles.removePhotoIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {photos.length === 0 && (
                <View style={styles.noPhotos}>
                  <Text style={styles.noPhotosIcon}>📷</Text>
                  <Text style={styles.noPhotosText}>No photos added yet</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            {/* Quick Create - always show when vehicle info is filled */}
            {(make && model && year && registration) && (
              <TouchableOpacity
                style={[styles.quickCreateButton, loading && styles.submitButtonDisabled]}
                onPress={handleQuickCreate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#10B981" />
                ) : (
                  <>
                    <Text style={styles.quickIcon}>⚡</Text>
                    <Text style={styles.quickCreateButtonText}>Quick Create (Add details later)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Create Job</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  helperText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputFilled: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  scanPlateContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  scanPlateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  scanPlateButtonSecondary: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  scanPlateButtonDisabled: {
    opacity: 0.6,
  },
  scanPlateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanningText: {
    fontSize: 13,
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    width: '30%',
    aspectRatio: 1,
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndex: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  noPhotos: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPhotosText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  buttonContainer: {
    marginBottom: 100,
    gap: 12,
  },
  quickCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  quickCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
