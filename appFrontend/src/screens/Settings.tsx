import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

type RootStackParamList = {
  Home: undefined
  Settings: undefined
}

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>

interface SettingItem {
  id: string
  label: string
  description: string
  type: 'toggle' | 'select' | 'button'
  value?: boolean | string
  onChange?: (value?: any) => void
  options?: { value: string; label: string }[]
  onClick?: () => void
}

interface SettingsSection {
  id: string
  title: string
  icon: string
  items: SettingItem[]
}

export function Settings() {
  const navigation = useNavigation<SettingsScreenNavigationProp>()
  const [notifications, setNotifications] = useState({
    newMessages: true,
    orderUpdates: true,
    promotions: false,
  })

  const [theme, setTheme] = useState('light')

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const settingsSections: SettingsSection[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications',
      items: [
        {
          id: 'newMessages',
          label: 'New Messages',
          description: 'Get notified when you receive new messages',
          type: 'toggle',
          value: notifications.newMessages,
          onChange: () => toggleNotification('newMessages'),
        },
        {
          id: 'orderUpdates',
          label: 'Order Updates',
          description: 'Receive updates about your orders',
          type: 'toggle',
          value: notifications.orderUpdates,
          onChange: () => toggleNotification('orderUpdates'),
        },
        {
          id: 'promotions',
          label: 'Promotions',
          description: 'Get notified about special offers and promotions',
          type: 'toggle',
          value: notifications.promotions,
          onChange: () => toggleNotification('promotions'),
        },
      ],
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: theme === 'light' ? 'sunny' : 'moon',
      items: [
        {
          id: 'theme',
          label: 'Theme',
          description: 'Choose between light and dark mode',
          type: 'select',
          value: theme,
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ],
          onChange: (value: string) => setTheme(value),
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: 'shield-checkmark',
      items: [
        {
          id: 'password',
          label: 'Change Password',
          description: 'Update your account password',
          type: 'button',
          onClick: () => console.log('Change password'),
        },
        {
          id: 'twoFactor',
          label: 'Two-Factor Authentication',
          description: 'Add an extra layer of security to your account',
          type: 'button',
          onClick: () => console.log('Two-factor auth'),
        },
      ],
    },
    {
      id: 'language',
      title: 'Language & Region',
      icon: 'globe',
      items: [
        {
          id: 'language',
          label: 'Language',
          description: 'Choose your preferred language',
          type: 'select',
          value: 'en',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
          ],
          onChange: (value: string) => console.log('Language changed:', value),
        },
      ],
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {settingsSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={20} color="#111827" />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionContent}>
              {section.items.map((item) => (
                <View key={item.id} style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    <Text style={styles.settingDescription}>
                      {item.description}
                    </Text>
                  </View>
                  {item.type === 'toggle' && (
                    <Switch
                      value={item.value as boolean}
                      onValueChange={() => (item.onChange as () => void)?.()}
                      trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                      thumbColor="#FFFFFF"
                    />
                  )}
                  {item.type === 'select' && (
                    <View style={styles.selectContainer}>
                      <Text style={styles.selectValue}>
                        {(item.options?.find((opt) => opt.value === item.value)?.label) || item.value}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </View>
                  )}
                  {item.type === 'button' && (
                    <TouchableOpacity
                      onPress={item.onClick}
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>Change</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  sectionContent: {
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectValue: {
    fontSize: 14,
    color: '#111827',
    marginRight: 8,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
}) 