import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Trash2, AlertTriangle, Shield, CheckCircle, XCircle } from 'lucide-react-native'
import { useAuth } from '../../contexts/AuthContext'
import { userService } from '../../services/userService'
import { ChevronRight } from 'lucide-react-native'

type RootStackParamList = {
  AccountDeletion: undefined
  Login: undefined
  CustomerOrders: undefined
  CustomerRideHistory: undefined
  AssetRental: undefined
}

type AccountDeletionNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AccountDeletion'>

export function AccountDeletion() {
  const navigation = useNavigation<AccountDeletionNavigationProp>()
  const { forceClearAuth } = useAuth()

  const [isAcknowledged, setIsAcknowledged] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [eligibility, setEligibility] = React.useState<{
    eligible: boolean
    blockers: { orders: number; rides: number; rentalsQuoted: number }
  } | null>(null)
  const [loadingEligibility, setLoadingEligibility] = React.useState(true)

  const loadEligibility = React.useCallback(async () => {
    try {
      setLoadingEligibility(true)
      const data = await userService.getDeletionEligibility()
      setEligibility(data)
    } catch (e) {
      setEligibility({ eligible: true, blockers: { orders: 0, rides: 0, rentalsQuoted: 0 } })
    } finally {
      setLoadingEligibility(false)
    }
  }, [])

  React.useEffect(() => {
    loadEligibility()
  }, [loadEligibility])

  const handleDeleteAccount = async () => {
    if (!isAcknowledged || confirmText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert(
        'Confirmation Required',
        'Please acknowledge the warning and type DELETE to proceed.'
      )
      return
    }
    // Re-validate eligibility just before deleting
    try {
      const latest = await userService.getDeletionEligibility()
      setEligibility(latest)
      if (!latest.eligible) {
        const parts: string[] = []
        if (latest.blockers.orders) parts.push(`${latest.blockers.orders} pending order(s)`)
        if (latest.blockers.rides) parts.push(`${latest.blockers.rides} active ride(s)`)
        if (latest.blockers.rentalsQuoted) parts.push(`${latest.blockers.rentalsQuoted} quoted rental(s)`)
        Alert.alert(
          'Resolve Pending Items',
          `Please resolve: ${parts.join(', ')} before deleting your account.`
        )
        return
      }
    } catch {
      // proceed and let server validate
    }
    try {
      setIsSubmitting(true)
      await userService.terminateAccount()
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted. You can create a new account if you return.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await forceClearAuth()
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as any }],
              })
            },
          },
        ],
        { cancelable: false }
      )
    } catch (error: any) {
      console.error('Error terminating account:', error)
      if (error?.response?.status === 409 && error?.response?.data?.blockers) {
        const b = error.response.data.blockers
        const parts: string[] = []
        if (b.orders) parts.push(`${b.orders} pending order(s)`)
        if (b.rides) parts.push(`${b.rides} active ride(s)`)
        if (b.rentalsQuoted) parts.push(`${b.rentalsQuoted} quoted rental(s)`)
        Alert.alert('Resolve Pending Items', `Please resolve: ${parts.join(', ')} before deleting your account.`)
      } else {
        Alert.alert(
          'Unable to Delete',
          error?.response?.data?.message ||
            'We could not delete your account at this time. Please try again.'
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Delete Account</Text>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
        >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Warning Card */}
          <View style={styles.card}>
            <View style={styles.warningHeader}>
              <View style={styles.warningIcon}>
                <AlertTriangle size={22} color="#DC2626" />
              </View>
              <Text style={styles.warningTitle}>This action is permanent</Text>
            </View>
            <Text style={styles.warningText}>
              Deleting your account is irreversible. We will permanently delete your account by deleting all your data. If you return in the future,
              a new account must be created. The user will be able register again with the same details as the previous account if you wish to do so.
            </Text>
            <View style={styles.bullets}>
              <View style={styles.bulletRow}>
                <XCircle size={16} color="#DC2626" />
                <Text style={styles.bulletText}>Access to your profile and history will be removed</Text>
              </View>
              <View style={styles.bulletRow}>
                <XCircle size={16} color="#DC2626" />
                <Text style={styles.bulletText}>You won’t receive notifications anymore</Text>
              </View>
              <View style={styles.bulletRow}>
                <Shield size={16} color="#6B7280" />
                <Text style={styles.bulletText}>
                  Your records will not be retained by Cloud Nexus.
                </Text>
              </View>
            </View>
          </View>

          {/* Blockers Section */}
          <View style={styles.card}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
              Resolve Pending Items
            </Text>
            {loadingEligibility ? (
              <View style={{ paddingVertical: 8 }}>
                <ActivityIndicator color="#2563EB" />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.blockerRow}
                  onPress={() => navigation.navigate('CustomerOrders' as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.blockerLeft}>
                    <Text style={styles.blockerTitle}>Pending Orders</Text>
                    <Text style={styles.blockerSubtitle}>Cancel or complete orders before deletion</Text>
                  </View>
                  <View style={styles.blockerRight}>
                    <View style={[styles.countBadge, (eligibility?.blockers.orders ?? 0) > 0 ? styles.countBadgeWarn : styles.countBadgeOk]}>
                      <Text style={styles.countText}>{eligibility?.blockers.orders ?? 0}</Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.blockerRow}
                  onPress={() => navigation.navigate('CustomerRideHistory' as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.blockerLeft}>
                    <Text style={styles.blockerTitle}>Active Rides</Text>
                    <Text style={styles.blockerSubtitle}>Cancel or finish active ride requests</Text>
                  </View>
                  <View style={styles.blockerRight}>
                    <View style={[styles.countBadge, (eligibility?.blockers.rides ?? 0) > 0 ? styles.countBadgeWarn : styles.countBadgeOk]}>
                      <Text style={styles.countText}>{eligibility?.blockers.rides ?? 0}</Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.blockerRow}
                  onPress={() => navigation.navigate('AssetRental' as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.blockerLeft}>
                    <Text style={styles.blockerTitle}>Quoted Rentals</Text>
                    <Text style={styles.blockerSubtitle}>Cancel any rental quotes</Text>
                  </View>
                  <View style={styles.blockerRight}>
                    <View style={[styles.countBadge, (eligibility?.blockers.rentalsQuoted ?? 0) > 0 ? styles.countBadgeWarn : styles.countBadgeOk]}>
                      <Text style={styles.countText}>{eligibility?.blockers.rentalsQuoted ?? 0}</Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              </>
            )}
            {!eligibility?.eligible && (
              <Text style={{ color: '#DC2626', marginTop: 8 }}>
                Please resolve the items above to enable account deletion.
              </Text>
            )}
          </View>

          {/* Acknowledgement */}
          <View style={styles.card}>
            <View style={styles.ackRow}>
              <Switch
                value={isAcknowledged}
                onValueChange={setIsAcknowledged}
                trackColor={{ false: '#D1D5DB', true: '#FCA5A5' }}
                thumbColor={isAcknowledged ? '#DC2626' : '#F3F4F6'}
              />
              <Text style={styles.ackText}>
                I understand this is permanent and cannot be undone
              </Text>
            </View>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmLabel}>Type DELETE to confirm</Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="DELETE"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                style={styles.input}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteButton, (!isAcknowledged || confirmText.trim().toUpperCase() !== 'DELETE' || isSubmitting || eligibility?.eligible === false) && styles.deleteButtonDisabled]}
            onPress={handleDeleteAccount}
            disabled={!isAcknowledged || confirmText.trim().toUpperCase() !== 'DELETE' || isSubmitting || eligibility?.eligible === false}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Trash2 size={18} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  warningText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  bullets: {
    marginTop: 12,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletText: {
    color: '#4B5563',
    fontSize: 13,
    flex: 1,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ackText: {
    color: '#111827',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  confirmBox: {
    marginTop: 12,
  },
  confirmLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    fontSize: 16,
  },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  blockerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  blockerLeft: {
    flex: 1,
    marginRight: 8,
  },
  blockerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  blockerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  blockerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  countBadgeOk: {
    backgroundColor: '#E5E7EB',
  },
  countBadgeWarn: {
    backgroundColor: '#FEE2E2',
  },
  countText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
})

export default AccountDeletion


