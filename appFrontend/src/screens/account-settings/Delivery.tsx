import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform, ScrollView, RefreshControl, Alert, Modal, TextInput, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { deliveryAddressService, type DeliveryAddress } from '../../services/deliveryAddressService'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'

export default function Delivery() {
  const navigation = useNavigation()

  const [addresses, setAddresses] = React.useState<DeliveryAddress[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [refreshing, setRefreshing] = React.useState<boolean>(false)
  const [showAddAddressModal, setShowAddAddressModal] = React.useState<boolean>(false)
  const [newAddress, setNewAddress] = React.useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    label: '',
  })
  const [makeDefault, setMakeDefault] = React.useState<boolean>(false)
  const [addressErrors, setAddressErrors] = React.useState<{ address?: string; city?: string; state?: string; country?: string }>({})
  const [addressMode, setAddressMode] = React.useState<'current' | 'specific'>('specific')
  const [fetchingLocation, setFetchingLocation] = React.useState<boolean>(false)
  const { height: screenHeight } = Dimensions.get('window')
  const geocodeCacheRef = React.useRef<Map<string, { address: string; city: string; state: string; postalCode: string; country: string }>>(new Map())
  const geocodeInFlightRef = React.useRef<boolean>(false)
  const hasAutofilledCurrentRef = React.useRef<boolean>(false)
  const [keyboardHeight, setKeyboardHeight] = React.useState<number>(0)

  const loadAddresses = React.useCallback(async () => {
    try {
      setLoading(true)
      const response = await deliveryAddressService.getDeliveryAddresses()
      setAddresses(response.addresses || [])
    } catch (e) {
      console.error('Failed to load addresses', e)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadAddresses()
  }, [loadAddresses])

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await loadAddresses()
    setRefreshing(false)
  }, [loadAddresses])

  const handleDelete = (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this delivery address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deliveryAddressService.deleteDeliveryAddress(addressId)
              await loadAddresses()
              Alert.alert('Success', 'Delivery address deleted successfully!')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete delivery address')
            }
          }
        }
      ]
    )
  }

  const validateField = (field: string, value: string, required: boolean = true) => {
    if (required && !value.trim()) {
      return `${field} is required`
    }
    return ''
  }

  const clearFieldError = (field: string) => {
    if (addressErrors[field as keyof typeof addressErrors]) {
      setAddressErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateNewAddress = () => {
    const newErrors: { address?: string; city?: string; state?: string; country?: string } = {}
    const addressError = validateField('Address', newAddress.address)
    const cityError = validateField('City', newAddress.city)
    const stateError = validateField('State/Province', newAddress.state)
    const countryError = validateField('Country', newAddress.country)
    if (addressError) newErrors.address = addressError
    if (cityError) newErrors.city = cityError
    if (stateError) newErrors.state = stateError
    if (countryError) newErrors.country = countryError
    setAddressErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddNewAddress = async () => {
    if (!validateNewAddress()) return
    try {
      const response = await deliveryAddressService.createDeliveryAddress({
        ...newAddress,
        isDefault: makeDefault || addresses.length === 0,
      })
      await loadAddresses()
      // reset
      setNewAddress({ address: '', city: '', state: '', postalCode: '', country: '', label: '' })
      setMakeDefault(false)
      setShowAddAddressModal(false)
      setAddressErrors({})
      Alert.alert('Success', 'Delivery address added successfully!')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add delivery address')
    }
  }

  const fetchCurrentAddress = React.useCallback(async () => {
    try {
      if (fetchingLocation || geocodeInFlightRef.current || hasAutofilledCurrentRef.current) {
        return
      }
      setFetchingLocation(true)
      geocodeInFlightRef.current = true
      // Check/request permission
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync()
      let status = existingStatus
      if (existingStatus !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync()
        status = req.status
      }
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to autofill your current address.')
        setAddressMode('specific')
        return
      }
      // Get coords
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const key = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`
      const cached = geocodeCacheRef.current.get(key)
      if (cached) {
        setNewAddress(prev => ({ ...prev, ...cached, label: prev.label || 'Current Location' }))
        hasAutofilledCurrentRef.current = true
        return
      }
      // Reverse geocode
      const reverseGeocodeWithRetry = async (attempts = 2): Promise<Location.LocationGeocodedAddress[] | null> => {
        try {
          const res = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          return res as any
        } catch (err: any) {
          const msg = String(err?.message || '')
          if (attempts > 1 && msg.toLowerCase().includes('rate limit')) {
            await new Promise(r => setTimeout(r, 1500))
            return reverseGeocodeWithRetry(attempts - 1)
          }
          throw err
        }
      }
      const results = await reverseGeocodeWithRetry()
      const r = results?.[0]
      if (r) {
        // Use precise town/place name as the street address as requested
        const composedAddress = r.name || r.city || r.subregion || r.street || ''
        setNewAddress(prev => {
          const filled = {
            ...prev,
            address: composedAddress || prev.address,
            city: r.city || r.subregion || prev.city,
            state: r.region || prev.state,
            postalCode: r.postalCode || prev.postalCode,
            country: r.country || prev.country,
            label: prev.label || 'Current Location',
          }
          geocodeCacheRef.current.set(key, {
            address: filled.address,
            city: filled.city,
            state: filled.state,
            postalCode: filled.postalCode,
            country: filled.country,
          })
          hasAutofilledCurrentRef.current = true
          return filled
        })
      } else {
        Alert.alert('Not Found', 'Could not determine your address from location.')
      }
    } catch (e) {
      console.error('Location fetch error', e)
      const msg = String((e as any)?.message || '')
      if (msg.toLowerCase().includes('rate limit')) {
        Alert.alert('Please wait', 'Location service is busy. Try again in a few seconds or enter the address manually.')
      } else {
        Alert.alert('Error', 'Failed to fetch current location.')
      }
      setAddressMode('specific')
    } finally {
      setFetchingLocation(false)
      geocodeInFlightRef.current = false
    }
  }, [])

  // When switching to current mode and modal is visible, attempt autofill
  React.useEffect(() => {
    if (showAddAddressModal && addressMode === 'current') {
      fetchCurrentAddress()
    }
  }, [showAddAddressModal, addressMode, fetchCurrentAddress])

  // Reset autofill flag when closing modal or changing to specific
  React.useEffect(() => {
    if (!showAddAddressModal || addressMode === 'specific') {
      hasAutofilledCurrentRef.current = false
    }
  }, [showAddAddressModal, addressMode])

  // Keyboard listeners to add bottom padding instead of shifting modal
  React.useEffect(() => {
    const onShow = (e: any) => setKeyboardHeight(e?.endCoordinates?.height || 0)
    const onHide = () => setKeyboardHeight(0)
    const subShow = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow)
    const subHide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide)
    return () => {
      subShow.remove()
      subHide.remove()
    }
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Addresses</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} tintColor="#2563EB" />}
      >
        {addresses.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No delivery addresses yet</Text>
            <Text style={styles.emptyText}>Add your delivery address to speed up checkout.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {addresses.map(address => (
              <View key={address.id} style={[styles.item, address.isDefault && styles.itemDefault] }>
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Ionicons name="location" size={18} color={address.isDefault ? '#2563EB' : '#6B7280'} />
                    <Text style={styles.itemLabel}>{address.label || 'Address'}</Text>
                    {address.isDefault && (
                      <View style={styles.badge}><Text style={styles.badgeText}>Default</Text></View>
                    )}
                  </View>
                  <Text style={styles.itemText}>{address.address}</Text>
                  <Text style={styles.itemText}>{address.city}, {address.state} {address.postalCode || ''}</Text>
                  <Text style={styles.itemText}>{address.country}</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(address.id)}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddAddressModal(true)}>
          <Ionicons name="add-circle-outline" size={22} color="#2563EB" />
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add New Address Modal */}
      <Modal
        visible={showAddAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddAddressModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <SafeAreaView style={[styles.modalContent, { height: screenHeight * 0.85 }]}> 
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderSideSpacer} />
                <View style={styles.modalHeaderCenter}>
                  <View style={styles.modalIconCircleLg}>
                    <Ionicons name="location" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.modalTitleCenter}>Add Delivery Address</Text>
                  <Text style={styles.modalSubtitleCenter}>Use current location or enter a specific address</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddAddressModal(false)
                    setNewAddress({ address: '', city: '', state: '', postalCode: '', country: '', label: '' })
                    setAddressErrors({})
                    setMakeDefault(false)
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Address mode selector */}
              <View style={styles.radioRow}>
                <TouchableOpacity style={styles.radioOption} onPress={() => setAddressMode('current')}>
                  <View style={[styles.radioCircle, addressMode === 'current' && styles.radioCircleSelected]} />
                  <Text style={styles.radioLabel}>Use Current Location</Text>
                  {fetchingLocation && <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.radioOption} onPress={() => setAddressMode('specific')}>
                  <View style={[styles.radioCircle, addressMode === 'specific' && styles.radioCircleSelected]} />
                  <Text style={styles.radioLabel}>Enter Specific Address</Text>
                </TouchableOpacity>
              </View>
              {addressMode === 'specific' && (
                <Text style={styles.modeHint}>Type your address details below. Ensure accuracy for delivery.</Text>
              )}

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 24, paddingBottom: Math.max(100, keyboardHeight + 24) }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              >
                <View style={styles.newAddressForm}>
                  <View style={styles.formInputGroup}>
                    <Text style={styles.formInputLabel}>Label (Optional)</Text>
                    <TextInput
                      style={styles.formTextInput}
                      value={newAddress.label}
                      onChangeText={(text) => setNewAddress(prev => ({ ...prev, label: text }))}
                      placeholder="e.g., Home, Office"
                    />
                  </View>

                  <View style={styles.formInputGroup}>
                    <Text style={styles.formInputLabel}>Street Address *</Text>
                    <TextInput
                      style={[styles.formTextInput, addressErrors.address && styles.formTextInputError]}
                      value={newAddress.address}
                      onChangeText={(text) => { setNewAddress(prev => ({ ...prev, address: text })); clearFieldError('address') }}
                      placeholder="Enter your street address"
                      multiline
                      numberOfLines={2}
                      editable={addressMode !== 'current'}
                    />
                    {addressErrors.address && <Text style={styles.formFieldErrorText}>{addressErrors.address}</Text>}
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formInputGroup}>
                      <Text style={styles.formInputLabel}>City *</Text>
                      <TextInput
                        style={[styles.formTextInput, addressErrors.city && styles.formTextInputError]}
                        value={newAddress.city}
                        onChangeText={(text) => { setNewAddress(prev => ({ ...prev, city: text })); clearFieldError('city') }}
                        placeholder="City"
                        editable={addressMode !== 'current'}
                      />
                      {addressErrors.city && <Text style={styles.formFieldErrorText}>{addressErrors.city}</Text>}
                    </View>
                    <View style={styles.formInputGroup}>
                      <Text style={styles.formInputLabel}>State/Province *</Text>
                      <TextInput
                        style={[styles.formTextInput, addressErrors.state && styles.formTextInputError]}
                        value={newAddress.state}
                        onChangeText={(text) => { setNewAddress(prev => ({ ...prev, state: text })); clearFieldError('state') }}
                        placeholder="State"
                        editable={addressMode !== 'current'}
                      />
                      {addressErrors.state && <Text style={styles.formFieldErrorText}>{addressErrors.state}</Text>}
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formInputGroup}>
                      <Text style={styles.formInputLabel}>Postal Code</Text>
                      <TextInput
                        style={styles.formTextInput}
                        value={newAddress.postalCode}
                        onChangeText={(text) => setNewAddress(prev => ({ ...prev, postalCode: text }))}
                        placeholder="Postal Code (optional)"
                        keyboardType="numeric"
                        editable={addressMode !== 'current'}
                      />
                    </View>
                    <View style={styles.formInputGroup}>
                      <Text style={styles.formInputLabel}>Country *</Text>
                      <TextInput
                        style={[styles.formTextInput, addressErrors.country && styles.formTextInputError]}
                        value={newAddress.country}
                        onChangeText={(text) => { setNewAddress(prev => ({ ...prev, country: text })); clearFieldError('country') }}
                        placeholder="Country"
                        editable={addressMode !== 'current'}
                      />
                      {addressErrors.country && <Text style={styles.formFieldErrorText}>{addressErrors.country}</Text>}
                    </View>
                  </View>

                  <View style={styles.defaultToggleContainer}>
                    <View style={styles.defaultToggleContent}>
                      <View style={styles.defaultToggleInfo}>
                        <Ionicons name="star" size={20} color={makeDefault ? '#F59E0B' : '#9CA3AF'} />
                        <View style={styles.defaultToggleText}>
                          <Text style={styles.defaultToggleTitle}>Make Default Address</Text>
                          <Text style={styles.defaultToggleDescription}>Set this as your default delivery address</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.toggleSwitch, makeDefault && styles.toggleSwitchActive]}
                        onPress={() => setMakeDefault(prev => !prev)}
                      >
                        <View style={[styles.toggleKnob, makeDefault && styles.toggleKnobActive]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => {
                    setShowAddAddressModal(false)
                    setNewAddress({ address: '', city: '', state: '', postalCode: '', country: '', label: '' })
                    setMakeDefault(false)
                    setAddressErrors({})
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveAddressButton} onPress={handleAddNewAddress}>
                  <Text style={styles.saveAddressButtonText}>Save Address</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerRight: { width: 40 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    margin: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 10, marginBottom: 6, textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  list: { margin: 16, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF' },
  itemDefault: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  itemContent: { flex: 1, marginLeft: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  itemLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginLeft: 6, marginRight: 8 },
  itemText: { fontSize: 13, color: '#374151', marginBottom: 2 },
  badge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: '#FEF2F2', marginLeft: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', marginHorizontal: 16, marginBottom: 16 },
  addBtnText: { color: '#2563EB', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  // Modal styles (mirrored from Order.tsx styling scheme)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalKav: { width: '100%' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 0, flexDirection: 'column' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  closeButton: { padding: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  modalHeaderSideSpacer: { width: 40 },
  modalHeaderCenter: { flex: 1, alignItems: 'center' },
  modalIconCircleLg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 8 },
  modalTitleCenter: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalSubtitleCenter: { fontSize: 12, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  radioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 24, marginBottom: 8 },
  radioOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#9CA3AF', marginRight: 8 },
  radioCircleSelected: { borderColor: '#2563EB', backgroundColor: '#2563EB' },
  radioLabel: { color: '#111827', fontSize: 14, fontWeight: '600' },
  modeHint: { color: '#6B7280', fontSize: 12, marginHorizontal: 24, marginBottom: 8 },
  newAddressForm: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 24 },
  formRow: { flexDirection: 'row', gap: 12 },
  formInputGroup: { flex: 1, marginBottom: 16 },
  formInputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  formTextInput: { padding: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, fontSize: 16, color: '#374151', backgroundColor: '#FFFFFF' },
  formTextInputError: { borderColor: '#DC2626', borderWidth: 2 },
  formFieldErrorText: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cancelModalButton: { flex: 1, paddingVertical: 16, paddingHorizontal: 24, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' },
  cancelModalButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  saveAddressButton: { flex: 1, paddingVertical: 16, paddingHorizontal: 24, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center' },
  saveAddressButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  defaultToggleContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  defaultToggleContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  defaultToggleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  defaultToggleText: { marginLeft: 12, flex: 1 },
  defaultToggleTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  defaultToggleDescription: { fontSize: 14, color: '#6B7280' },
  toggleSwitch: { width: 44, height: 24, backgroundColor: '#E5E7EB', borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleSwitchActive: { backgroundColor: '#2563EB' },
  toggleKnob: { width: 20, height: 20, backgroundColor: '#FFFFFF', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
})


