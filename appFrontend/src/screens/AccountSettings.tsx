import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Linking,
  Switch,
  Alert,
} from 'react-native'
import { ArrowLeft, User, Share2, Lock, Shield, Phone, Store, LogOut } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

type MenuItem = {
  title: string
  icon: React.ReactNode
  onPress: () => void
  subtitle?: string
  isDestructive?: boolean
}

type Category = {
  title: string
  items: MenuItem[]
}

type RootStackParamList = {
  Home: undefined
  AccountSettings: undefined
  ChangePin: undefined
  ManagePermissions: undefined
  FindSellers: undefined
  Login: undefined
}

type AccountSettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AccountSettings'>

export function AccountSettings() {
  const navigation = useNavigation<AccountSettingsNavigationProp>()
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true)
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false)

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.clear()
              // Navigate to login page
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            } catch (error) {
              console.error('Error during logout:', error)
              Alert.alert('Error', 'Failed to logout. Please try again.')
            }
          },
        },
      ],
      { cancelable: true }
    )
  }

  const handleCallSupport = () => {
    Linking.openURL('tel:+2207690103').catch(err => {
      console.error('Error opening phone app:', err)
    })
  }

  const categories: Category[] = [
    {
      title: 'Account',
      items: [
        {
          title: 'Account Info',
          icon: <User size={24} color="#2563EB" />,
          onPress: () => {},
          subtitle: 'Modou Lamin Marong\n+220 769 01 03',
        },
        {
          title: 'Invite a Friend',
          icon: <Share2 size={24} color="#2563EB" />,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'Change PIN',
          icon: <Lock size={24} color="#2563EB" />,
          onPress: () => navigation.navigate('ChangePin'),
        },
        {
          title: 'Manage Permissions',
          icon: <Shield size={24} color="#2563EB" />,
          onPress: () => navigation.navigate('ManagePermissions'),
        },
      ],
    },
    {
      title: 'Help & Support',
      items: [
        {
          title: 'Contact Support',
          icon: <Phone size={24} color="#2563EB" />,
          onPress: handleCallSupport,
        },
        {
          title: 'Find Sellers',
          icon: <Store size={24} color="#2563EB" />,
          onPress: () => navigation.navigate('FindSellers'),
        },
      ],
    },
    {
      title: '',
      items: [
        {
          title: 'Logout',
          icon: <LogOut size={24} color="#EF4444" />,
          onPress: handleLogout,
          isDestructive: true,
        },
      ],
    },
  ]

  const settings = [
    {
      id: '1',
      title: 'Profile',
      icon: 'person',
      action: () => console.log('Navigate to Profile'),
    },
    {
      id: '2',
      title: 'Security',
      icon: 'shield-checkmark',
      action: () => console.log('Navigate to Security'),
    },
    {
      id: '3',
      title: 'Payment Methods',
      icon: 'card',
      action: () => console.log('Navigate to Payment Methods'),
    },
    {
      id: '4',
      title: 'Addresses',
      icon: 'location',
      action: () => console.log('Navigate to Addresses'),
    },
    {
      id: '5',
      title: 'Language',
      icon: 'language',
      action: () => console.log('Navigate to Language'),
    },
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Account Settings</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            {settings.map((setting) => (
              <TouchableOpacity
                key={setting.id}
                style={styles.settingItem}
                onPress={setting.action}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name={setting.icon} size={24} color="#6B7280" />
                  <Text style={styles.settingTitle}>{setting.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={24} color="#6B7280" />
                <Text style={styles.settingTitle}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={notificationsEnabled ? '#2563EB' : '#F3F4F6'}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon" size={24} color="#6B7280" />
                <Text style={styles.settingTitle}>Dark Mode</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={darkModeEnabled ? '#2563EB' : '#F3F4F6'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle" size={24} color="#6B7280" />
                <Text style={styles.settingTitle}>Help Center</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="document-text" size={24} color="#6B7280" />
                <Text style={styles.settingTitle}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="shield" size={24} color="#6B7280" />
                <Text style={styles.settingTitle}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
}) 