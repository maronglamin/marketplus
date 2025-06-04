import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  onBack?: () => void;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
}

export function Header({
  title,
  showBack,
  showMenu,
  showNotifications,
  onBack,
  onMenuPress,
  onNotificationPress,
}: HeaderProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent
      />
      <View style={styles.container}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity onPress={onBack} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          )}
          {showMenu && (
            <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
              <Ionicons name="menu" size={24} color="#111827" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>{title}</Text>

        <View style={styles.right}>
          {showNotifications && (
            <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
              <Ionicons name="notifications" size={24} color="#111827" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  iconButton: {
    padding: 8,
    marginHorizontal: 4,
  },
}); 