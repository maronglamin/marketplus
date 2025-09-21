import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, ScrollView, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../navigation/AppNavigator'
import { salesRepService, type SalesRep, type CreateSalesRepRequest } from '../services/salesRepService'
import { branchService, type Branch } from '../services/branchService'
import { Globe, X, Search } from 'lucide-react-native'
import countryData from '../utils/countryData'

type Country = { name: string; code: string; dial_code: string; flag: string }
type SalesRepsScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SalesRepsScreen'>

export function SalesRepsScreen() {
  const navigation = useNavigation<SalesRepsScreenNavigationProp>()
  const [salesReps, setSalesReps] = useState<SalesRep[]>([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Country selection state
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  
  // Form state
  const [formData, setFormData] = useState<CreateSalesRepRequest>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    branchId: '',
    pin: ''
  })
  const [phoneInput, setPhoneInput] = useState('')

  useEffect(() => {
    loadSalesReps()
    loadBranches()
  }, [])

  const loadSalesReps = async () => {
    try {
      setLoading(true)
      const reps = await salesRepService.getSalesReps()
      setSalesReps(reps)
    } catch (error) {
      console.error('Error loading sales reps:', error)
      Alert.alert('Error', 'Failed to load sales representatives')
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      setBranchesLoading(true)
      const branchList = await branchService.getBranches()
      setBranches(branchList)
    } catch (error) {
      console.error('Error loading branches:', error)
      Alert.alert('Error', 'Failed to load branches')
    } finally {
      setBranchesLoading(false)
    }
  }

  const handleCreateSalesRep = () => {
    setShowAddModal(true)
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setShowBranchDropdown(false)
    setShowCountryDropdown(false)
    setFormData({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      branchId: '',
      pin: ''
    })
    setPhoneInput('')
    setSelectedCountry(null)
    setCountrySearch('')
  }

  const handleInputChange = (field: keyof CreateSalesRepRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBranchSelect = (branchId: string) => {
    handleInputChange('branchId', branchId)
    setShowBranchDropdown(false)
    setShowCountryDropdown(false)
  }

  const onSelectCountry = (country: Country) => {
    setSelectedCountry(country)
    setShowCountryDropdown(false)
    setShowBranchDropdown(false)
    setCountrySearch('')
  }

  const formatPhoneNumber = (number: string) => {
    return number.replace(/\D/g, '')
  }

  const validatePhoneNumber = (number: string) => {
    return number.length >= 7 && number.length <= 15
  }

  const handleSubmitSalesRep = async () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !phoneInput || !formData.branchId || !selectedCountry || !formData.pin) {
      Alert.alert('Validation Error', 'Please fill in all required fields')
      return
    }

    // Validate PIN format (4 digits only)
    if (!/^\d{4}$/.test(formData.pin)) {
      Alert.alert('Validation Error', 'PIN must be exactly 4 digits')
      return
    }

    // Validate phone number
    const formattedNumber = formatPhoneNumber(phoneInput)
    if (!validatePhoneNumber(formattedNumber)) {
      Alert.alert('Validation Error', 'Please enter a valid phone number (7-15 digits)')
      return
    }

    try {
      setIsCreating(true)
      
      // Create the full phone number with country code
      const fullPhoneNumber = `${selectedCountry.dial_code}${formattedNumber}`
      
      const salesRepData = {
        ...formData,
        phoneNumber: fullPhoneNumber
      }
      
      const newSalesRep = await salesRepService.createSalesRep(salesRepData)
      
      // Add to local state
      setSalesReps(prev => [newSalesRep, ...prev])
      
      // Close modal and reset form
      handleCloseModal()
      
      Alert.alert('Success', 'Sales representative created successfully!')
    } catch (error: any) {
      console.error('Error creating sales rep:', error)
      Alert.alert('Error', error.response?.data?.error || 'Failed to create sales representative')
    } finally {
      setIsCreating(false)
    }
  }

  const handleViewSalesRepDashboard = (salesRepId: string) => {
    Alert.alert('Coming Soon', 'Sales Rep Dashboard will be available soon')
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Sales Representatives</Text>
        <TouchableOpacity
          onPress={handleCreateSalesRep}
          style={styles.headerAddButton}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading sales reps...</Text>
          </View>
        ) : salesReps.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Sales Reps Yet</Text>
            <Text style={styles.emptyText}>
              Create your first sales representative to start managing your business across different branches.
            </Text>
            <TouchableOpacity
              onPress={handleCreateSalesRep}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Create Sales Rep</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.salesRepsList}>
            {salesReps.map((rep) => (
              <TouchableOpacity
                key={rep.id}
                style={styles.salesRepCard}
                onPress={() => handleViewSalesRepDashboard(rep.id)}
              >
                <View style={styles.salesRepInfo}>
                  <View style={styles.salesRepAvatar}>
                    <Text style={styles.salesRepInitials}>
                      {rep.firstName.charAt(0)}{rep.lastName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.salesRepDetails}>
                    <Text style={styles.salesRepName}>
                      {rep.firstName} {rep.lastName}
                    </Text>
                    <Text style={styles.salesRepPhone}>{rep.phoneNumber}</Text>
                    <Text style={styles.salesRepBranch}>
                      {rep.branchName}{rep.branchLocation ? ` - ${rep.branchLocation}` : ''}
                    </Text>
                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusBadge,
                        rep.status === 'ACTIVE' ? styles.activeBadge : styles.inactiveBadge
                      ]}>
                        <Text style={[
                          styles.statusText,
                          rep.status === 'ACTIVE' ? styles.activeText : styles.inactiveText
                        ]}>
                          {rep.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Sales Rep Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Sales Representative</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  placeholder="Enter first name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  placeholder="Enter last name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countrySelectorContainer}>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowCountryDropdown(!showCountryDropdown)
                      }} 
                      style={styles.countrySelector}
                    >
                      {selectedCountry ? (
                        <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                      ) : (
                        <Globe size={22} color="#2563EB" />
                      )}
                      <Ionicons 
                        name={showCountryDropdown ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color="#6B7280" 
                      />
                    </TouchableOpacity>
                    
                    {/* Country Dropdown */}
                    {showCountryDropdown && (
                      <View style={styles.countryDropdown}>
                        <View style={styles.countrySearchContainer}>
                          <Search size={16} color="#6B7280" />
                          <TextInput
                            style={styles.countrySearchInput}
                            placeholder="Search country"
                            value={countrySearch}
                            onChangeText={setCountrySearch}
                            autoFocus={false}
                          />
                        </View>
                        <ScrollView 
                          style={styles.countryDropdownList} 
                          showsVerticalScrollIndicator={true}
                          keyboardShouldPersistTaps="handled"
                        >
                          {countryData.filter(c =>
                            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                            c.dial_code.includes(countrySearch)
                          ).slice(0, 10).map(c => (
                            <TouchableOpacity
                              key={c.code}
                              style={styles.countryDropdownItem}
                              onPress={() => {
                                onSelectCountry(c)
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.countryFlag}>{c.flag}</Text>
                              <Text style={styles.countryName}>{c.name}</Text>
                              <Text style={styles.countryCode}>{c.dial_code}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phoneInput}
                    onChangeText={(text) => {
                      const cleanText = text.replace(/\D/g, '')
                      setPhoneInput(cleanText)
                    }}
                    keyboardType="phone-pad"
                    placeholder={selectedCountry ? "Phone number" : "Select country first"}
                    maxLength={15}
                    editable={!!selectedCountry}
                  />
                  {!!phoneInput && (
                    <TouchableOpacity 
                      onPress={() => setPhoneInput('')} 
                      style={styles.phoneInputIconRight}
                    >
                      <X size={20} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Branch *</Text>
                <View style={styles.branchSelectorContainer}>
                  <TouchableOpacity
                    style={styles.branchSelector}
                    onPress={() => setShowBranchDropdown(!showBranchDropdown)}
                  >
                    <Text style={[
                      styles.branchSelectorText,
                      !formData.branchId && styles.branchSelectorPlaceholder
                    ]}>
                      {formData.branchId 
                        ? branches.find(b => b.id === formData.branchId)?.name || 'Select Branch'
                        : 'Select Branch'
                      }
                    </Text>
                    <Ionicons 
                      name={showBranchDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                  
                  {/* Branch Dropdown */}
                  {showBranchDropdown && (
                    <View style={styles.branchDropdown}>
                      {branches.length === 0 ? (
                        <View style={styles.dropdownItem}>
                          <Text style={styles.dropdownItemText}>No branches available</Text>
                        </View>
                      ) : (
                        branches.map((branch) => (
                          <TouchableOpacity
                            key={branch.id}
                            style={styles.dropdownItem}
                            onPress={() => handleBranchSelect(branch.id)}
                          >
                            <Text style={styles.dropdownItemText}>
                              {branch.name}{branch.city ? ` - ${branch.city}` : ''}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Default PIN *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.pin}
                  onChangeText={(value) => {
                    // Only allow digits and limit to 4 characters
                    const numericValue = value.replace(/\D/g, '').slice(0, 4)
                    handleInputChange('pin', numericValue)
                  }}
                  placeholder="Enter 4-digit PIN"
                  keyboardType="numeric"
                  secureTextEntry={true}
                  maxLength={4}
                />
                <Text style={styles.helperText}>Must be exactly 4 digits</Text>
              </View>

              {/* Info Text */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  The sales representative will inherit your KYC details and can manage products and orders for this branch.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.cancelButton}
                disabled={isCreating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitSalesRep}
                style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? "Creating..." : "Create Sales Rep"}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 12,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBack: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerAddButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Loading styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
  },
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  // Sales reps list
  salesRepsList: {
    gap: 12,
  },
  salesRepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  salesRepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  salesRepAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  salesRepInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  salesRepDetails: {
    flex: 1,
  },
  salesRepName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  salesRepPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  salesRepBranch: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  activeText: {
    color: '#065F46',
  },
  inactiveText: {
    color: '#991B1B',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  // Branch selector styles
  branchSelectorContainer: {
    position: 'relative',
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  branchSelectorText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  branchSelectorPlaceholder: {
    color: '#9CA3AF',
  },
  branchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#111827',
  },
  // Phone input styles
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  countrySelectorContainer: {
    position: 'relative',
    marginRight: 8,
    zIndex: 10000,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  countryDropdown: {
    position: 'absolute',
    top: '100%',
    left: -12,
    right: -12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    minWidth: 280,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  countrySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  countryDropdownList: {
    maxHeight: 150,
  },
  countryDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  phoneInputIconRight: {
    paddingLeft: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 10,
    minWidth: 20,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  countryCode: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'right',
  },
})
