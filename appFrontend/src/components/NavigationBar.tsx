import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'home' | 'orders' | 'interests' | 'account';

interface NavigationBarProps {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
}

export function NavigationBar({ activeTab, onTabPress }: NavigationBarProps) {
  const tabs = [
    {
      id: 'home' as Tab,
      label: 'Home',
      icon: 'home',
    },
    {
      id: 'orders' as Tab,
      label: 'Orders',
      icon: 'cart',
    },
    {
      id: 'interests' as Tab,
      label: 'Interests',
      icon: 'heart',
    },
    {
      id: 'account' as Tab,
      label: 'Account',
      icon: 'person',
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabPress(tab.id)}
        >
          <Ionicons
            name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`}
            size={24}
            color={activeTab === tab.id ? '#2563EB' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === tab.id && styles.activeTabLabel,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#2563EB',
  },
}); 