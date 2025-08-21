import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { 
  ArrowLeft, 
  Plus, 
  CreditCard, 
  Smartphone, 
  Wallet,
  Trash2,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/api';
import { MobileWalletPicker } from '../../components/MobileWalletPicker';
import { mobileWalletService } from '../../services/mobileWalletService';

interface PaymentMethod {
  id: string;
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CRYPTO' | 'DIGITAL_WALLET' | 'CASH';
  provider: string;
  accountId: string;
  accountName: string;
  isDefault: boolean;
  isActive: boolean;
  status?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export function PaymentMethods() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    type: 'CREDIT_CARD',
    provider: '',
    accountName: '',
    isDefault: false,
  });

  // Mobile money provider states
  const [selectedMobileProviderId, setSelectedMobileProviderId] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  // When opening modal for Mobile Money, default to first active provider from mobileWalletService
  useEffect(() => {
    const shouldInit = (showAddModal || showEditModal) && formData.type === 'MOBILE_MONEY';
    if (!shouldInit) return;
    const providers = mobileWalletService.getActiveProviders();
    const initial = editingMethod
      ? providers.find(p => p.name === editingMethod.provider)?.id || providers[0]?.id || null
      : providers[0]?.id || null;
    setSelectedMobileProviderId(initial);
    const providerName = providers.find(p => p.id === initial)?.name || '';
    setFormData(prev => ({ ...prev, provider: providerName || (initial || '') }));
  }, [showAddModal, showEditModal, formData.type]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      
      // Ensure user is authenticated
      if (!user?.id) {
        console.log('User not authenticated, skipping payment method load');
        setPaymentMethods([]);
        return;
      }

      console.log('Loading payment methods for current user:', user.id);
      
      let response;
      try {
        response = await api.get('/api/payment-methods');
      } catch (apiError: any) {
        console.log('Payment methods API call failed:', apiError.response?.status, apiError.message);
        
        // If it's a 500 error, the endpoint might not be implemented yet
        if (apiError.response?.status === 500) {
          console.log('Payment methods endpoint returned 500 - using mock data');
          
          // Use mock data to test the UI flow
          const mockPaymentMethods: PaymentMethod[] = [
            {
              id: 'mock-1',
              type: 'CREDIT_CARD',
              provider: 'Visa',
              accountName: 'John Doe',
              accountId: '1234',
              isDefault: true,
              isActive: true,
              status: 'ACTIVE',
              userId: user.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {
                cardNumber: '4242 4242 4242 4242',
                expiryDate: '12/25',
                cvv: '123'
              }
            },
            {
              id: 'mock-2',
              type: 'MOBILE_MONEY',
              provider: 'M-Pesa',
              accountName: 'Mobile Money',
              accountId: user?.phoneNumber || '',
              isDefault: false,
              isActive: true,
              status: 'ACTIVE',
              userId: user.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {
                phoneNumber: user?.phoneNumber || '',
                walletType: 'Mobile Money',
                providerId: 'mpesa'
              }
            }
          ];
          
          console.log('Using mock payment methods for current user:', user.id, mockPaymentMethods);
          setPaymentMethods(mockPaymentMethods);
          return;
        }
        
        // Re-throw other errors
        throw apiError;
      }
      
      const allPaymentMethods = response?.data?.data || [];
      
      console.log('Raw API response for payment methods:', {
        responseData: response?.data,
        allPaymentMethods: allPaymentMethods,
        currentUserId: user.id
      });
      
      // Filter payment methods by current user ID
      const userPaymentMethods = allPaymentMethods.filter((pm: any) => pm.userId === user.id);
      
      // Parse metadata for each payment method if it's a string
      const parsedUserPaymentMethods = userPaymentMethods.map((pm: any) => {
        console.log('Processing payment method:', {
          id: pm.id,
          type: pm.type,
          rawMetadata: pm.metadata,
          metadataType: typeof pm.metadata
        });
        
        let parsedMetadata = pm.metadata;
        if (typeof pm.metadata === 'string') {
          try {
            parsedMetadata = JSON.parse(pm.metadata);
            console.log('Successfully parsed metadata from string for payment method', pm.id, ':', parsedMetadata);
          } catch (error) {
            console.error('Failed to parse metadata for payment method', pm.id, ':', error);
            parsedMetadata = {};
          }
        } else if (pm.metadata && typeof pm.metadata === 'object') {
          console.log('Metadata is already an object for payment method', pm.id, ':', pm.metadata);
          parsedMetadata = pm.metadata;
        } else {
          console.log('Metadata is neither string nor object for payment method', pm.id, ':', pm.metadata);
          parsedMetadata = {};
        }
        
        return {
          ...pm,
          metadata: parsedMetadata
        };
      });
      
      console.log('Payment methods filtering results:', {
        currentUserId: user.id,
        totalPaymentMethods: allPaymentMethods.length,
        userPaymentMethodsCount: userPaymentMethods.length,
        userPaymentMethods: parsedUserPaymentMethods.map((pm: any) => ({
          id: pm.id,
          type: pm.type,
          provider: pm.provider,
          isDefault: pm.isDefault,
          userId: pm.userId
        }))
      });
      
      setPaymentMethods(parsedUserPaymentMethods);
      
    } catch (error: any) {
      console.error('Error loading payment methods:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.log('Authentication error when loading payment methods');
        Alert.alert('Authentication Error', 'Please log in to view payment methods.');
      } else if (error.response?.status === 403) {
        console.log('Access denied when loading payment methods');
        Alert.alert('Access Denied', 'You do not have permission to view payment methods.');
      } else if (error.response?.status >= 500) {
        console.log('Server error when loading payment methods:', error.response?.status);
        Alert.alert('Server Error', 'Unable to load payment methods. Please try again later.');
      } else {
        console.log('Other error when loading payment methods:', error.message);
        Alert.alert('Error', 'Failed to load payment methods. Please try again.');
      }
      
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    setFormData({
      type: 'CREDIT_CARD',
      provider: '',
      accountName: '',
      isDefault: false,
    });
    setShowAddModal(true);
  };

  const handleEditPaymentMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      type: method.type,
      provider: method.provider,
      accountName: method.accountName,
      isDefault: method.isDefault,
    });
    setShowEditModal(true);
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/payment-methods/${methodId}`);
              Alert.alert('Success', 'Payment method deleted successfully');
              loadPaymentMethods();
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', 'Failed to delete payment method');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await api.patch(`/api/payment-methods/${methodId}`, {
        isDefault: true,
      });
      Alert.alert('Success', 'Default payment method updated');
      loadPaymentMethods();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const handleSavePaymentMethod = async () => {
    // For Mobile Money, allow either the name or the selected provider id as provider
    if (formData.type !== 'MOBILE_MONEY' && !formData.provider) {
      Alert.alert('Error', 'Please select or enter a provider');
      return;
    }
    if (formData.type === 'MOBILE_MONEY' && !formData.provider && !selectedMobileProviderId) {
      Alert.alert('Error', 'Please select a mobile money provider');
      return;
    }
    if (formData.type === 'CREDIT_CARD' && !formData.accountName) {
      Alert.alert('Error', 'Please enter the cardholder name');
      return;
    }

    try {
      const isMobileMoney = formData.type === 'MOBILE_MONEY';
      const resolvedProvider = isMobileMoney ? (formData.provider || selectedMobileProviderId || '') : formData.provider;
      const paymentData = {
        type: formData.type,
        provider: resolvedProvider,
        accountId: isMobileMoney ? (user?.phoneNumber || '') : 'CARD',
        accountName: isMobileMoney ? (user?.phoneNumber || '') : formData.accountName,
        isDefault: formData.isDefault,
        metadata: isMobileMoney ? { phoneNumber: user?.phoneNumber || '' } : {},
      };

      if (editingMethod) {
        await api.patch(`/api/payment-methods/${editingMethod.id}`, paymentData);
        Alert.alert('Success', 'Payment method updated successfully');
      } else {
        await api.post('/api/payment-methods', paymentData);
        Alert.alert('Success', 'Payment method added successfully');
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setEditingMethod(null);
      loadPaymentMethods();
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      if (error?.response?.status === 409) {
        Alert.alert('Duplicate', 'payment method exist');
        return;
      }
      Alert.alert('Error', 'Failed to save payment method');
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return <CreditCard size={24} color="#2563EB" />;
      case 'MOBILE_MONEY':
        return <Smartphone size={24} color="#10B981" />;
      case 'BANK_TRANSFER':
        return <Wallet size={24} color="#7C3AED" />;
      case 'CRYPTO':
      case 'DIGITAL_WALLET':
        return <Wallet size={24} color="#F59E0B" />;
      case 'CASH':
        return <Wallet size={24} color="#DC2626" />;
      default:
        return <CreditCard size={24} color="#6B7280" />;
    }
  };

  const getPaymentMethodTypeName = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD':
        return 'Credit Card';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CRYPTO':
        return 'Cryptocurrency';
      case 'CASH':
        return 'Cash';
      default:
        return 'Unknown';
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <View key={method.id} style={styles.paymentMethodCard}>
      <View style={styles.paymentMethodHeader}>
        <View style={styles.paymentMethodInfo}>
          <View style={styles.paymentMethodIcon}>
            {getPaymentMethodIcon(method.type)}
          </View>
          <View style={styles.paymentMethodDetails}>
            <Text style={styles.paymentMethodName}>
              {method.provider} - {getPaymentMethodTypeName(method.type)}
            </Text>
            <Text style={styles.paymentMethodAccount}>
              {method.accountName}
            </Text>
            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.paymentMethodActions}>
          {!method.isDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(method.id)}
            >
              <CheckCircle size={20} color="#10B981" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditPaymentMethod(method)}
          >
            <Edit size={20} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeletePaymentMethod(method.id)}
          >
            <Trash2 size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddPaymentMethod}
        >
          <Plus size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading payment methods...</Text>
          </View>
        ) : paymentMethods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CreditCard size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyDescription}>
              Add your first payment method to get started with secure transactions
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={handleAddPaymentMethod}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addFirstButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Payment Methods</Text>
              <Text style={styles.sectionSubtitle}>
                Manage your saved payment methods for quick and secure transactions
              </Text>
            </View>
            
            {paymentMethods.map(renderPaymentMethod)}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Payment Method Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingMethod(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingMethod(null);
                }}
              >
                <XCircle size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Type</Text>
                <View style={styles.paymentTypeOptions}>
                  {[
                    { type: 'CREDIT_CARD', label: 'Credit Card', icon: 'card-outline' },
                    { type: 'MOBILE_MONEY', label: 'Mobile Money', icon: 'phone-portrait-outline' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.type}
                      style={[
                        styles.paymentTypeOption,
                        formData.type === option.type && styles.paymentTypeOptionSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, type: option.type as any }))}
                    >
                      <Ionicons 
                        name={option.icon as any} 
                        size={20} 
                        color={formData.type === option.type ? '#FFFFFF' : '#6B7280'} 
                      />
                      <Text style={[
                        styles.paymentTypeLabel,
                        formData.type === option.type && styles.paymentTypeLabelSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {formData.type === 'CREDIT_CARD' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Card Provider</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.provider}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, provider: text }))}
                      placeholder="e.g., Visa, Mastercard"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Cardholder Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.accountName}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, accountName: text }))}
                      placeholder="e.g., John Doe"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </>
              )}

              {formData.type === 'MOBILE_MONEY' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Mobile Money Provider</Text>
                   <MobileWalletPicker
                     value={selectedMobileProviderId || ''}
                     onChange={(providerId, providerName) => {
                       setSelectedMobileProviderId(providerId);
                       // Prefer provided name from picker; fallback to service lookup; finally providerId
                       const svc = mobileWalletService.getActiveProviders();
                       const resolvedName = providerName
                         || (svc.find(p => p.id === providerId)?.name)
                         || (svc.find(p => p.code === providerId)?.name)
                         || '';
                       setFormData(prev => ({ ...prev, provider: resolvedName || providerId }));
                     }}
                   />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Mobile Number</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: '#F3F4F6', color: '#6B7280' }]}
                      value={user?.phoneNumber || ''}
                      editable={false}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.defaultToggle}
                onPress={() => setFormData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
              >
                <View style={[
                  styles.toggleSwitch,
                  formData.isDefault && styles.toggleSwitchActive
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    formData.isDefault && styles.toggleKnobActive
                  ]} />
                </View>
                <Text style={styles.defaultToggleText}>Set as default payment method</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingMethod(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePaymentMethod}
              >
                <Text style={styles.saveButtonText}>
                  {editingMethod ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentMethodAccount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  paymentTypeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  paymentTypeOptionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  paymentTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  paymentTypeLabelSelected: {
    color: '#FFFFFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    padding: 2,
    marginRight: 12,
  },
  toggleSwitchActive: {
    backgroundColor: '#2563EB',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  defaultToggleText: {
    fontSize: 16,
    color: '#374151',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
