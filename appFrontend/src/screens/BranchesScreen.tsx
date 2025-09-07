import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, ScrollView, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../navigation/AppNavigator'
import { branchService, type Branch } from '../services/branchService'

type BranchesScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'BranchesScreen'>

export function BranchesScreen() {
  const navigation = useNavigation<BranchesScreenNavigationProp>()
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [showAddBranchModal, setShowAddBranchModal] = useState(false)
  const [isCreatingBranch, setIsCreatingBranch] = useState(false)
  
  // Branch form state
  const [branchFormData, setBranchFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phoneNumber: '',
    email: ''
  })

  useEffect(() => {
    loadBranches()
  }, [])

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

  const handleCreateBranch = () => {
    setShowAddBranchModal(true)
  }

  const handleCloseBranchModal = () => {
    setShowAddBranchModal(false)
    setBranchFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      phoneNumber: '',
      email: ''
    })
  }

  const handleBranchInputChange = (field: string, value: string) => {
    setBranchFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmitBranch = async () => {
    // Validate required fields
    if (!branchFormData.name) {
      Alert.alert('Validation Error', 'Branch name is required')
      return
    }

    // Validate email format if provided
    if (branchFormData.email && !/\S+@\S+\.\S+/.test(branchFormData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address')
      return
    }

    try {
      setIsCreatingBranch(true)
      const newBranch = await branchService.createBranch(branchFormData)
      
      // Add to local state
      setBranches(prev => [newBranch, ...prev])
      
      // Close modal and reset form
      handleCloseBranchModal()
      
      Alert.alert('Success', 'Branch created successfully!')
    } catch (error: any) {
      console.error('Error creating branch:', error)
      Alert.alert('Error', error.response?.data?.error || 'Failed to create branch')
    } finally {
      setIsCreatingBranch(false)
    }
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
        <Text style={styles.title}>Branches</Text>
        <TouchableOpacity
          onPress={handleCreateBranch}
          style={styles.headerAddButton}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {branchesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading branches...</Text>
          </View>
        ) : branches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Branches Yet</Text>
            <Text style={styles.emptyText}>
              Create your first branch to start organizing your sales representatives.
            </Text>
            <TouchableOpacity
              onPress={handleCreateBranch}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Create Branch</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.branchesList}>
            {branches.map((branch) => (
              <View key={branch.id} style={styles.branchCard}>
                <View style={styles.branchInfo}>
                  <View style={styles.branchIcon}>
                    <Ionicons name="business" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.branchDetails}>
                    <Text style={styles.branchName}>{branch.name}</Text>
                    <Text style={styles.branchLocation}>
                      {branch.city && branch.state 
                        ? `${branch.city}, ${branch.state}` 
                        : branch.city || branch.state || 'No location set'
                      }
                    </Text>
                    {branch.address && (
                      <Text style={styles.branchAddress}>{branch.address}</Text>
                    )}
                    {branch.phoneNumber && (
                      <Text style={styles.branchPhone}>{branch.phoneNumber}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.branchActions}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Branch Modal */}
      <Modal
        visible={showAddBranchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseBranchModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseBranchModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Branch</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Branch Name *</Text>
                <TextInput
                  style={styles.input}
                  value={branchFormData.name}
                  onChangeText={(value) => handleBranchInputChange('name', value)}
                  placeholder="Enter branch name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={branchFormData.address}
                  onChangeText={(value) => handleBranchInputChange('address', value)}
                  placeholder="Enter branch address"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={branchFormData.city}
                  onChangeText={(value) => handleBranchInputChange('city', value)}
                  placeholder="Enter city"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={branchFormData.state}
                  onChangeText={(value) => handleBranchInputChange('state', value)}
                  placeholder="Enter state"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={branchFormData.country}
                  onChangeText={(value) => handleBranchInputChange('country', value)}
                  placeholder="Enter country"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={branchFormData.postalCode}
                  onChangeText={(value) => handleBranchInputChange('postalCode', value)}
                  placeholder="Enter postal code"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={branchFormData.phoneNumber}
                  onChangeText={(value) => handleBranchInputChange('phoneNumber', value)}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={branchFormData.email}
                  onChangeText={(value) => handleBranchInputChange('email', value)}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Info Text */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Create a branch to organize your sales representatives and track performance by location.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={handleCloseBranchModal}
                style={styles.cancelButton}
                disabled={isCreatingBranch}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitBranch}
                style={[styles.submitButton, isCreatingBranch && styles.submitButtonDisabled]}
                disabled={isCreatingBranch}
              >
                <Text style={styles.submitButtonText}>
                  {isCreatingBranch ? "Creating..." : "Create Branch"}
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
  // Branches list
  branchesList: {
    gap: 12,
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  branchIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  branchDetails: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  branchLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  branchAddress: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  branchPhone: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  branchActions: {
    padding: 8,
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
})
