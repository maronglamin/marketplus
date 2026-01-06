import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { 
  Target,
  ArrowLeft,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

type PermissionsNavigationProp = NativeStackNavigationProp<any, 'Permissions'>;

const Permissions = () => {
  const navigation = useNavigation<PermissionsNavigationProp>();
  
  // State for toggle switches
  // const [twoFactorEnabled, setTwoFactorEnabled] = useState(false); // commented: not implemented yet
  // const [biometricEnabled, setBiometricEnabled] = useState(false); // commented: not implemented yet
  const [locationSharing, setLocationSharing] = useState(false);

  // Keys for AsyncStorage
  const LOCATION_PREF_KEY = 'locationSharingEnabled';

  // Load persisted toggles (only location for now)
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCATION_PREF_KEY);
        if (stored !== null) {
          setLocationSharing(stored === 'true');
        } else {
          // Also sync with current OS permission to present a sensible default
          const perm = await Location.getForegroundPermissionsAsync();
          setLocationSharing(perm.status === 'granted');
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const persistLocationPref = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(LOCATION_PREF_KEY, value ? 'true' : 'false');
    } catch {
      // ignore persistence errors
    }
  };

  // const handleTwoFactorToggle = (value: boolean) => {
  //   setTwoFactorEnabled(value);
  //   if (value) {
  //     Alert.alert(
  //       'Two-Factor Authentication',
  //       'Two-factor authentication has been enabled. You will receive a verification code via SMS for additional security.',
  //       [{ text: 'OK' }]
  //     );
  //   } else {
  //     Alert.alert(
  //       'Two-Factor Authentication',
  //       'Two-factor authentication has been disabled. Your account is now less secure.',
  //       [{ text: 'OK' }]
  //     );
  //   }
  // };

  // const handleBiometricToggle = (value: boolean) => {
  //   setBiometricEnabled(value);
  //   if (value) {
  //     Alert.alert(
  //       'Biometric Login',
  //       'Biometric login has been enabled. You can now use fingerprint or face ID to log in.',
  //       [{ text: 'OK' }]
  //     );
  //   } else {
  //     Alert.alert(
  //       'Biometric Login',
  //       'Biometric login has been disabled. You will need to use your PIN to log in.',
  //       [{ text: 'OK' }]
  //     );
  //   }
  // };

  // Removed direct system settings redirection to comply with App Review guidance

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      // Enabling: show rationale before requesting OS permission
      Alert.alert(
        'Why we need your location',
        'Your location is used to find nearby drivers and rental services, calculate trip distances and fares, provide accurate pickup and drop‑off points, and enable real‑time ride tracking during an active trip. Location data is only accessed while you are using the app.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Continue', onPress: async () => {
            try {
              const current = await Location.getForegroundPermissionsAsync();
              if (current.status === 'granted') {
                setLocationSharing(true);
                await persistLocationPref(true);
                Alert.alert(
                  'Location Sharing',
                  'Location sharing is enabled.'
                );
                return;
              }

              const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                setLocationSharing(true);
                await persistLocationPref(true);
                Alert.alert(
                  'Location Sharing',
                  'Location sharing is enabled.'
                );
              } else {
                setLocationSharing(false);
                await persistLocationPref(false);
                Alert.alert(
                  'Location Permission Needed',
                  'Location is required for ride and rental features. You can manage this later in your device settings.'
                );
              }
            } catch (e) {
              setLocationSharing(false);
              await persistLocationPref(false);
              Alert.alert(
                'Location Error',
                'Unable to change location permission right now.'
              );
            }
          }},
        ]
      );
      return;
    } else {
      // Disabling: cannot revoke OS permission programmatically, persist preference and inform user
      setLocationSharing(false);
      await persistLocationPref(false);
      Alert.alert(
        'Location Sharing',
        Platform.select({
          ios: 'Location sharing is disabled in the app. To fully revoke OS permission, use iOS Settings later if you choose.',
          android: 'Location sharing is disabled in the app. To fully revoke OS permission, use Android Settings later if you choose.',
          default: 'Location sharing is disabled.',
        }),
        [{ text: 'OK' }]
      );
    }
  };

  // const handlePrivacySettings = () => {
  //   navigation.navigate('PrivacySettings');
  // };

  const renderMenuItem = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>
          {item.icon}
        </View>
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      
      {item.isToggle ? (
        <Switch
          value={item.toggleValue}
          onValueChange={item.onToggleChange}
          trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
          thumbColor={item.toggleValue ? '#FFFFFF' : '#FFFFFF'}
          ios_backgroundColor="#E5E7EB"
        />
      ) : (
        item.showChevron && (
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        )
      )}
    </TouchableOpacity>
  );

  const categories = [
    // {
    //   id: 'security',
    //   title: 'Security & Authentication',
    //   items: [
    //     {
    //       id: 'two-factor',
    //       title: 'Two-Factor Authentication',
    //       icon: <ShieldCheck size={20} color="#059669" />,
    //       onPress: () => {},
    //       isToggle: true,
    //       toggleValue: twoFactorEnabled,
    //       onToggleChange: handleTwoFactorToggle,
    //       subtitle: 'Add an extra layer of security',
    //     },
    //     {
    //       id: 'biometric',
    //       title: 'Biometric Login',
    //       icon: <Key size={20} color="#7C3AED" />,
    //       onPress: () => {},
    //       isToggle: true,
    //       toggleValue: biometricEnabled,
    //       onToggleChange: handleBiometricToggle,
    //       subtitle: 'Use fingerprint or face ID',
    //     },
    //   ],
    // },
    {
      id: 'privacy',
      title: 'Location',
      items: [
        // {
        //   id: 'privacy-settings',
        //   title: 'Privacy Settings',
        //   icon: <Eye size={20} color="#6B7280" />,
        //   onPress: handlePrivacySettings,
        //   showChevron: true,
        //   subtitle: 'Manage your privacy preferences',
        // },
        {
          id: 'location-sharing',
          title: 'Location Sharing',
          icon: <Target size={20} color="#F59E0B" />,
          onPress: () => {},
          isToggle: true,
          toggleValue: locationSharing,
          onToggleChange: handleLocationToggle,
          subtitle: 'Share location for accurate ride service',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Permissions</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {categories.map((category, index) => (
          <View key={category.id}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={styles.categoryContainer}>
              {category.items.map(renderMenuItem)}
            </View>
            {index < categories.length - 1 && (
              <View style={styles.divider} />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 24,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
});

export default Permissions;
